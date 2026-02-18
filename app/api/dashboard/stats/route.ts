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

    // Calls stats
    const [activeCalls] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE call_status IN ('connected', 'pending')"
    )
    const [todayCalls] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = ?", [today]
    )
    const [completedToday] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE call_status = 'completed' AND DATE(created_at) = ?", [today]
    )

    // Billing stats
    const [pendingBills] = await query<{ count: number; amount: number }>(
        "SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount FROM bills WHERE bill_status IN ('pending', 'sent')"
    )
    const [todayRevenue] = await query<{ amount: number }>(
        "SELECT COALESCE(SUM(total_amount), 0) as amount FROM bills WHERE bill_status = 'paid' AND DATE(paid_date) = ?", [today]
    )
    const [monthRevenue] = await query<{ amount: number }>(
        "SELECT COALESCE(SUM(total_amount), 0) as amount FROM bills WHERE bill_status = 'paid' AND MONTH(paid_date) = MONTH(CURDATE()) AND YEAR(paid_date) = YEAR(CURDATE())"
    )

    // Fault stats
    const [openFaults] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM fault_reports WHERE fault_status IN ('open', 'assigned', 'in_progress')"
    )
    const [criticalFaults] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM fault_reports WHERE fault_severity = 'critical' AND fault_status NOT IN ('resolved', 'closed', 'cancelled')"
    )

    // Maintenance stats
    const [upcomingMaintenance] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM maintenance_schedules WHERE maintenance_status = 'scheduled' AND scheduled_date >= CURDATE() AND scheduled_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
    )

    // Station stats
    const [stationStats] = await query<{ total: number; active: number; faulty: number; maintenance: number }>(
        "SELECT COUNT(*) as total, SUM(status='active') as active, SUM(status='faulty') as faulty, SUM(status='maintenance') as maintenance FROM stations"
    )

    // Recent calls
    const recentCalls = await query(
        `SELECT c.id, c.call_reference, c.caller_name, c.caller_phone, c.call_status, c.priority, c.created_at,
      d.department_name, ct.type_name as call_type_name
     FROM calls c
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN call_types ct ON c.call_type_id = ct.id
     ORDER BY c.created_at DESC LIMIT 8`
    )

    // Follow-ups due today/overdue
    const [followUps] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM calls WHERE follow_up_required = TRUE AND follow_up_date <= ? AND call_status = 'completed'",
        [today]
    )

    // Call volume last 7 days for chart
    const callVolume = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as total,
      SUM(call_status = 'completed') as completed, SUM(call_status = 'missed') as missed
     FROM calls WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`
    )

    return NextResponse.json({
        calls: {
            active: activeCalls.count,
            today: todayCalls.count,
            completedToday: completedToday.count,
            completionRate: todayCalls.count > 0 ? Math.round((completedToday.count / todayCalls.count) * 100) : 0,
            followUpsDue: followUps.count,
        },
        billing: {
            pendingCount: pendingBills.count,
            pendingAmount: pendingBills.amount,
            todayRevenue: todayRevenue.amount,
            monthRevenue: monthRevenue.amount,
        },
        maintenance: {
            openFaults: openFaults.count,
            criticalFaults: criticalFaults.count,
            upcomingMaintenance: upcomingMaintenance.count,
        },
        stations: stationStats,
        recentCalls,
        callVolume,
    })
}
