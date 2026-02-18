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

  const departments = await query(
    `SELECT d.*, 
      COUNT(DISTINCT e.id) as employee_count,
      COUNT(DISTINCT s.id) as station_count,
      CONCAT(hd.first_name, ' ', hd.last_name) as head_name
     FROM departments d
     LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = TRUE
     LEFT JOIN stations s ON d.id = s.department_id
     LEFT JOIN employees hd ON d.head_of_department = hd.id
     WHERE d.is_active = TRUE
     GROUP BY d.id
     ORDER BY d.department_name ASC`
  )

  return NextResponse.json({ departments })
}
