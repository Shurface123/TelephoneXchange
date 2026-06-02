import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** GET /api/conferences — list user's scheduled/active conferences */
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Return conferences where current user is organizer or a participant
    const conferences = await query(
      `SELECT DISTINCT c.*,
         CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
         u.email as organizer_email,
         (SELECT COUNT(*) FROM conference_participants WHERE conference_id = c.id) as participant_count
       FROM conferences c
       JOIN users u ON c.organizer_id = u.id
       LEFT JOIN conference_participants cp ON c.id = cp.conference_id
       WHERE c.organizer_id = ? OR cp.user_id = ?
       ORDER BY c.scheduled_at ASC`,
      [session.userId, session.userId]
    )

    // For each conference, get the participants list
    for (const conf of conferences) {
      const participants = await query(
        `SELECT cp.user_id, cp.response_status,
           CONCAT(u.first_name, ' ', u.last_name) as name, u.role, u.email
         FROM conference_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conference_id = ?`,
        [conf.id]
      )
      conf.participants = participants
    }

    return NextResponse.json({ conferences })
  } catch (error) {
    console.error("Fetch conferences error:", error)
    return NextResponse.json({ error: "Failed to fetch conferences" }, { status: 500 })
  }
}

/** POST /api/conferences — schedule a new internal conference */
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { title, scheduledAt, durationMins, agenda, participantIds = [] } = body

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: "Title and scheduledAt are required" }, { status: 400 })
    }

    const { insertId } = await execute(
      `INSERT INTO conferences (title, organizer_id, scheduled_at, duration_mins, agenda, status)
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [title, session.userId, scheduledAt, parseInt(durationMins) || 60, agenda || null]
    )

    // Automatically add organizer as participant (accepted)
    await execute(
      `INSERT INTO conference_participants (conference_id, user_id, response_status)
       VALUES (?, ?, 'accepted')`,
      [insertId, session.userId]
    )

    // Add other participants
    for (const pId of participantIds) {
      const targetId = parseInt(pId)
      if (targetId && targetId !== session.userId) {
        await execute(
          `INSERT IGNORE INTO conference_participants (conference_id, user_id, response_status)
           VALUES (?, ?, 'pending')`,
          [insertId, targetId]
        )

        // Notify participant
        await execute(
          `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
           VALUES (?, ?, ?, 'conference', 'conferences', ?)`,
          [
            targetId,
            `New conference scheduled: ${title}`,
            `Scheduled for ${new Date(scheduledAt).toLocaleString("en-GH")}. Please RSVP.`,
            insertId
          ]
        ).catch(() => {})
      }
    }

    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'SCHEDULE_CONFERENCE', 'conferences', ?, ?)",
      [session.userId, insertId, "127.0.0.1"]
    ).catch(() => {})

    return NextResponse.json({ id: insertId, success: true }, { status: 201 })
  } catch (error) {
    console.error("Create conference error:", error)
    return NextResponse.json({ error: "Failed to schedule conference" }, { status: 500 })
  }
}

/** PATCH /api/conferences — RSVP response (accept/decline) */
export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { conferenceId, status } = body

    if (!conferenceId || !status || !["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "conferenceId and valid status are required" }, { status: 400 })
    }

    const { affectedRows } = await execute(
      `UPDATE conference_participants
       SET response_status = ?
       WHERE conference_id = ? AND user_id = ?`,
      [status, parseInt(conferenceId), session.userId]
    )

    if (affectedRows === 0) {
      return NextResponse.json({ error: "Conference invitation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("RSVP update error:", error)
    return NextResponse.json({ error: "Failed to update RSVP" }, { status: 500 })
  }
}
