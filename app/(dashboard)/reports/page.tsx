"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/hooks/use-toast"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts"
import { Download, RefreshCw, TrendingUp, Phone, DollarSign, Wrench } from "lucide-react"

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function ReportsPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [billingStats, setBillingStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("7")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, billingRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/billing/stats"),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (billingRes.ok) setBillingStats(await billingRes.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const callVolumeData = stats?.callVolume?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }),
    total: d.total, completed: d.completed, missed: d.missed,
  })) || []

  const revenueData = billingStats?.monthlyRevenue?.map((d: any) => ({
    month: d.month, revenue: parseFloat(d.revenue || 0),
  })) || []

  const callStatusData = stats ? [
    { name: "Completed", value: stats.calls.completedToday },
    { name: "Active", value: stats.calls.active },
    { name: "Missed", value: stats.calls.missedToday },
  ].filter(d => d.value > 0) : []

  const stationData = stats?.stations ? [
    { name: "Active", value: stats.stations.active },
    { name: "Maintenance", value: stats.stations.maintenance },
    { name: "Faulty", value: stats.stations.faulty },
  ].filter(d => d.value > 0) : []

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      calls: stats?.calls,
      billing: { ...billingStats, monthlyRevenue: billingStats?.monthlyRevenue },
      maintenance: stats?.maintenance,
      stations: stats?.stations,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `report-${new Date().toISOString().split("T")[0]}.json`; a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Report exported" })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">System performance overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportReport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Calls", value: stats?.calls?.today ?? 0, sub: `${stats?.calls?.completionRate ?? 0}% completion`, icon: Phone, color: "text-blue-600" },
          { label: "Month Revenue", value: `GHS ${Number(billingStats?.monthRevenue ?? 0).toLocaleString()}`, sub: `${billingStats?.pendingCount ?? 0} pending`, icon: DollarSign, color: "text-green-600" },
          { label: "Open Faults", value: stats?.maintenance?.openFaults ?? 0, sub: `${stats?.maintenance?.criticalFaults ?? 0} critical`, icon: Wrench, color: "text-orange-600" },
          { label: "Station Uptime", value: stats?.stations ? `${Math.round((stats.stations.active / stats.stations.total) * 100)}%` : "—", sub: `${stats?.stations?.active ?? 0} of ${stats?.stations?.total ?? 0} active`, icon: TrendingUp, color: "text-purple-600" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color} flex-shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Call Volume — Last 7 Days</CardTitle>
            <CardDescription>Completed vs missed calls per day</CardDescription>
          </CardHeader>
          <CardContent>
            {callVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={callVolumeData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Trend (GHS)</CardTitle>
            <CardDescription>Monthly billing revenue collected</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`GHS ${Number(v).toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
            )}
          </CardContent>
        </Card>

        {/* Call Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Today's Call Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {callStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={callStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {callStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No calls today</div>
            )}
          </CardContent>
        </Card>

        {/* Station Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Station Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {stationData.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[2], COLORS[3]][i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No station data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
