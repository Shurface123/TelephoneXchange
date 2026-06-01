import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("auth-session")
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, "base64").toString()) } catch { return null }
}

/** POST /api/calls/transfer — transfer a call to another department/employee */
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { callId, fromDepartmentId, fromEmployeeId, toDepartmentId, toEmployeeId, transferReason, transferNotes } = body

    if (!callId) return NextResponse.json({ error: "callId is required" }, { status: 400 })

    // Verify call exists and is active
    const [call] = await query<{ id: number; call_status: string; transfer_count: number }>(
      "SELECT id, call_status, transfer_count FROM calls WHERE id = ?", [callId]
    )
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 })

    // Insert transfer record
    const { insertId } = await execute(
      `INSERT INTO call_transfers (call_id, from_department_id, from_employee_id, to_department_id, to_employee_id, transfer_reason, transfer_notes, transferred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [callId, fromDepartmentId || null, fromEmployeeId || null, toDepartmentId || null, toEmployeeId || null, transferReason || null, transferNotes || null, session.userId]
    )

    // Update call status and increment transfer count
    await execute(
      `UPDATE calls SET call_status = 'transferred', transfer_count = transfer_count + 1,
       department_id = COALESCE(?, department_id), employee_id = COALESCE(?, employee_id)
       WHERE id = ?`,
      [toDepartmentId || null, toEmployeeId || null, callId]
    )

    // Audit log
    await execute(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address) VALUES (?, 'TRANSFER_CALL', 'call_transfers', ?, ?)",
      [session.userId, insertId, "127.0.0.1"]
    )

    // Notify target department employee if specified
    if (toEmployeeId) {
      const [emp] = await query<{ user_id: number | null; first_name: string; last_name: string }>(
        "SELECT user_id, first_name, last_name FROM employees WHERE id = ?", [toEmployeeId]
      )
      if (emp?.user_id) {
        const [callRef] = await query<{ call_reference: string; caller_name: string }>(
          "SELECT call_reference, caller_name FROM calls WHERE id = ?", [callId]
        )
        await execute(
          `INSERT INTO notifications (user_id, title, message, notification_type, reference_table, reference_id)
           VALUES (?, ?, ?, 'call', 'calls', ?)`,
          [
            emp.user_id,
            `Call Transferred to You: ${callRef?.call_reference}`,
            `Call from ${callRef?.caller_name} has been transferred to you. Reason: ${transferReason || "Not specified"}`,
            callId
          ]
        )
      }
    }

    const transfer = await query("SELECT * FROM call_transfers WHERE id = ?", [insertId])
    return NextResponse.json({ transfer: transfer[0], success: true }, { status: 201 })
  } catch (error) {
    console.error("Transfer call error:", error)
    return NextResponse.json({ error: "Failed to transfer call" }, { status: 500 })
  }
}

/** GET /api/calls/transfer — get transfer history for a call */
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const callId = searchParams.get("callId")

  if (!callId) return NextResponse.json({ error: "callId is required" }, { status: 400 })

  const transfers = await query(
    `SELECT ct.*,
      fd.department_name as from_dept_name,
      td.department_name as to_dept_name,
      CONCAT(fe.first_name, ' ', fe.last_name) as from_employee_name,
      CONCAT(te.first_name, ' ', te.last_name) as to_employee_name,
      CONCAT(u.first_name, ' ', u.last_name) as transferred_by_name
     FROM call_transfers ct
     LEFT JOIN departments fd ON ct.from_department_id = fd.id
     LEFT JOIN departments td ON ct.to_department_id = td.id
     LEFT JOIN employees fe ON ct.from_employee_id = fe.id
     LEFT JOIN employees te ON ct.to_employee_id = te.id
     LEFT JOIN users u ON ct.transferred_by = u.id
     WHERE ct.call_id = ?
     ORDER BY ct.transfer_time ASC`,
    [callId]
  )

  return NextResponse.json({ transfers })
}
