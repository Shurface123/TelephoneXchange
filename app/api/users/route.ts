import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import bcrypt from "bcryptjs"

function getSession(request: NextRequest) {
    const cookie = request.cookies.get("auth-session")
    if (!cookie) return null
    try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest) {
    const session = getSession(request)
    if (!session || !["admin", "receptionist", "manager", "technician"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const users = await query(
        `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
      e.employee_id, e.position, d.department_name
     FROM users u
     LEFT JOIN employees e ON u.id = e.user_id
     LEFT JOIN departments d ON e.department_id = d.id
     ORDER BY u.created_at DESC`
    )

    return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
    const session = getSession(request)
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    try {
        const body = await request.json()
        const { username, email, password, role, firstName, lastName, phone } = body

        if (!username || !email || !password || !role || !firstName || !lastName) {
            return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 })
        }

        const existing = await query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email])
        if (existing.length > 0) {
            return NextResponse.json({ error: "Username or email already exists" }, { status: 409 })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const { insertId } = await execute(
            "INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)",
            [username, email, passwordHash, role, firstName, lastName, phone || null]
        )

        await execute(
            "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'CREATE_USER', 'users', ?, ?)",
            [session.userId, insertId, "127.0.0.1"]
        )

        const user = await query("SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at FROM users WHERE id = ?", [insertId])
        return NextResponse.json(user[0], { status: 201 })
    } catch (error) {
        console.error("Create user error:", error)
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }
}
