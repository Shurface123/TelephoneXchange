import { type NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("auth-session")
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString())

    const user = await queryOne<{
      id: number; username: string; email: string; role: string
      first_name: string; last_name: string; phone: string; is_active: boolean
    }>(
      "SELECT id, username, email, role, first_name, last_name, phone, is_active FROM users WHERE id = ? AND is_active = TRUE",
      [sessionData.userId]
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id, username: user.username, email: user.email, role: user.role,
      name: `${user.first_name} ${user.last_name}`, phone: user.phone,
    })
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
}
