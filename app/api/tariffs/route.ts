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

  // Try telecel_tariffs first, fallback to call_types rates
  try {
    const tariffs = await query("SELECT * FROM telecel_tariffs ORDER BY id ASC")
    return NextResponse.json({ tariffs })
  } catch {
    // Table may not exist — return call_types rates instead
    const callTypes = await query("SELECT * FROM call_types ORDER BY id ASC")
    return NextResponse.json({ tariffs: callTypes, source: "call_types" })
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { id, ratePerMinute, typeName } = body

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  // Try telecel_tariffs, fallback to call_types
  try {
    await execute("UPDATE telecel_tariffs SET rate_per_minute = ? WHERE id = ?", [ratePerMinute, id])
  } catch {
    await execute("UPDATE call_types SET rate_per_minute = ? WHERE id = ?", [ratePerMinute, id])
  }

  await execute(
    "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'UPDATE_TARIFF', 'call_types', ?, ?)",
    [session.userId, id, "127.0.0.1"]
  )

  return NextResponse.json({ success: true })
}
