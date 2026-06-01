import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await query("SELECT * FROM system_settings ORDER BY setting_key ASC")
  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { key, value } = body

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 })

  await execute(
    "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
    [value, session.userId, key]
  )

  await execute(
    "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'UPDATE_SETTING', 'system_settings', NULL, ?)",
    [session.userId, "127.0.0.1"]
  )

  return NextResponse.json({ success: true })
}
