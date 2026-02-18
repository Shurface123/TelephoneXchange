import { type NextRequest, NextResponse } from "next/server"

// Mock call data for analytics - in production, this would query MySQL
const mockCallsData = [
  {
    id: "CALL001",
    callerName: "John Doe",
    department: "finance",
    callType: "local",
    status: "completed",
    durationMinutes: 15,
    callStartTime: "2024-01-15T09:30:00Z",
    priority: "medium",
  },
  {
    id: "CALL002",
    callerName: "Jane Smith",
    department: "hr",
    callType: "national",
    status: "completed",
    durationMinutes: 8,
    callStartTime: "2024-01-15T10:15:00Z",
    priority: "high",
  },
  {
    id: "CALL003",
    callerName: "Michael Johnson",
    department: "it",
    callType: "internal",
    status: "completed",
    durationMinutes: 22,
    callStartTime: "2024-01-15T11:00:00Z",
    priority: "low",
  },
  {
    id: "CALL004",
    callerName: "Sarah Wilson",
    department: "health",
    callType: "local",
    status: "missed",
    durationMinutes: 0,
    callStartTime: "2024-01-15T14:30:00Z",
    priority: "urgent",
  },
  {
    id: "CALL005",
    callerName: "David Brown",
    department: "extension",
    callType: "international",
    status: "completed",
    durationMinutes: 35,
    callStartTime: "2024-01-15T16:45:00Z",
    priority: "medium",
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const department = searchParams.get("department")
  const reportType = searchParams.get("type")

  let filteredCalls = mockCallsData

  // Filter by date range
  if (startDate && endDate) {
    filteredCalls = filteredCalls.filter((call) => {
      const callDate = new Date(call.callStartTime)
      return callDate >= new Date(startDate) && callDate <= new Date(endDate)
    })
  }

  // Filter by department
  if (department && department !== "all") {
    filteredCalls = filteredCalls.filter((call) => call.department === department)
  }

  // Generate different report types
  switch (reportType) {
    case "summary":
      return NextResponse.json({
        success: true,
        data: generateCallSummary(filteredCalls),
      })

    case "department":
      return NextResponse.json({
        success: true,
        data: generateDepartmentAnalysis(filteredCalls),
      })

    case "hourly":
      return NextResponse.json({
        success: true,
        data: generateHourlyAnalysis(filteredCalls),
      })

    case "trends":
      return NextResponse.json({
        success: true,
        data: generateTrendAnalysis(filteredCalls),
      })

    default:
      return NextResponse.json({
        success: true,
        data: {
          calls: filteredCalls,
          summary: generateCallSummary(filteredCalls),
        },
      })
  }
}

function generateCallSummary(calls: any[]) {
  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === "completed").length
  const missedCalls = calls.filter((c) => c.status === "missed").length
  const totalDuration = calls.reduce((sum, call) => sum + call.durationMinutes, 0)
  const avgDuration = totalCalls > 0 ? totalDuration / completedCalls : 0

  const callsByType = calls.reduce((acc, call) => {
    acc[call.callType] = (acc[call.callType] || 0) + 1
    return acc
  }, {})

  const callsByPriority = calls.reduce((acc, call) => {
    acc[call.priority] = (acc[call.priority] || 0) + 1
    return acc
  }, {})

  return {
    totalCalls,
    completedCalls,
    missedCalls,
    totalDuration,
    avgDuration: Math.round(avgDuration * 100) / 100,
    completionRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
    callsByType,
    callsByPriority,
  }
}

function generateDepartmentAnalysis(calls: any[]) {
  const departmentStats = calls.reduce((acc, call) => {
    if (!acc[call.department]) {
      acc[call.department] = {
        name: call.department,
        totalCalls: 0,
        completedCalls: 0,
        missedCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
      }
    }

    acc[call.department].totalCalls++
    if (call.status === "completed") {
      acc[call.department].completedCalls++
      acc[call.department].totalDuration += call.durationMinutes
    } else if (call.status === "missed") {
      acc[call.department].missedCalls++
    }

    return acc
  }, {})

  // Calculate averages
  Object.values(departmentStats).forEach((dept: any) => {
    dept.avgDuration = dept.completedCalls > 0 ? Math.round((dept.totalDuration / dept.completedCalls) * 100) / 100 : 0
    dept.completionRate = dept.totalCalls > 0 ? Math.round((dept.completedCalls / dept.totalCalls) * 100) : 0
  })

  return Object.values(departmentStats)
}

function generateHourlyAnalysis(calls: any[]) {
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    calls: 0,
    duration: 0,
  }))

  calls.forEach((call) => {
    const hour = new Date(call.callStartTime).getHours()
    hourlyData[hour].calls++
    hourlyData[hour].duration += call.durationMinutes
  })

  return hourlyData
}

function generateTrendAnalysis(calls: any[]) {
  const dailyData = calls.reduce((acc, call) => {
    const date = new Date(call.callStartTime).toISOString().split("T")[0]
    if (!acc[date]) {
      acc[date] = {
        date,
        calls: 0,
        duration: 0,
        completed: 0,
        missed: 0,
      }
    }

    acc[date].calls++
    acc[date].duration += call.durationMinutes
    if (call.status === "completed") acc[date].completed++
    if (call.status === "missed") acc[date].missed++

    return acc
  }, {})

  return Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date))
}
