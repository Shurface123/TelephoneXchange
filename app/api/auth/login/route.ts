import { type NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const user = await queryOne<{
      id: number; username: string; email: string; password_hash: string
      role: string; first_name: string; last_name: string; is_active: boolean
    }>(
      "SELECT id, username, email, password_hash, role, first_name, last_name, is_active FROM users WHERE (username = ? OR email = ?) LIMIT 1",
      [username, username]
    )

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash)
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const fullName = `${user.first_name} ${user.last_name}`
    const sessionData = {
      userId: user.id, username: user.username, email: user.email,
      role: user.role, name: fullName, timestamp: Date.now(),
    }

    // Log audit
    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'LOGIN', 'users', ?, ?)",
      [user.id, user.id, request.headers.get("x-forwarded-for") || "127.0.0.1"]
    )

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, name: fullName },
    })

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64")
    response.cookies.set("auth-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
