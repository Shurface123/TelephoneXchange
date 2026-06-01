import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get("status")
  const dept     = searchParams.get("department")
  const dateFrom = searchParams.get("date_from")
  const dateTo   = searchParams.get("date_to")
  const search   = searchParams.get("search")
  const format   = searchParams.get("format") || "csv"  // csv | json

  let sql = `
    SELECT c.call_reference, c.caller_name, c.caller_phone, c.call_reason, c.call_notes,
           c.call_status, c.priority, c.duration_seconds, c.created_at, c.start_time, c.end_time,
           c.follow_up_required, c.follow_up_date,
           d.department_name, ct.type_name as call_type,
           CONCAT(e.first_name, ' ', e.last_name) as assigned_employee,
           CONCAT(u.first_name, ' ', u.last_name) as recorded_by
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN call_types ct ON c.call_type_id = ct.id
    LEFT JOIN employees e ON c.employee_id = e.id
    LEFT JOIN users u ON c.recorded_by = u.id
    WHERE 1=1`
  const params: any[] = []

  if (status)   { sql += " AND c.call_status = ?"; params.push(status) }
  if (dept)     { sql += " AND c.department_id = ?"; params.push(dept) }
  if (dateFrom) { sql += " AND DATE(c.created_at) >= ?"; params.push(dateFrom) }
  if (dateTo)   { sql += " AND DATE(c.created_at) <= ?"; params.push(dateTo) }
  if (search) {
    sql += " AND (c.caller_name LIKE ? OR c.caller_phone LIKE ? OR c.call_reason LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  sql += " ORDER BY c.created_at DESC LIMIT 5000"

  const calls = await query(sql, params)

  if (format === "json") {
    return NextResponse.json({ calls, total: calls.length, exportedAt: new Date().toISOString() })
  }

  // Build CSV
  const headers = [
    "Reference", "Caller Name", "Phone", "Department", "Call Type",
    "Assigned Employee", "Status", "Priority", "Duration (H:M:S)",
    "Created Date", "Start Time", "End Time",
    "Reason", "Notes", "Follow-up Required", "Follow-up Date", "Recorded By"
  ]

  const rows = calls.map((c: any) => [
    c.call_reference,
    c.caller_name,
    c.caller_phone,
    c.department_name || "Unassigned",
    c.call_type || "N/A",
    c.assigned_employee?.trim() === " " ? "Unassigned" : c.assigned_employee || "Unassigned",
    c.call_status ? c.call_status.charAt(0).toUpperCase() + c.call_status.slice(1) : "",
    c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : "",
    c.duration_seconds > 0 ? formatDuration(c.duration_seconds) : "0:00:00",
    c.created_at ? new Date(c.created_at).toLocaleString("en-GH") : "",
    c.start_time ? new Date(c.start_time).toLocaleString("en-GH") : "",
    c.end_time ? new Date(c.end_time).toLocaleString("en-GH") : "",
    c.call_reason || "",
    c.call_notes || "",
    c.follow_up_required ? "Yes" : "No",
    c.follow_up_date || "",
    c.recorded_by?.trim() === " " ? "" : c.recorded_by || ""
  ])

  const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`
  const csvLines = [
    headers.map(escape).join(","),
    ...rows.map(row => row.map(escape).join(","))
  ]
  const csv = csvLines.join("\r\n")

  const filename = `CHED_Exchange_Calls_${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, must-revalidate",
    },
  })
}
