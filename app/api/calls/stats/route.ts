import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function getSession(request: NextRequest) {
    const cookie = request.cookies.get("auth-session")
    if (!cookie) return null
    try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest) {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const today = new Date().toISOString().split("T")[0]

    const [activeCalls] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE call_status IN ('connected', 'pending')"
    )
    const [todayCalls] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = ?", [today]
    )
    const [completedToday] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE call_status = 'completed' AND DATE(created_at) = ?", [today]
    )
    const [missedToday] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE call_status = 'missed' AND DATE(created_at) = ?", [today]
    )
    const [avgDuration] = await query<{ avg: number }>(
        "SELECT AVG(duration_seconds) as avg FROM calls WHERE call_status = 'completed' AND DATE(created_at) = ?", [today]
    )

    const activeCallsList = await query(
        `SELECT c.id, c.call_reference, c.caller_name, c.caller_phone, c.call_status, c.priority, c.start_time,
      d.department_name, ct.type_name as call_type_name
     FROM calls c
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN call_types ct ON c.call_type_id = ct.id
     WHERE c.call_status IN ('connected', 'pending')
     ORDER BY c.priority DESC, c.start_time ASC`
    )

    return NextResponse.json({
        activeCalls: activeCalls.count,
        todayCalls: todayCalls.count,
        completedToday: completedToday.count,
        missedToday: missedToday.count,
        avgDurationSeconds: Math.round(avgDuration.avg || 0),
        completionRate: todayCalls.count > 0 ? Math.round((completedToday.count / todayCalls.count) * 100) : 0,
        activeCallsList,
    })
}
