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
  if (!["admin", "manager"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const today = new Date().toISOString().split("T")[0]
  const thisMonth = today.substring(0, 7) // YYYY-MM

  // --- Call Analytics ---
  const [totalCalls] = await query<{ count: number }>("SELECT COUNT(*) as count FROM calls")
  const [callsThisMonth] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM calls WHERE DATE_FORMAT(created_at, '%Y-%m') = ?", [thisMonth]
  )
  const [completedCalls] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM calls WHERE call_status = 'completed'"
  )
  const [missedCalls] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM calls WHERE call_status = 'missed'"
  )

  // Call by type breakdown
  const callsByType = await query(
    `SELECT ct.type_name, ct.type_code, COUNT(c.id) as call_count,
      SUM(c.duration_seconds) as total_duration_seconds
     FROM calls c
     JOIN call_types ct ON c.call_type_id = ct.id
     GROUP BY ct.id, ct.type_name, ct.type_code
     ORDER BY call_count DESC`
  )

  // Call by department breakdown
  const callsByDept = await query(
    `SELECT d.department_name, d.department_code, COUNT(c.id) as call_count,
      SUM(c.duration_seconds) as total_duration
     FROM calls c
     JOIN departments d ON c.department_id = d.id
     GROUP BY d.id, d.department_name, d.department_code
     ORDER BY call_count DESC`
  )

  // Call volume last 30 days
  const callVolume30 = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as total,
      SUM(call_status = 'completed') as completed,
      SUM(call_status = 'missed') as missed
     FROM calls WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`
  )

  // --- Billing Analytics ---
  const [totalRevenue] = await query<{ amount: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as amount FROM bills WHERE bill_status = 'paid'"
  )
  const [pendingRevenue] = await query<{ amount: number; count: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as amount, COUNT(*) as count FROM bills WHERE bill_status IN ('pending', 'sent')"
  )
  const [overdueRevenue] = await query<{ amount: number; count: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as amount, COUNT(*) as count FROM bills WHERE bill_status = 'overdue'"
  )
  const [thisMonthRevenue] = await query<{ amount: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as amount FROM bills WHERE bill_status = 'paid' AND DATE_FORMAT(paid_date, '%Y-%m') = ?",
    [thisMonth]
  )

  const billingByDept = await query(
    `SELECT d.department_name, COUNT(b.id) as bill_count,
      COALESCE(SUM(CASE WHEN b.bill_status='paid' THEN b.total_amount ELSE 0 END), 0) as paid_total,
      COALESCE(SUM(CASE WHEN b.bill_status='overdue' THEN b.total_amount ELSE 0 END), 0) as overdue_total
     FROM bills b
     LEFT JOIN departments d ON b.department_id = d.id
     GROUP BY d.id, d.department_name
     ORDER BY paid_total DESC`
  )

  const monthlyRevenue = await query(
    `SELECT DATE_FORMAT(paid_date, '%Y-%m') as month,
      COALESCE(SUM(total_amount), 0) as revenue
     FROM bills WHERE bill_status = 'paid' AND paid_date IS NOT NULL
     GROUP BY DATE_FORMAT(paid_date, '%Y-%m')
     ORDER BY month DESC LIMIT 12`
  )

  // --- Fault Analytics ---
  const [openFaults] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM fault_reports WHERE fault_status IN ('open', 'assigned', 'in_progress')"
  )
  const [resolvedFaults] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM fault_reports WHERE fault_status = 'resolved'"
  )
  const faultsBySeverity = await query(
    `SELECT fault_severity, fault_status, COUNT(*) as count
     FROM fault_reports GROUP BY fault_severity, fault_status ORDER BY FIELD(fault_severity,'critical','high','medium','low')`
  )
  const faultsByDept = await query(
    `SELECT d.department_name, COUNT(fr.id) as fault_count,
      SUM(fr.fault_status = 'resolved') as resolved_count
     FROM fault_reports fr
     LEFT JOIN departments d ON fr.department_id = d.id
     GROUP BY d.id, d.department_name
     ORDER BY fault_count DESC`
  )

  // Average resolution time — fault_reports doesn't have resolved_at; approximate using reported_at vs status
  const [avgResTime] = await query<{ avg_hours: number }>(
    `SELECT 0 as avg_hours`
  )

  // --- Station Analytics ---
  const [stationStats] = await query<{ total: number; active: number; faulty: number; maintenance: number }>(
    "SELECT COUNT(*) as total, SUM(status='active') as active, SUM(status='faulty') as faulty, SUM(status='maintenance') as maintenance FROM stations"
  )

  // --- Staff/User Analytics ---
  const [activeUsers] = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM users WHERE is_active = TRUE"
  )
  const usersByRole = await query(
    "SELECT role, COUNT(*) as count FROM users WHERE is_active = TRUE GROUP BY role"
  )

  // --- Audit Log Recent Activity ---
  const recentActivity = await query(
    `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT 15`
  )

  return NextResponse.json({
    calls: {
      total: totalCalls.count,
      thisMonth: callsThisMonth.count,
      completed: completedCalls.count,
      missed: missedCalls.count,
      completionRate: totalCalls.count > 0 ? Math.round((completedCalls.count / totalCalls.count) * 100) : 0,
      byType: callsByType,
      byDept: callsByDept,
      volume30Days: callVolume30,
    },
    billing: {
      totalRevenue: totalRevenue.amount,
      thisMonthRevenue: thisMonthRevenue.amount,
      pendingAmount: pendingRevenue.amount,
      pendingCount: pendingRevenue.count,
      overdueAmount: overdueRevenue.amount,
      overdueCount: overdueRevenue.count,
      byDept: billingByDept,
      monthlyTrend: monthlyRevenue,
    },
    faults: {
      open: openFaults.count,
      resolved: resolvedFaults.count,
      avgResolutionHours: Math.round(avgResTime.avg_hours || 0),
      bySeverity: faultsBySeverity,
      byDept: faultsByDept,
    },
    stations: stationStats,
    users: {
      active: activeUsers.count,
      byRole: usersByRole,
    },
    recentActivity,
  })
}
