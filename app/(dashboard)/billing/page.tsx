"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  DollarSign, Search, RefreshCw, ChevronLeft, ChevronRight,
  Download, CheckCircle2, Clock, AlertTriangle, FileText, Plus
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500",
}

export default function BillingPage() {
  const { toast } = useToast()
  const [bills, setBills] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const limit = 15

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (statusFilter) params.set("status", statusFilter)
      const [billsRes, statsRes] = await Promise.all([
        fetch(`/api/billing?${params}`),
        fetch("/api/billing/stats"),
      ])
      if (billsRes.ok) { const d = await billsRes.json(); setBills(d.bills); setTotal(d.total) }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const markAsPaid = async (billId: number) => {
    setUpdatingId(billId)
    const res = await fetch(`/api/billing/${billId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billStatus: "paid", paymentMethod: "Bank Transfer" }),
    })
    if (res.ok) {
      toast({ title: "Bill marked as paid" })
      fetchData()
    } else {
      toast({ title: "Error", description: "Failed to update bill", variant: "destructive" })
    }
    setUpdatingId(null)
  }

  const filteredBills = search
    ? bills.filter(b => `${b.invoice_number} ${b.account_name} ${b.department_name}`.toLowerCase().includes(search.toLowerCase()))
    : bills

  const totalPages = Math.ceil(total / limit)

  const exportCSV = () => {
    const headers = ["Invoice", "Account", "Department", "Period", "Total (GHS)", "Status", "Due Date", "Paid Date"]
    const rows = filteredBills.map(b => [
      b.invoice_number, b.account_name, b.department_name || "",
      `${b.billing_period_start} to ${b.billing_period_end}`,
      Number(b.total_amount).toFixed(2), b.bill_status,
      b.due_date || "", b.paid_date || ""
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `billing-${new Date().toISOString().split("T")[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Billing data exported as CSV" })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-sm text-muted-foreground">{total} invoices total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `GHS ${Number(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "border-l-green-500" },
          { label: "Pending", value: `GHS ${Number(stats?.pendingAmount ?? 0).toLocaleString()}`, icon: Clock, color: "border-l-yellow-500" },
          { label: "Overdue", value: `${stats?.overdueCount ?? 0} bills`, icon: AlertTriangle, color: "border-l-red-500" },
          { label: "Drafts", value: `${stats?.draftCount ?? 0} bills`, icon: FileText, color: "border-l-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, account..." className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", "draft", "sent", "pending", "paid", "overdue"].map(s => (
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
                  {["Invoice", "Account", "Department", "Period", "Calls", "Total (GHS)", "Status", "Due Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">No bills found</td></tr>
                ) : filteredBills.map((bill: any) => (
                  <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">{bill.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap max-w-[160px] truncate">{bill.account_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{bill.department_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {bill.billing_period_start} → {bill.billing_period_end}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-center">{bill.total_calls}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {Number(bill.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[bill.bill_status] || "bg-gray-100"}`}>
                        {bill.bill_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString("en-GH") : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {["pending", "sent", "overdue"].includes(bill.bill_status) && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(bill.id)}
                          disabled={updatingId === bill.id} className="h-7 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" /> Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</p>
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
