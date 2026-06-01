import { type NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import bcrypt from "bcryptjs"

// In-memory rate limiter (resets on server restart; sufficient for WAMP single-instance)
// Structure: { ip_or_username: { count, lockedUntil } }
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000   // 15 minutes
const WINDOW_MS  = 5  * 60 * 1000   // 5-minute rolling window

function getRateLimitKey(request: NextRequest, username: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
  return `${ip}:${username.toLowerCase()}`
}

function checkRateLimit(key: string): { blocked: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)

  if (record) {
    // Check if currently locked out
    if (record.lockedUntil > now) {
      return { blocked: true, remaining: 0, retryAfterMs: record.lockedUntil - now }
    }
    // Reset if outside the window (but not locked)
    if (now - (record.lockedUntil - LOCKOUT_MS) > WINDOW_MS && record.lockedUntil === 0) {
      loginAttempts.delete(key)
    }
  }

  return { blocked: false, remaining: MAX_ATTEMPTS - (record?.count ?? 0), retryAfterMs: 0 }
}

function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const record = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 }

  record.count += 1
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS
  }
  loginAttempts.set(key, record)
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const key = getRateLimitKey(request, username)
    const rateLimitCheck = checkRateLimit(key)

    if (rateLimitCheck.blocked) {
      const minutesLeft = Math.ceil(rateLimitCheck.retryAfterMs / 60000)
      return NextResponse.json(
        {
          error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`,
          locked: true,
          retryAfterMs: rateLimitCheck.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitCheck.retryAfterMs / 1000)),
            "X-RateLimit-Limit": String(MAX_ATTEMPTS),
            "X-RateLimit-Remaining": "0",
          }
        }
      )
    }

    let user: {
      id: number; username: string; email: string; password_hash: string
      role: string; first_name: string; last_name: string; is_active: boolean
    } | null = null

    try {
      user = await queryOne(
        "SELECT id, username, email, password_hash, role, first_name, last_name, is_active FROM users WHERE (username = ? OR email = ?) LIMIT 1",
        [username, username]
      )
    } catch (dbError: any) {
      console.error("Database connection error:", dbError.message)
      return NextResponse.json(
        { error: "Database not connected. Please ensure MySQL is running and the database is set up. Run database/schema.sql then database/seed.sql in phpMyAdmin." },
        { status: 503 }
      )
    }

    if (!user || !user.is_active) {
      recordFailedAttempt(key)
      const remaining = MAX_ATTEMPTS - (loginAttempts.get(key)?.count ?? 0)
      return NextResponse.json(
        { error: "Invalid credentials", attemptsRemaining: Math.max(0, remaining) },
        { status: 401 }
      )
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash)
    if (!passwordValid) {
      recordFailedAttempt(key)
      const remaining = MAX_ATTEMPTS - (loginAttempts.get(key)?.count ?? 0)
      const isNowLocked = loginAttempts.get(key)?.lockedUntil ?? 0 > Date.now()
      return NextResponse.json(
        {
          error: isNowLocked
            ? `Too many failed attempts. Account locked for ${LOCKOUT_MS / 60000} minutes.`
            : `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
          attemptsRemaining: Math.max(0, remaining),
          locked: isNowLocked,
        },
        { status: 401 }
      )
    }

    // ✅ Successful login — clear rate limit
    clearAttempts(key)

    const fullName = `${user.first_name} ${user.last_name}`
    const sessionData = {
      userId: user.id, username: user.username, email: user.email,
      role: user.role, name: fullName, timestamp: Date.now(),
    }

    // Log audit — don't fail login if this fails
    try {
      await execute(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'LOGIN', 'users', ?, ?)",
        [user.id, user.id, request.headers.get("x-forwarded-for") || "127.0.0.1"]
      )
    } catch (auditError) {
      console.warn("Audit log failed (non-fatal):", auditError)
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, name: fullName },
    })

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64")
    response.cookies.set("auth-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour — matches middleware session timeout
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
