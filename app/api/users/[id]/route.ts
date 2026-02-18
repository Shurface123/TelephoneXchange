import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import bcrypt from "bcryptjs"

function getSession(request: NextRequest) {
    const cookie = request.cookies.get("auth-session")
    if (!cookie) return null
    try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const session = getSession(request)
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const users = await query(
        "SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at FROM users WHERE id = ?",
        [params.id]
    )
    if (!users.length) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json(users[0])
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const session = getSession(request)
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { role, isActive, firstName, lastName, phone, password } = body

    const updates: string[] = []
    const values: any[] = []

    if (role) { updates.push("role = ?"); values.push(role) }
    if (isActive !== undefined) { updates.push("is_active = ?"); values.push(isActive) }
    if (firstName) { updates.push("first_name = ?"); values.push(firstName) }
    if (lastName) { updates.push("last_name = ?"); values.push(lastName) }
    if (phone !== undefined) { updates.push("phone = ?"); values.push(phone) }
    if (password) {
        const hash = await bcrypt.hash(password, 10)
        updates.push("password_hash = ?"); values.push(hash)
    }

    if (!updates.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    values.push(params.id)
    await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values)

    await execute(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'UPDATE_USER', 'users', ?, ?)",
        [session.userId, params.id, "127.0.0.1"]
    )

    const updated = await query(
        "SELECT id, username, email, role, first_name, last_name, phone, is_active FROM users WHERE id = ?",
        [params.id]
    )
    return NextResponse.json(updated[0])
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const session = getSession(request)
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (parseInt(params.id) === session.userId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })

    // Soft delete — deactivate instead of hard delete
    await execute("UPDATE users SET is_active = FALSE WHERE id = ?", [params.id])
    await execute(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'DEACTIVATE_USER', 'users', ?, ?)",
        [session.userId, params.id, "127.0.0.1"]
    )

    return NextResponse.json({ success: true })
}
