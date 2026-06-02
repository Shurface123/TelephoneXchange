import { type NextRequest, NextResponse } from "next/server"
import { query, queryRaw, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const department = searchParams.get("department")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  let sql = `
    SELECT c.*, 
      d.department_name, d.department_code,
      ct.type_name as call_type_name,
      u.first_name as recorded_by_first, u.last_name as recorded_by_last
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN call_types ct ON c.call_type_id = ct.id
    LEFT JOIN users u ON c.recorded_by = u.id
    WHERE 1=1`
  const params: any[] = []

  if (status) { sql += " AND c.call_status = ?"; params.push(status) }
  if (department) { sql += " AND c.department_id = ?"; params.push(department) }

  sql += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?"
  params.push(limit, offset)

  const calls = await queryRaw(sql, params)
  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM calls c WHERE 1=1${status ? " AND c.call_status = ?" : ""}${department ? " AND c.department_id = ?" : ""}`,
    [...(status ? [status] : []), ...(department ? [department] : [])]
  )

  return NextResponse.json({ calls, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { callerName, callerPhone, callTypeId, departmentId, callReason, priority, contactId } = body

    const ref = `CHED-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const { insertId } = await execute(
      `INSERT INTO calls (call_reference, contact_id, caller_name, caller_phone, call_type_id, department_id, call_reason, call_status, priority, start_time, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), ?)`,
      [ref, contactId || null, callerName, callerPhone, callTypeId || 2, departmentId || null, callReason || null, priority || "medium", session.userId]
    )

    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'CREATE_CALL', 'calls', ?, ?)",
      [session.userId, insertId, request.headers.get("x-forwarded-for") || "127.0.0.1"]
    )

    const call = await query("SELECT * FROM calls WHERE id = ?", [insertId])
    return NextResponse.json(call[0], { status: 201 })
  } catch (error) {
    console.error("Create call error:", error)
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 })
  }
}
