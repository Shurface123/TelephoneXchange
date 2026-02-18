import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const faults = await query(
    `SELECT fr.*, d.department_name, s.station_name, s.station_code,
      CONCAT(ru.first_name, ' ', ru.last_name) as reported_by_name,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
     FROM fault_reports fr
     LEFT JOIN departments d ON fr.department_id = d.id
     LEFT JOIN stations s ON fr.station_id = s.id
     LEFT JOIN users ru ON fr.reported_by = ru.id
     LEFT JOIN users au ON fr.assigned_to = au.id
     WHERE fr.id = ?`,
    [params.id]
  )
  if (!faults.length) return NextResponse.json({ error: "Fault not found" }, { status: 404 })
  return NextResponse.json(faults[0])
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { faultStatus, assignedTo, resolutionNotes, actualCost } = body

  const updates: string[] = []
  const values: any[] = []

  if (faultStatus) {
    updates.push("fault_status = ?"); values.push(faultStatus)
    if (faultStatus === "assigned") { updates.push("assigned_at = NOW()") }
    if (faultStatus === "resolved") { updates.push("resolved_at = NOW()") }
    if (faultStatus === "closed") { updates.push("closed_at = NOW()") }
  }
  if (assignedTo !== undefined) { updates.push("assigned_to = ?"); values.push(assignedTo) }
  if (resolutionNotes !== undefined) { updates.push("resolution_notes = ?"); values.push(resolutionNotes) }
  if (actualCost !== undefined) { updates.push("actual_cost = ?"); values.push(actualCost) }

  if (!updates.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

  values.push(params.id)
  await execute(`UPDATE fault_reports SET ${updates.join(", ")} WHERE id = ?`, values)

  await execute(
    "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'UPDATE_FAULT', 'fault_reports', ?, ?)",
    [session.userId, params.id, "127.0.0.1"]
  )

  const updated = await query(
    `SELECT fr.*, CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
     FROM fault_reports fr LEFT JOIN users au ON fr.assigned_to = au.id WHERE fr.id = ?`,
    [params.id]
  )
  return NextResponse.json(updated[0])
}
