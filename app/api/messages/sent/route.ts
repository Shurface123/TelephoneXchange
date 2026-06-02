import { type NextRequest, NextResponse } from "next/server"
import { query, queryRaw } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** GET /api/messages/sent — get sent messages */
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page  = parseInt(searchParams.get("page")  || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  const messages = await queryRaw(
    `SELECT m.*,
       CONCAT(u.first_name, ' ', u.last_name) AS recipient_name,
       u.username AS recipient_username, u.role AS recipient_role
     FROM internal_messages m
     JOIN users u ON m.recipient_id = u.id
     WHERE m.sender_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [session.userId, limit, offset]
  )

  const [{ total }] = await query<{ total: number }>(
    "SELECT COUNT(*) AS total FROM internal_messages WHERE sender_id = ?",
    [session.userId]
  )

  return NextResponse.json({ messages, total, page, limit })
}
