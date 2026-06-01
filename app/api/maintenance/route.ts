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
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  let sql = `
    SELECT ms.*, s.station_name, s.station_code,
      CONCAT(u.first_name, ' ', u.last_name) as technician_name
    FROM maintenance_schedules ms
    LEFT JOIN stations s ON ms.station_id = s.id
    LEFT JOIN users u ON ms.assigned_technician = u.id
    WHERE 1=1`
  const params: any[] = []

  if (status) { sql += " AND ms.maintenance_status = ?"; params.push(status) }
  if (session.role === "technician") { sql += " AND ms.assigned_technician = ?"; params.push(session.userId) }

  sql += " ORDER BY ms.scheduled_date ASC, ms.scheduled_time ASC LIMIT ? OFFSET ?"
  params.push(limit, offset)

  const schedules = await query(sql, params)
  const [{ total }] = await query<{ total: number }>("SELECT COUNT(*) as total FROM maintenance_schedules")

  return NextResponse.json({ schedules, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { stationId, maintenanceType, maintenanceDescription, scheduledDate, scheduledTime, estimatedDuration, assignedTechnician } = body

    const ref = `MNT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const { insertId } = await execute(
      `INSERT INTO maintenance_schedules (schedule_reference, station_id, maintenance_type, maintenance_description, scheduled_date, scheduled_time, estimated_duration, assigned_technician, maintenance_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [ref, stationId || null, maintenanceType, maintenanceDescription, scheduledDate, scheduledTime || null, estimatedDuration || null, assignedTechnician || null, session.userId]
    )

    // Notify assigned technician
    if (assignedTechnician) {
      await execute(
        `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
         VALUES (?, ?, ?, 'maintenance', 'maintenance_schedules', ?)`,
        [
          assignedTechnician,
          `New Maintenance Scheduled: ${ref}`,
          `You have been assigned to maintenance task on ${scheduledDate}. Type: ${maintenanceType}`,
          insertId
        ]
      )
    }

    const schedule = await query("SELECT * FROM maintenance_schedules WHERE id = ?", [insertId])
    return NextResponse.json(schedule[0], { status: 201 })
  } catch (error) {
    console.error("Create maintenance error:", error)
    return NextResponse.json({ error: "Failed to create maintenance schedule" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const body = await request.json()
  const { maintenanceStatus, completionNotes, actualDuration, cost } = body

  const updates: string[] = []
  const values: any[] = []

  if (maintenanceStatus) { updates.push("maintenance_status = ?"); values.push(maintenanceStatus) }
  if (completionNotes) { updates.push("completion_notes = ?"); values.push(completionNotes) }
  if (actualDuration) { updates.push("actual_duration = ?"); values.push(actualDuration) }
  if (cost) { updates.push("cost = ?"); values.push(cost) }

  values.push(id)
  await execute(`UPDATE maintenance_schedules SET ${updates.join(", ")} WHERE id = ?`, values)

  const updated = await query("SELECT * FROM maintenance_schedules WHERE id = ?", [id])
  return NextResponse.json(updated[0])
}
