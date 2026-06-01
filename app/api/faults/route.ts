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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const severity = searchParams.get("severity")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  let sql = `
    SELECT fr.*, d.department_name, s.station_name, s.station_code,
      CONCAT(ru.first_name, ' ', ru.last_name) as reported_by_name,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
    FROM fault_reports fr
    LEFT JOIN departments d ON fr.department_id = d.id
    LEFT JOIN stations s ON fr.station_id = s.id
    LEFT JOIN users ru ON fr.reported_by = ru.id
    LEFT JOIN users au ON fr.assigned_to = au.id
    WHERE 1=1`
  const params: any[] = []

  if (status) { sql += " AND fr.fault_status = ?"; params.push(status) }
  if (severity) { sql += " AND fr.fault_severity = ?"; params.push(severity) }

  // Technicians only see their assigned faults
  if (session.role === "technician") {
    sql += " AND (fr.assigned_to = ? OR fr.assigned_to IS NULL)"
    params.push(session.userId)
  }

  sql += " ORDER BY FIELD(fr.fault_severity,'critical','high','medium','low'), fr.reported_at DESC LIMIT ? OFFSET ?"
  params.push(limit, offset)

  const faults = await query(sql, params)
  const [{ total }] = await query<{ total: number }>("SELECT COUNT(*) as total FROM fault_reports")

  return NextResponse.json({ faults, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { stationId, departmentId, faultType, faultCategory, faultDescription, faultSeverity } = body

    const ref = `FLT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const { insertId } = await execute(
      `INSERT INTO fault_reports (fault_reference, station_id, department_id, fault_type, fault_category, fault_description, fault_severity, fault_status, reported_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [ref, stationId || null, departmentId || null, faultType, faultCategory, faultDescription, faultSeverity || "medium", session.userId]
    )

    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'CREATE_FAULT', 'fault_reports', ?, ?)",
      [session.userId, insertId, "127.0.0.1"]
    )

    const fault = await query("SELECT * FROM fault_reports WHERE id = ?", [insertId])

    // Notify all technicians and admins about the new fault
    const techUsers = await query<{ id: number }>(
      "SELECT id FROM users WHERE role IN ('technician', 'admin') AND is_active = TRUE"
    )
    for (const tech of techUsers) {
      await execute(
        `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
         VALUES (?, ?, ?, 'fault', 'fault_reports', ?)`,
        [
          tech.id,
          `New Fault Report: ${ref}`,
          `${faultSeverity?.toUpperCase() || "MEDIUM"} severity — ${faultDescription?.substring(0, 100)}`,
          insertId
        ]
      )
    }

    return NextResponse.json(fault[0], { status: 201 })
  } catch (error) {
    console.error("Create fault error:", error)
    return NextResponse.json({ error: "Failed to create fault report" }, { status: 500 })
  }
}
