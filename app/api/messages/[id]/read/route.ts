import { type NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** PATCH /api/messages/[id]/read — mark message as read */
export async function PATCH(
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
    const { affectedRows } = await execute(
      "UPDATE internal_messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ?",
      [messageId, session.userId]
    )

    if (affectedRows === 0) {
      return NextResponse.json({ error: "Message not found or not recipient" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 })
  }
}
