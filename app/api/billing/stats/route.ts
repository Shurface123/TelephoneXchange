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

    const [totalRevenue] = await query<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE bill_status = 'paid'"
    )
    const [pendingAmount] = await query<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE bill_status IN ('pending', 'sent')"
    )
    const [overdueCount] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'overdue'"
    )
    const [overdueAmount] = await query<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE bill_status = 'overdue'"
    )
    const [draftCount] = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'draft'"
    )

    const monthlyRevenue = await query(
        `SELECT DATE_FORMAT(paid_date, '%Y-%m') as month, SUM(total_amount) as revenue
     FROM bills WHERE bill_status = 'paid' AND paid_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month ORDER BY month ASC`
    )

    return NextResponse.json({
        totalRevenue: totalRevenue.total,
        pendingAmount: pendingAmount.total,
        overdueCount: overdueCount.count,
        overdueAmount: overdueAmount.total,
        draftCount: draftCount.count,
        monthlyRevenue,
    })
}
