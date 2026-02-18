import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billType, accountName } = body

    let billingPeriodStart: string
    let billingPeriodEnd: string
    const now = new Date()

    // Calculate billing period based on type
    switch (billType) {
      case "daily":
        billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().split("T")[0]
        billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0]
        break
      case "weekly":
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        billingPeriodStart = weekStart.toISOString().split("T")[0]
        billingPeriodEnd = now.toISOString().split("T")[0]
        break
      case "monthly":
        billingPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
        billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]
        break
      case "yearly":
        billingPeriodStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split("T")[0]
        billingPeriodEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split("T")[0]
        break
      default:
        throw new Error("Invalid bill type")
    }

    // Generate bill using the main billing endpoint
    const billResponse = await fetch(`${request.nextUrl.origin}/api/billing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billType,
        accountName,
        billingPeriodStart,
        billingPeriodEnd,
      }),
    })

    const result = await billResponse.json()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate automatic bill",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
