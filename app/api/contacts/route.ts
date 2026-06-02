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
    const phone = searchParams.get("phone")
    const name = searchParams.get("name")
    const limit = parseInt(searchParams.get("limit") || "10")

    let sql = "SELECT * FROM contacts WHERE 1=1"
    const params: any[] = []

    if (phone) { sql += " AND phone LIKE ?"; params.push(`%${phone}%`) }
    if (name) { sql += " AND name LIKE ?"; params.push(`%${name}%`) }

    sql += " ORDER BY name ASC LIMIT ?"
    params.push(limit)

    const contacts = await queryRaw(sql, params)
    return NextResponse.json({ contacts })
}

export async function POST(request: NextRequest) {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, phone, email, company, contactType, notes } = body

    if (!name || !phone) return NextResponse.json({ error: "Name and phone required" }, { status: 400 })

    const { insertId } = await execute(
        "INSERT INTO contacts (name, phone, email, company, contact_type, notes) VALUES (?, ?, ?, ?, ?, ?)",
        [name, phone, email || null, company || null, contactType || "individual", notes || null]
    )

    const contact = await query("SELECT * FROM contacts WHERE id = ?", [insertId])
    return NextResponse.json(contact[0], { status: 201 })
}
