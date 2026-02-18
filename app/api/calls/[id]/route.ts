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

  const calls = await query(
    `SELECT c.*, d.department_name, ct.type_name as call_type_name,
      u.first_name as recorded_by_first, u.last_name as recorded_by_last
     FROM calls c
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN call_types ct ON c.call_type_id = ct.id
     LEFT JOIN users u ON c.recorded_by = u.id
     WHERE c.id = ?`,
    [params.id]
  )
  if (!calls.length) return NextResponse.json({ error: "Call not found" }, { status: 404 })

  const transfers = await query(
    `SELECT ct.*, 
      fd.department_name as from_dept, td.department_name as to_dept,
      u.first_name, u.last_name
     FROM call_transfers ct
     LEFT JOIN departments fd ON ct.from_department_id = fd.id
     LEFT JOIN departments td ON ct.to_department_id = td.id
     LEFT JOIN users u ON ct.transferred_by = u.id
     WHERE ct.call_id = ? ORDER BY ct.transfer_time ASC`,
    [params.id]
  )

  return NextResponse.json({ ...calls[0], transfers })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { callStatus, callNotes, endTime, durationSeconds, followUpRequired, followUpDate, followUpNotes } = body

  const updates: string[] = []
  const values: any[] = []

  if (callStatus) { updates.push("call_status = ?"); values.push(callStatus) }
  if (callNotes !== undefined) { updates.push("call_notes = ?"); values.push(callNotes) }
  if (endTime) { updates.push("end_time = ?"); values.push(endTime) }
  if (durationSeconds !== undefined) { updates.push("duration_seconds = ?"); values.push(durationSeconds) }
  if (followUpRequired !== undefined) { updates.push("follow_up_required = ?"); values.push(followUpRequired) }
  if (followUpDate !== undefined) { updates.push("follow_up_date = ?"); values.push(followUpDate) }
  if (followUpNotes !== undefined) { updates.push("follow_up_notes = ?"); values.push(followUpNotes) }

  if (!updates.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

  values.push(params.id)
  await execute(`UPDATE calls SET ${updates.join(", ")} WHERE id = ?`, values)

  const updated = await query("SELECT * FROM calls WHERE id = ?", [params.id])
  return NextResponse.json(updated[0])
}
