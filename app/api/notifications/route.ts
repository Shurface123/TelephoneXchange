import { type NextRequest, NextResponse } from "next/server"
import { query, queryRaw, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** GET /api/notifications — fetch notifications for the current user */
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const limit = parseInt(searchParams.get("limit") || "20")

  let sql = `
    SELECT id, title, message, notification_type, reference_table, reference_id, is_read, created_at
    FROM notifications
    WHERE (user_id = ? OR user_id IS NULL)`
  const params: any[] = [session.userId]

  if (unreadOnly) { sql += " AND is_read = FALSE" }
  sql += " ORDER BY created_at DESC LIMIT ?"
  params.push(limit)

  const notifications = await queryRaw(sql, params)

  const [{ unread_count }] = await query<{ unread_count: number }>(
    "SELECT COUNT(*) as unread_count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE",
    [session.userId]
  )

  return NextResponse.json({ notifications, unreadCount: unread_count })
}

/** POST /api/notifications — create a notification (internal use) */
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { userId, title, message, notificationType, referenceTable, referenceId } = body

    const { insertId } = await execute(
      `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, title, message ?? null, notificationType ?? "system", referenceTable ?? null, referenceId ?? null]
    )

    return NextResponse.json({ id: insertId, success: true }, { status: 201 })
  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

/** PATCH /api/notifications — mark notifications as read */
export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { ids, markAll } = body

  if (markAll) {
    await execute(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? OR user_id IS NULL",
      [session.userId]
    )
  } else if (ids && Array.isArray(ids) && ids.length > 0) {
    await execute(
      `UPDATE notifications SET is_read = TRUE WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids
    )
  }

  return NextResponse.json({ success: true })
}
