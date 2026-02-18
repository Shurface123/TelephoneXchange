"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Phone, DollarSign, Wrench, AlertTriangle, TrendingUp, Clock,
  CheckCircle2, XCircle, RefreshCw, PhoneCall, FileText, Calendar
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import Link from "next/link"

interface DashboardStats {
  calls: { active: number; today: number; completedToday: number; completionRate: number; followUpsDue: number }
  billing: { pendingCount: number; pendingAmount: number; todayRevenue: number; monthRevenue: number }
  maintenance: { openFaults: number; criticalFaults: number; upcomingMaintenance: number }
  stations: { total: number; active: number; faulty: number; maintenance: number }
  recentCalls: any[]
  callVolume: any[]
}

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  connected: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  missed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchStats])

  const chartData = stats?.callVolume.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en-GH", { weekday: "short" }),
    total: d.total,
    completed: d.completed,
    missed: d.missed,
  })) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CHED Telephone Exchange · Real-time overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Calls</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats?.calls.active ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.calls.today ?? 0} calls today</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <PhoneCall className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            {(stats?.calls.active ?? 0) > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Live</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats?.calls.completionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.calls.completedToday ?? 0} completed today</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${stats?.calls.completionRate ?? 0}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Bills</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">GHS {Number(stats?.billing.pendingAmount ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.billing.pendingCount ?? 0} bills pending</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Faults</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats?.maintenance.openFaults ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats?.maintenance.criticalFaults ?? 0) > 0
                    ? <span className="text-red-500 font-medium">{stats?.maintenance.criticalFaults} critical</span>
                    : "No critical issues"}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Month Revenue", value: `GHS ${Number(stats?.billing.monthRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Follow-ups Due", value: stats?.calls.followUpsDue ?? 0, icon: Clock, color: "text-orange-600" },
          { label: "Upcoming Maintenance", value: stats?.maintenance.upcomingMaintenance ?? 0, icon: Calendar, color: "text-blue-600" },
          { label: "Active Stations", value: `${stats?.stations.active ?? 0} / ${stats?.stations.total ?? 0}`, icon: Phone, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Call Volume — Last 7 Days</CardTitle>
            <CardDescription>Daily breakdown of completed vs missed calls</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No call data for the last 7 days
              </div>
            )}
          </CardContent>
        </Card>

        {/* Station Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Station Health</CardTitle>
            <CardDescription>Equipment status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Active", count: stats?.stations.active ?? 0, total: stats?.stations.total ?? 1, color: "bg-green-500" },
              { label: "Maintenance", count: stats?.stations.maintenance ?? 0, total: stats?.stations.total ?? 1, color: "bg-yellow-500" },
              { label: "Faulty", count: stats?.stations.faulty ?? 0, total: stats?.stations.total ?? 1, color: "bg-red-500" },
            ].map(({ label, count, total, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Total: {stats?.stations.total ?? 0} stations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Calls</CardTitle>
            <CardDescription>Latest call activity across all departments</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/calls">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Caller</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(stats?.recentCalls ?? []).map((call: any) => (
                  <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{call.call_reference}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{call.caller_name}</div>
                      <div className="text-xs text-muted-foreground">{call.caller_phone}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{call.department_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[call.call_status] || "bg-gray-100 text-gray-800"}`}>
                        {call.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${priorityColors[call.priority] || "bg-gray-400"}`} />
                        <span className="text-xs capitalize text-muted-foreground">{call.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentCalls || stats.recentCalls.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No calls recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/receptionist", label: "Log New Call", icon: PhoneCall, color: "bg-blue-600 hover:bg-blue-700" },
              { href: "/billing", label: "Generate Bill", icon: FileText, color: "bg-green-600 hover:bg-green-700" },
              { href: "/maintenance", label: "Report Fault", icon: Wrench, color: "bg-orange-600 hover:bg-orange-700" },
              { href: "/reports", label: "View Reports", icon: TrendingUp, color: "bg-purple-600 hover:bg-purple-700" },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <div className={`${color} text-white rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
