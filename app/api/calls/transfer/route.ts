import { type NextRequest, NextResponse } from "next/server"

// Mock database - in production, this would connect to MySQL
const calls: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, fromDepartment, toDepartment, toEmployee, reason, transferredBy } = body

    const callIndex = calls.findIndex((c) => c.id === callId)

    if (callIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Call not found",
        },
        { status: 404 },
      )
    }

    // Update call with transfer information
    const updatedCall = {
      ...calls[callIndex],
      department: toDepartment,
      employee: toEmployee || "",
      status: "transferring",
      transferHistory: [
        ...(calls[callIndex].transferHistory || []),
        {
          from: fromDepartment,
          to: toDepartment,
          toEmployee: toEmployee,
          reason: reason,
          transferredBy: transferredBy,
          transferredAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    calls[callIndex] = updatedCall

    return NextResponse.json({
      success: true,
      message: "Call transferred successfully",
      data: updatedCall,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to transfer call",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
