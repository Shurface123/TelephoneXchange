"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  Phone, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  PhoneCall, PhoneMissed, CheckCircle2, Clock, Download
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  connected: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  missed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500"
}

function formatDuration(secs: number) {
  if (!secs) return "—"
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}m ${s}s`
}

export default function CallsPage() {
  const { toast } = useToast()
  const [calls, setCalls] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const limit = 15

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/calls?${params}`)
      if (res.ok) {
        const d = await res.json()
        setCalls(d.calls)
        setTotal(d.total)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  const filteredCalls = search
    ? calls.filter(c => `${c.caller_name} ${c.caller_phone} ${c.call_reference} ${c.department_name}`.toLowerCase().includes(search.toLowerCase()))
    : calls

  const totalPages = Math.ceil(total / limit)

  const exportCSV = () => {
    const headers = ["Reference", "Caller", "Phone", "Department", "Status", "Priority", "Duration", "Date"]
    const rows = filteredCalls.map(c => [
      c.call_reference, c.caller_name, c.caller_phone, c.department_name || "",
      c.call_status, c.priority, formatDuration(c.duration_seconds),
      new Date(c.created_at).toLocaleString("en-GH")
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `calls-${new Date().toISOString().split("T")[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Call log exported as CSV" })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Log</h1>
          <p className="text-sm text-muted-foreground">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCalls} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search caller, phone, reference..." className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", "connected", "pending", "completed", "missed", "transferred"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200"}`}>
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  {["Reference", "Caller", "Phone", "Department", "Type", "Status", "Priority", "Duration", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></td></tr>
                ) : filteredCalls.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">No calls found</td></tr>
                ) : filteredCalls.map((call: any) => (
                  <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">{call.call_reference}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{call.caller_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{call.caller_phone}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{call.department_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{call.call_type_name || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[call.call_status] || "bg-gray-100 text-gray-800"}`}>
                        {call.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[call.priority] || "bg-gray-400"}`} />
                        <span className="text-xs capitalize text-muted-foreground">{call.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(call.created_at).toLocaleString("en-GH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
