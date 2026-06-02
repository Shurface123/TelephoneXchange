import { type NextRequest, NextResponse } from "next/server"
import { query, queryRaw, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const department = searchParams.get("department")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const offset = (page - 1) * limit

  let sql = `
    SELECT b.*, bt.type_name as bill_type_name, bt.billing_period,
      d.department_name, u.first_name as gen_by_first, u.last_name as gen_by_last
    FROM bills b
    LEFT JOIN bill_types bt ON b.bill_type_id = bt.id
    LEFT JOIN departments d ON b.department_id = d.id
    LEFT JOIN users u ON b.generated_by = u.id
    WHERE 1=1`
  const params: any[] = []

  if (status) { sql += " AND b.bill_status = ?"; params.push(status) }
  if (department) { sql += " AND b.department_id = ?"; params.push(department) }

  sql += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?"
  params.push(limit, offset)

  const bills = await queryRaw(sql, params)
  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM bills WHERE 1=1${status ? " AND bill_status = ?" : ""}`,
    status ? [status] : []
  )

  return NextResponse.json({ bills, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { accountName, accountNumber, billTypeId, departmentId, periodStart, periodEnd, notes } = body

    const invoiceNum = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Calculate totals from calls in period
    const [callStats] = await query<{ total_calls: number; total_duration: number; subtotal: number }>(
      `SELECT COUNT(*) as total_calls, COALESCE(SUM(c.duration_seconds), 0) as total_duration,
        COALESCE(SUM(c.duration_seconds / 60 * ct.rate_per_minute), 0) as subtotal
       FROM calls c
       JOIN call_types ct ON c.call_type_id = ct.id
       WHERE c.department_id = ? AND ct.is_billable = TRUE
         AND DATE(c.created_at) BETWEEN ? AND ? AND c.call_status = 'completed'`,
      [departmentId, periodStart, periodEnd]
    )

    const subtotal = parseFloat((callStats.subtotal || 0).toFixed(2))
    const taxAmount = parseFloat((subtotal * 0.125).toFixed(2))
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2))

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const { insertId } = await execute(
      `INSERT INTO bills (invoice_number, account_name, account_number, bill_type_id, department_id,
        billing_period_start, billing_period_end, total_calls, total_duration_seconds,
        subtotal, tax_amount, total_amount, currency, bill_status, due_date, generated_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GHS', 'draft', ?, ?, ?)`,
      [invoiceNum, accountName, accountNumber || null, billTypeId || 7, departmentId || null,
        periodStart, periodEnd, callStats.total_calls, callStats.total_duration,
        subtotal, taxAmount, totalAmount, dueDate.toISOString().split("T")[0], session.userId, notes || null]
    )

    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'GENERATE_BILL', 'bills', ?, ?)",
      [session.userId, insertId, "127.0.0.1"]
    )

    const bill = await query("SELECT * FROM bills WHERE id = ?", [insertId])
    return NextResponse.json(bill[0], { status: 201 })
  } catch (error: any) {
    console.error("Create bill error:", error?.message || error)
    return NextResponse.json({ error: "Failed to create bill", detail: error?.message }, { status: 500 })
  }
}
