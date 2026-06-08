"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  DollarSign, Search, RefreshCw, ChevronLeft, ChevronRight,
  Download, CheckCircle2, Clock, AlertTriangle, FileText, Plus, X, Loader2
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [bills, setBills] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const limit = 15

  // Generate Invoice Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [submittingInvoice, setSubmittingInvoice] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    departmentId: "",
    accountName: "",
    accountNumber: "",
    periodStart: "",
    periodEnd: "",
    billTypeId: "7",
    notes: ""
  })

  // Fetch Session user
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setCurrentUser(data))
      .catch(() => {})
  }, [])

  // Fetch Departments
  useEffect(() => {
    fetch("/api/departments")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setDepartments(data.departments || [])
      })
      .catch(() => {})
  }, [])

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

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.departmentId || !invoiceForm.accountName || !invoiceForm.periodStart || !invoiceForm.periodEnd) {
      toast({ title: "Validation error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }
    setSubmittingInvoice(true)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: invoiceForm.accountName,
          accountNumber: invoiceForm.accountNumber,
          billTypeId: parseInt(invoiceForm.billTypeId),
          departmentId: parseInt(invoiceForm.departmentId),
          periodStart: invoiceForm.periodStart,
          periodEnd: invoiceForm.periodEnd,
          notes: invoiceForm.notes
        })
      })
      if (res.ok) {
        toast({ title: "Invoice generated", description: "The draft bill has been successfully generated." })
        setShowGenerateModal(false)
        setInvoiceForm({
          departmentId: "",
          accountName: "",
          accountNumber: "",
          periodStart: "",
          periodEnd: "",
          billTypeId: "7",
          notes: ""
        })
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: "Failed to generate invoice", description: err.error || "Server error", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to billing service", variant: "destructive" })
    } finally {
      setSubmittingInvoice(false)
    }
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

  const canManage = currentUser && ["admin", "manager"].includes(currentUser.role)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground">{total} invoices total</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="bg-[#722F37] hover:bg-[#8B1A1A] text-white gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Generate Invoice
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `GHS ${Number(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "border-l-[#2D5016]" },
          { label: "Pending", value: `GHS ${Number(stats?.pendingAmount ?? 0).toLocaleString()}`, icon: Clock, color: "border-l-[#D4AF37]" },
          { label: "Overdue", value: `${stats?.overdueCount ?? 0} bills`, icon: AlertTriangle, color: "border-l-[#8B1A1A]" },
          { label: "Drafts", value: `${stats?.draftCount ?? 0} bills`, icon: FileText, color: "border-l-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color} shadow-sm`}>
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, account..." className="pl-9 text-xs" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["", "draft", "sent", "pending", "paid", "overdue"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${
                statusFilter === s ? "bg-[#722F37] text-white" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200"
              }`}>
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  {["Invoice", "Account", "Department", "Period", "Calls", "Total (GHS)", "Status", "Due Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap max-w-[160px] truncate">{bill.account_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{bill.department_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {bill.billing_period_start} → {bill.billing_period_end}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-center">{bill.total_calls}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {Number(bill.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[bill.bill_status] || "bg-gray-100"}`}>
                        {bill.bill_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString("en-GH") : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {["pending", "sent", "overdue"].includes(bill.bill_status) && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(bill.id)}
                          disabled={updatingId === bill.id} className="h-7 text-xs gap-1 font-semibold">
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

      {/* GENERATE INVOICE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-border/40 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #722F37, #8B1A1A)" }}>
              <div>
                <h3 className="font-bold text-white text-sm">Generate Call Invoice</h3>
                <p className="text-[11px]" style={{ color: "#D4AF37" }}>Calculate and draft call charges for department</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Department *</label>
                <select
                  value={invoiceForm.departmentId}
                  onChange={e => {
                    const dept = departments.find(d => String(d.id) === e.target.value)
                    setInvoiceForm(f => ({
                      ...f,
                      departmentId: e.target.value,
                      accountName: dept ? `${dept.department_name} Dept` : f.accountName,
                      accountNumber: dept ? `ACC-${dept.department_code}-${String(Date.now()).slice(-3)}` : f.accountNumber
                    }))
                  }}
                  required
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name} ({d.department_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Account Name *</label>
                  <Input
                    value={invoiceForm.accountName}
                    onChange={e => setInvoiceForm(f => ({ ...f, accountName: e.target.value }))}
                    placeholder="e.g. HR Dept"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Account Number</label>
                  <Input
                    value={invoiceForm.accountNumber}
                    onChange={e => setInvoiceForm(f => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="e.g. ACC-HR-101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Start Date *</label>
                  <input
                    type="date"
                    value={invoiceForm.periodStart}
                    onChange={e => setInvoiceForm(f => ({ ...f, periodStart: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">End Date *</label>
                  <input
                    type="date"
                    value={invoiceForm.periodEnd}
                    onChange={e => setInvoiceForm(f => ({ ...f, periodEnd: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Billing Period Type</label>
                  <select
                    value={invoiceForm.billTypeId}
                    onChange={e => setInvoiceForm(f => ({ ...f, billTypeId: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  >
                    <option value="5">Daily</option>
                    <option value="6">Weekly</option>
                    <option value="7">Monthly</option>
                    <option value="8">Annually</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional invoice details or description..."
                  className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="bg-[#722F37] hover:bg-[#8B1A1A] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
                  style={{ boxShadow: "0 4px 12px rgba(114,47,55,0.3)" }}
                >
                  {submittingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Generate Draft</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
