import { type NextRequest, NextResponse } from "next/server"
import { query, queryRaw, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** POST /api/messages — send a new message */
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { recipientId, subject, body: msgBody, priority } = body

    if (!recipientId || !subject || !msgBody) {
      return NextResponse.json({ error: "recipientId, subject, and body are required" }, { status: 400 })
    }

    // Verify recipient exists
    const [recipient] = await query<{ id: number; first_name: string; last_name: string }>(
      "SELECT id, first_name, last_name FROM users WHERE id = ? AND is_active = TRUE",
      [recipientId]
    )
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 })

    const { insertId } = await execute(
      `INSERT INTO internal_messages (sender_id, recipient_id, subject, body, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [session.userId, recipientId, subject, msgBody, priority || "normal"]
    )

    // Create notification for recipient
    await execute(
      `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
       VALUES (?, ?, ?, 'message', 'internal_messages', ?)`,
      [
        recipientId,
        `New message from ${session.name || session.username}`,
        `Subject: ${subject}`,
        insertId
      ]
    ).catch(() => {}) // Don't fail if notifications table not yet migrated

    return NextResponse.json({ id: insertId, success: true }, { status: 201 })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

/** GET /api/messages — get inbox (received messages) */
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page  = parseInt(searchParams.get("page")  || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  const messages = await queryRaw(
    `SELECT m.*, 
       CONCAT(u.first_name, ' ', u.last_name) AS sender_name,
       u.username AS sender_username, u.role AS sender_role
     FROM internal_messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.recipient_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [session.userId, limit, offset]
  )

  const [{ total }] = await query<{ total: number }>(
    "SELECT COUNT(*) AS total FROM internal_messages WHERE recipient_id = ?",
    [session.userId]
  )

  const [{ unread }] = await query<{ unread: number }>(
    "SELECT COUNT(*) AS unread FROM internal_messages WHERE recipient_id = ? AND is_read = FALSE",
    [session.userId]
  )

  return NextResponse.json({ messages, total, unread, page, limit })
}
