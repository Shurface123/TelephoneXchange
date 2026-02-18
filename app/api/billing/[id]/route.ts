import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bills = await query(
    `SELECT b.*, bt.type_name as bill_type_name, bt.billing_period,
      d.department_name, u.first_name as gen_by_first, u.last_name as gen_by_last
     FROM bills b
     LEFT JOIN bill_types bt ON b.bill_type_id = bt.id
     LEFT JOIN departments d ON b.department_id = d.id
     LEFT JOIN users u ON b.generated_by = u.id
     WHERE b.id = ?`,
    [params.id]
  )
  if (!bills.length) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

  const items = await query(
    `SELECT bi.*, ct.type_name FROM bill_items bi
     LEFT JOIN call_types ct ON bi.call_type_id = ct.id
     WHERE bi.bill_id = ?`,
    [params.id]
  )

  return NextResponse.json({ ...bills[0], items })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { billStatus, paymentMethod, paymentReference, paidDate } = body

  const updates: string[] = []
  const values: any[] = []

  if (billStatus) { updates.push("bill_status = ?"); values.push(billStatus) }
  if (paymentMethod) { updates.push("payment_method = ?"); values.push(paymentMethod) }
  if (paymentReference) { updates.push("payment_reference = ?"); values.push(paymentReference) }
  if (paidDate) { updates.push("paid_date = ?"); values.push(paidDate) }
  if (billStatus === "paid" && !paidDate) { updates.push("paid_date = CURDATE()") }

  if (!updates.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

  values.push(params.id)
  await execute(`UPDATE bills SET ${updates.join(", ")} WHERE id = ?`, values)

  await execute(
    "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'UPDATE_BILL', 'bills', ?, ?)",
    [session.userId, params.id, "127.0.0.1"]
  )

  const updated = await query("SELECT * FROM bills WHERE id = ?", [params.id])
  return NextResponse.json(updated[0])
}
