"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/hooks/use-toast"
import {
  Phone, PhoneCall, DollarSign, Activity, Wrench, ShieldAlert,
  Users, CheckCircle, Calendar, Building2, Download, RefreshCw,
  TrendingUp, Clock, ArrowUpRight
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell
} from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]

export default function ManagerDashboard() {
  const { toast } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/manager/stats")
      if (res.ok) {
        const stats = await res.json()
        setData(stats)
      } else {
        toast({ title: "Failed to fetch stats", variant: "destructive" })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    setIsMounted(true)
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const handleExportCSV = () => {
    if (!data) return
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Metric,Value\n"
    csvContent += `Total Call Volumes,${data.calls?.total}\n`
    csvContent += `Calls This Month,${data.calls?.thisMonth}\n`
    csvContent += `Call Completion Rate,${data.calls?.completionRate}%\n`
    csvContent += `Total Revenue (Paid),GHS ${data.billing?.totalRevenue}\n`
    csvContent += `Overdue Invoices Count,${data.billing?.overdueCount}\n`
    csvContent += `Overdue Invoices Amount,GHS ${data.billing?.overdueAmount}\n`
    csvContent += `Pending Invoices Count,${data.billing?.pendingCount}\n`
    csvContent += `Pending Invoices Amount,GHS ${data.billing?.pendingAmount}\n`
    csvContent += `Active Open Faults,${data.faults?.open}\n`
    csvContent += `Resolved Faults Count,${data.faults?.resolved}\n`
    csvContent += `Average Fault Resolution,${data.faults?.avgResolutionHours} hours\n`
    csvContent += `Total Active Stations,${data.stations?.active}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `CHED_Exchange_Management_Report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: "Report Exported", description: "Manager executive summary CSV downloaded successfully." })
  }

  if (loading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Generating real-time executive report...</p>
        </div>
      </div>
    )
  }

  // Pre-process charts datasets safely
  const formattedCallVolume = data.calls?.volume30Days?.map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-GH", { month: "short", day: "numeric" })
  })) || []

  const formattedMonthlyRevenue = [...(data.billing?.monthlyTrend || [])].reverse().map((d: any) => ({
    ...d,
    month: new Date(d.month + "-02").toLocaleDateString("en-GH", { month: "short", year: "2-digit" })
  }))

  const severityPieData = data.faults?.bySeverity?.map((s: any) => ({
    name: `${s.fault_severity.toUpperCase()} (${s.fault_status})`,
    value: s.count
  })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" /> Executive Manager Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Comprehensive system-wide call traffic, billing audits, and maintenance operational KPIs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10">
            <Download className="h-4 w-4" /> Export Report
          </Button>
          <Button variant="outline" onClick={fetchStats} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Grid Cards Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Call Volumes */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Phone className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Calls Logged</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data.calls?.total}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                <span className="text-green-600 font-bold">{data.calls?.thisMonth}</span> this month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Revenue collected */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Paid Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₵{parseFloat(data.billing?.totalRevenue).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                ₵{parseFloat(data.billing?.thisMonthRevenue).toLocaleString("en-GH")} paid this month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System faults */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Faults</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data.faults?.open}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                Avg. resolution time <span className="text-rose-600 font-bold">{data.faults?.avgResolutionHours}h</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Station statistics */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Desk Stations</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data.stations?.active ?? 0} <span className="text-sm text-muted-foreground">/ {data.stations?.total ?? 0}</span></h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {data.stations?.faulty ?? 0} faulty · {data.stations?.maintenance ?? 0} in repair
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main interactive charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Call volumes graph */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">30-Day Exchange Call Traffic</CardTitle>
            <CardDescription>Daily breakdown of completed and missed calls across the exchange</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-80 w-full">
              {isMounted && formattedCallVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedCallVolume}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="missed" name="Missed/Dropped" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No recent call traffic to graph
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Departmental breakdowns */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Traffic By Department</CardTitle>
            <CardDescription>Share of logged calls across departments</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col justify-between items-center h-80">
            <div className="h-60 w-full">
              {isMounted && data.calls?.byDept?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.calls.byDept}
                      dataKey="call_count"
                      nameKey="department_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      fill="#8884d8"
                      labelLine={false}
                    >
                      {data.calls.byDept.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No department statistics
                </div>
              )}
            </div>
            {/* Custom Pie Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center max-h-[70px] overflow-y-auto w-full px-2">
              {data.calls?.byDept?.slice(0, 4).map((entry: any, index: number) => (
                <div key={entry.department_name} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate max-w-[100px] font-medium text-foreground/80">{entry.department_name} ({entry.call_count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Billing revenue & unpaid billing */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Unpaid Billing Liability</CardTitle>
            <CardDescription>Executive overview of unpaid outstanding bills</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50/40 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Pending (Outstanding)</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">₵{parseFloat(data.billing?.pendingAmount).toLocaleString("en-GH")}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.billing?.pendingCount} unpaid bills</p>
              </div>
              <div className="bg-red-50/40 dark:bg-red-950/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 tracking-wider">Overdue (Critical)</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">₵{parseFloat(data.billing?.overdueAmount).toLocaleString("en-GH")}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.billing?.overdueCount} critical bills</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Call Completion Rate</span>
                <span className="font-bold">{data.calls?.completionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${data.calls?.completionRate || 0}%` }} />
              </div>
            </div>

            {/* Monthly bill billing trend list */}
            <div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">Recent Monthly Revenue</span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto">
                {formattedMonthlyRevenue.slice(0, 3).map((trend: any) => (
                  <div key={trend.month} className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50 dark:bg-muted/30 border border-gray-100 dark:border-border/40 text-xs">
                    <span className="font-medium text-foreground/80">{trend.month}</span>
                    <span className="font-bold text-emerald-600">₵{parseFloat(trend.revenue).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Center: System Faults Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Fault & System Reliability</CardTitle>
            <CardDescription>Status and severity overview of system repairs</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col justify-between h-80">
            <div className="h-44 w-full">
              {isMounted && severityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      fill="#82ca9d"
                    >
                      {severityPieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No registered active faults
                </div>
              )}
            </div>
            {/* Custom donut legend */}
            <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center max-h-[70px] overflow-y-auto w-full">
              {severityPieData.map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[9px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} />
                  <span className="truncate max-w-[120px] font-medium text-foreground/80">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Security & Operational Audit Log Feed */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Live System Audit Feed</CardTitle>
              <CardDescription>Security and administrative operational trail</CardDescription>
            </div>
            <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-150 uppercase tracking-widest text-[9px]">Live</Badge>
          </CardHeader>
          <CardContent className="pt-4 px-2">
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 divide-y divide-border/40">
              {data.recentActivity?.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12">
                  No recent admin operations logged
                </div>
              ) : (
                data.recentActivity?.map((log: any, idx: number) => (
                  <div key={log.id} className={`pt-2.5 first:pt-0 text-[11px] flex justify-between gap-3 items-start`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground/90">{log.user_name || "System"}</span>
                        <span className="text-[10px] px-1 py-0.2 bg-muted rounded font-mono font-bold text-muted-foreground uppercase">{log.action}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate max-w-[180px]">Table: {log.table_name} · ID: {log.record_id}</p>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
