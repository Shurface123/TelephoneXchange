import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** POST /api/messages/[id]/reply — reply to a message */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const messageId = parseInt(params.id)
  if (isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { body: replyBody } = body

    if (!replyBody) {
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 })
    }

    // Fetch the original message to find sender/recipient and subject
    const [original] = await query<any>(
      "SELECT * FROM internal_messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)",
      [messageId, session.userId, session.userId]
    )

    if (!original) {
      return NextResponse.json({ error: "Original message not found" }, { status: 404 })
    }

    // Recipient of the reply is the sender of the original message (or the recipient if we are replying to our own sent message)
    const recipientId = original.sender_id === session.userId ? original.recipient_id : original.sender_id
    const subject = original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`

    const { insertId } = await execute(
      `INSERT INTO internal_messages (sender_id, recipient_id, subject, body, parent_id, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.userId, recipientId, subject, replyBody, messageId, original.priority]
    )

    // Notify the recipient
    await execute(
      `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
       VALUES (?, ?, ?, 'message', 'internal_messages', ?)`,
      [
        recipientId,
        `New reply from ${session.name || session.username}`,
        `Subject: ${subject}`,
        insertId
      ]
    ).catch(() => {})

    return NextResponse.json({ id: insertId, success: true }, { status: 201 })
  } catch (error) {
    console.error("Reply message error:", error)
    return NextResponse.json({ error: "Failed to reply to message" }, { status: 500 })
  }
}
