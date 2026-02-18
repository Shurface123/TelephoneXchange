import { type NextRequest, NextResponse } from "next/server"

// Mock billing data for analytics
const mockBillingData = [
  {
    id: 1,
    invoiceNumber: "CHED-000001",
    accountName: "COCOBOD Administration",
    billType: "monthly",
    totalAmount: 1250.75,
    status: "paid",
    billingPeriodStart: "2024-01-01",
    billingPeriodEnd: "2024-01-31",
    paidDate: "2024-02-05",
    createdAt: "2024-02-01T00:00:00Z",
  },
  {
    id: 2,
    invoiceNumber: "CHED-000002",
    accountName: "HR Department",
    billType: "monthly",
    totalAmount: 890.5,
    status: "pending",
    billingPeriodStart: "2024-01-01",
    billingPeriodEnd: "2024-01-31",
    createdAt: "2024-02-01T00:00:00Z",
  },
  {
    id: 3,
    invoiceNumber: "CHED-000003",
    accountName: "Finance Department",
    billType: "weekly",
    totalAmount: 445.25,
    status: "paid",
    billingPeriodStart: "2024-01-22",
    billingPeriodEnd: "2024-01-28",
    paidDate: "2024-01-30",
    createdAt: "2024-01-29T00:00:00Z",
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const reportType = searchParams.get("type")

  let filteredBills = mockBillingData

  // Filter by date range
  if (startDate && endDate) {
    filteredBills = filteredBills.filter((bill) => {
      const billDate = new Date(bill.createdAt)
      return billDate >= new Date(startDate) && billDate <= new Date(endDate)
    })
  }

  switch (reportType) {
    case "revenue":
      return NextResponse.json({
        success: true,
        data: generateRevenueAnalysis(filteredBills),
      })

    case "payment-status":
      return NextResponse.json({
        success: true,
        data: generatePaymentStatusAnalysis(filteredBills),
      })

    case "billing-cycles":
      return NextResponse.json({
        success: true,
        data: generateBillingCycleAnalysis(filteredBills),
      })

    default:
      return NextResponse.json({
        success: true,
        data: {
          bills: filteredBills,
          summary: generateBillingSummary(filteredBills),
        },
      })
  }
}

function generateBillingSummary(bills: any[]) {
  const totalBills = bills.length
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const paidBills = bills.filter((b) => b.status === "paid")
  const pendingBills = bills.filter((b) => b.status === "pending")
  const overdueBills = bills.filter((b) => b.status === "overdue")

  const paidRevenue = paidBills.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const pendingRevenue = pendingBills.reduce((sum, bill) => sum + bill.totalAmount, 0)

  return {
    totalBills,
    totalRevenue,
    paidBills: paidBills.length,
    pendingBills: pendingBills.length,
    overdueBills: overdueBills.length,
    paidRevenue,
    pendingRevenue,
    collectionRate: totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0,
    avgBillAmount: totalBills > 0 ? Math.round((totalRevenue / totalBills) * 100) / 100 : 0,
  }
}

function generateRevenueAnalysis(bills: any[]) {
  const monthlyRevenue = bills.reduce((acc, bill) => {
    const month = new Date(bill.createdAt).toISOString().substring(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = {
        month,
        revenue: 0,
        bills: 0,
        paid: 0,
        pending: 0,
      }
    }

    acc[month].revenue += bill.totalAmount
    acc[month].bills++
    if (bill.status === "paid") acc[month].paid += bill.totalAmount
    if (bill.status === "pending") acc[month].pending += bill.totalAmount

    return acc
  }, {})

  return Object.values(monthlyRevenue).sort((a: any, b: any) => a.month.localeCompare(b.month))
}

function generatePaymentStatusAnalysis(bills: any[]) {
  const statusBreakdown = bills.reduce((acc, bill) => {
    acc[bill.status] = (acc[bill.status] || 0) + 1
    return acc
  }, {})

  const statusAmounts = bills.reduce((acc, bill) => {
    if (!acc[bill.status]) acc[bill.status] = 0
    acc[bill.status] += bill.totalAmount
    return acc
  }, {})

  return {
    statusBreakdown,
    statusAmounts,
  }
}

function generateBillingCycleAnalysis(bills: any[]) {
  const cycleBreakdown = bills.reduce((acc, bill) => {
    if (!acc[bill.billType]) {
      acc[bill.billType] = {
        type: bill.billType,
        count: 0,
        revenue: 0,
        avgAmount: 0,
      }
    }

    acc[bill.billType].count++
    acc[bill.billType].revenue += bill.totalAmount

    return acc
  }, {})

  // Calculate averages
  Object.values(cycleBreakdown).forEach((cycle: any) => {
    cycle.avgAmount = cycle.count > 0 ? Math.round((cycle.revenue / cycle.count) * 100) / 100 : 0
  })

  return Object.values(cycleBreakdown)
}
