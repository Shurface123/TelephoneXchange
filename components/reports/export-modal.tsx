"use client"

import { useState } from "react"
import { X, Download, FileText, FileSpreadsheet, File, Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExportModalProps {
  onClose: () => void
  reportType?: "calls" | "billing" | "maintenance" | "faults" | "all"
  data?: any
  stats?: any
  bills?: any[]
  faults?: any[]
  schedules?: any[]
  calls?: any[]
  departments?: { id: number; department_name: string }[]
}

const FORMAT_OPTIONS = [
  { value: "pdf",   label: "PDF",         Icon: FileText,       desc: "COCOBOD branded report with charts" },
  { value: "excel", label: "Excel (.xlsx)", Icon: FileSpreadsheet, desc: "Formatted spreadsheet with headers" },
  { value: "csv",   label: "CSV",          Icon: File,           desc: "Plain data, UTF-8 encoded" },
]

const REPORT_TYPES = [
  { value: "all",         label: "Full Report" },
  { value: "calls",       label: "Call Logs" },
  { value: "billing",     label: "Billing / Invoices" },
  { value: "maintenance", label: "Maintenance Schedules" },
  { value: "faults",      label: "Fault Reports" },
]

const COCOBOD_MAROON = "#722F37"
const COCOBOD_GOLD   = "#D4AF37"

export function ExportModal({
  onClose,
  reportType = "all",
  data,
  stats,
  bills = [],
  faults = [],
  schedules = [],
  calls = [],
  departments = [],
}: ExportModalProps) {
  const [format, setFormat] = useState("pdf")
  const [selectedType, setSelectedType] = useState(reportType)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      if (format === "pdf") await exportPDF()
      else if (format === "excel") await exportExcel()
      else exportCSV()
    } finally {
      setExporting(false)
      onClose()
    }
  }

  /* ── Shared helpers ── */
  const getFilteredBills = () => {
    let rows = [...bills]
    if (dateFrom) rows = rows.filter(b => b.billing_period_start >= dateFrom)
    if (dateTo)   rows = rows.filter(b => b.billing_period_end   <= dateTo)
    if (selectedDept) rows = rows.filter(b => String(b.department_id) === selectedDept)
    return rows
  }

  const getFilteredFaults = () => {
    let rows = [...faults]
    if (dateFrom) rows = rows.filter(f => f.reported_at?.slice(0, 10) >= dateFrom)
    if (dateTo)   rows = rows.filter(f => f.reported_at?.slice(0, 10) <= dateTo)
    if (selectedDept) rows = rows.filter(f => String(f.department_id) === selectedDept)
    return rows
  }

  const getFilteredSchedules = () => {
    let rows = [...schedules]
    if (dateFrom) rows = rows.filter(s => s.scheduled_date >= dateFrom)
    if (dateTo)   rows = rows.filter(s => s.scheduled_date <= dateTo)
    return rows
  }

  const getFilteredCalls = () => {
    let rows = [...calls]
    if (dateFrom) rows = rows.filter(c => c.created_at?.slice(0, 10) >= dateFrom)
    if (dateTo)   rows = rows.filter(c => c.created_at?.slice(0, 10) <= dateTo)
    if (selectedDept) rows = rows.filter(c => String(c.department_id) === selectedDept)
    return rows
  }

  const now = new Date()
  const genDate = now.toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  /* ── PDF Export ── */
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const PW = doc.internal.pageSize.getWidth()
    const PH = doc.internal.pageSize.getHeight()

    const addPage = () => {
      doc.addPage()
      drawHeader()
      drawFooter()
    }

    const drawHeader = () => {
      // Maroon header bar
      doc.setFillColor(114, 47, 55)
      doc.rect(0, 0, PW, 38, "F")
      // Gold accent line
      doc.setFillColor(212, 175, 55)
      doc.rect(0, 38, PW, 1.5, "F")

      // Logo circle (simplified)
      doc.setFillColor(44, 24, 16)
      doc.circle(18, 19, 12, "F")
      doc.setDrawColor(212, 175, 55)
      doc.setLineWidth(0.8)
      doc.circle(18, 19, 12, "S")

      // Logo text
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6)
      doc.setTextColor(212, 175, 55)
      doc.text("COCOBOD", 18, 18.5, { align: "center" })
      doc.setFontSize(5)
      doc.text("GCB", 18, 22, { align: "center" })

      // System title
      doc.setFont("helvetica", "bold")
      doc.setFontSize(15)
      doc.setTextColor(245, 230, 200)
      doc.text("CHED Exchange", 34, 14)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(212, 175, 55)
      doc.text("Ghana Cocoa Board · Telephone Exchange Management System", 34, 20)

      // Report title
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      const label = REPORT_TYPES.find(r => r.value === selectedType)?.label || "Full Report"
      doc.text(`${label} Report`, 34, 30)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(200, 180, 150)
      doc.text(`Generated: ${genDate}`, 34, 35.5)
    }

    const drawFooter = (pageNum?: number) => {
      const pg = pageNum ?? (doc as any).internal.getCurrentPageInfo().pageNumber
      doc.setFillColor(114, 47, 55)
      doc.rect(0, PH - 12, PW, 12, "F")
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(212, 175, 55)
      doc.text("COCOBOD CHED Exchange — Confidential", 10, PH - 4)
      doc.text(`Page ${pg}`, PW - 10, PH - 4, { align: "right" })
      doc.text(`Generated: ${now.toISOString().slice(0, 19).replace("T", " ")}`, PW / 2, PH - 4, { align: "center" })
    }

    drawHeader()
    drawFooter(1)

    let y = 50

    const sectionTitle = (title: string) => {
      if (y > PH - 60) { addPage(); y = 50 }
      doc.setFillColor(44, 24, 16)
      doc.rect(10, y - 5, PW - 20, 9, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(212, 175, 55)
      doc.text(title, 14, y + 1)
      y += 10
    }

    const tableHeader = (cols: string[], widths: number[]) => {
      doc.setFillColor(114, 47, 55)
      doc.rect(10, y, PW - 20, 7, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      let x = 12
      cols.forEach((col, i) => { doc.text(col, x, y + 5); x += widths[i] })
      y += 7
    }

    const tableRow = (values: string[], widths: number[], rowIdx: number) => {
      if (y > PH - 30) { addPage(); y = 50 }
      if (rowIdx % 2 === 0) { doc.setFillColor(253, 248, 240); doc.rect(10, y, PW - 20, 6.5, "F") }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(44, 24, 16)
      let x = 12
      values.forEach((val, i) => {
        const truncated = String(val).length > Math.floor(widths[i] / 2.2) ? String(val).slice(0, Math.floor(widths[i] / 2.2)) + "…" : String(val)
        doc.text(truncated, x, y + 4.5)
        x += widths[i]
      })
      y += 6.5
    }

    // Billing section
    if (["all", "billing"].includes(selectedType)) {
      sectionTitle("Billing & Invoices")
      const rows = getFilteredBills()
      if (rows.length) {
        tableHeader(["Invoice", "Account", "Department", "Period", "Calls", "Total (GHS)", "Status"], [30, 35, 30, 35, 12, 24, 18])
        rows.forEach((b, i) => tableRow([
          b.invoice_number || "—", b.account_name || "—",
          b.department_name || "—",
          `${b.billing_period_start?.slice(0, 7) || ""}`,
          String(b.total_calls || 0),
          Number(b.total_amount || 0).toFixed(2),
          b.bill_status || "—"
        ], [30, 35, 30, 35, 12, 24, 18], i))
        // Summary
        const total = rows.reduce((s, b) => s + Number(b.total_amount || 0), 0)
        y += 3
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7.5)
        doc.setTextColor(114, 47, 55)
        doc.text(`Total: GHS ${total.toLocaleString("en-GH", { minimumFractionDigits: 2 })} across ${rows.length} invoices`, PW - 12, y, { align: "right" })
        y += 8
      } else {
        doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 120, 100)
        doc.text("No billing records found for the selected filters.", 14, y); y += 10
      }
    }

    // Faults section
    if (["all", "faults"].includes(selectedType)) {
      sectionTitle("Fault Reports")
      const rows = getFilteredFaults()
      if (rows.length) {
        tableHeader(["Reference", "Description", "Severity", "Status", "Reported"], [28, 65, 18, 22, 25])
        rows.forEach((f, i) => tableRow([
          f.fault_reference || "—",
          f.fault_description || "—",
          f.fault_severity || "—",
          f.fault_status || "—",
          f.reported_at?.slice(0, 10) || "—"
        ], [28, 65, 18, 22, 25], i))
        y += 8
      } else {
        doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 120, 100)
        doc.text("No fault reports found.", 14, y); y += 10
      }
    }

    // Maintenance section
    if (["all", "maintenance"].includes(selectedType)) {
      sectionTitle("Maintenance Schedules")
      const rows = getFilteredSchedules()
      if (rows.length) {
        tableHeader(["Reference", "Description", "Type", "Date", "Status"], [28, 70, 22, 22, 22])
        rows.forEach((s, i) => tableRow([
          s.schedule_reference || "—",
          s.maintenance_description || "—",
          s.maintenance_type || "—",
          s.scheduled_date || "—",
          s.maintenance_status || "—"
        ], [28, 70, 22, 22, 22], i))
        y += 8
      }
    }

    doc.save(`CHED-Exchange-${selectedType}-${now.toISOString().split("T")[0]}.pdf`)
  }

  /* ── Excel Export ── */
  const exportExcel = async () => {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    const brandRow = (text: string) => ([text, "", "", "", "", "", "", ""])
    const emptyRow = () => (["", "", "", "", "", "", "", ""])

    if (["all", "billing"].includes(selectedType)) {
      const rows = getFilteredBills()
      const data: any[][] = [
        brandRow("CHED Exchange — Ghana Cocoa Board"),
        brandRow(`Billing Report · Generated: ${genDate}`),
        emptyRow(),
        ["Invoice #", "Account", "Department", "Period Start", "Period End", "Total Calls", "Total (GHS)", "Status"],
        ...rows.map(b => [
          b.invoice_number, b.account_name, b.department_name || "—",
          b.billing_period_start, b.billing_period_end,
          b.total_calls || 0,
          Number(b.total_amount || 0).toFixed(2),
          b.bill_status
        ]),
        emptyRow(),
        ["TOTAL", "", "", "", "", rows.reduce((s, b) => s + Number(b.total_calls || 0), 0),
          rows.reduce((s, b) => s + Number(b.total_amount || 0), 0).toFixed(2), ""],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws, "Billing")
    }

    if (["all", "faults"].includes(selectedType)) {
      const rows = getFilteredFaults()
      const data: any[][] = [
        brandRow("CHED Exchange — Fault Reports"),
        brandRow(`Generated: ${genDate}`),
        emptyRow(),
        ["Reference", "Description", "Fault Type", "Category", "Severity", "Status", "Reported By", "Date"],
        ...rows.map(f => [
          f.fault_reference, f.fault_description, f.fault_type, f.fault_category,
          f.fault_severity, f.fault_status, f.reported_by_name || "—", f.reported_at?.slice(0, 10) || "—"
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, "Fault Reports")
    }

    if (["all", "maintenance"].includes(selectedType)) {
      const rows = getFilteredSchedules()
      const data: any[][] = [
        brandRow("CHED Exchange — Maintenance Schedules"),
        brandRow(`Generated: ${genDate}`),
        emptyRow(),
        ["Reference", "Description", "Type", "Scheduled Date", "Time", "Est. Duration (min)", "Technician", "Status"],
        ...rows.map(s => [
          s.schedule_reference, s.maintenance_description, s.maintenance_type,
          s.scheduled_date, s.scheduled_time?.slice(0, 5) || "—",
          s.estimated_duration || "—", s.technician_name || "—", s.maintenance_status
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 22 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, "Maintenance")
    }

    XLSX.writeFile(wb, `CHED-Exchange-${selectedType}-${now.toISOString().split("T")[0]}.xlsx`)
  }

  /* ── CSV Export ── */
  const exportCSV = () => {
    let rows: string[][] = []
    let filename = `CHED-${selectedType}`

    if (["billing", "all"].includes(selectedType)) {
      rows = [
        ["Invoice #", "Account", "Department", "Period Start", "Period End", "Total Calls", "Total (GHS)", "Status", "Due Date", "Paid Date"],
        ...getFilteredBills().map(b => [
          b.invoice_number, b.account_name, b.department_name || "",
          b.billing_period_start, b.billing_period_end,
          String(b.total_calls || 0), Number(b.total_amount || 0).toFixed(2),
          b.bill_status, b.due_date || "", b.paid_date || ""
        ])
      ]
    } else if (selectedType === "faults") {
      rows = [
        ["Reference", "Description", "Fault Type", "Category", "Severity", "Status", "Reported By", "Date"],
        ...getFilteredFaults().map(f => [
          f.fault_reference, f.fault_description, f.fault_type, f.fault_category,
          f.fault_severity, f.fault_status, f.reported_by_name || "", f.reported_at?.slice(0, 10) || ""
        ])
      ]
    } else if (selectedType === "maintenance") {
      rows = [
        ["Reference", "Description", "Type", "Date", "Technician", "Status"],
        ...getFilteredSchedules().map(s => [
          s.schedule_reference, s.maintenance_description, s.maintenance_type,
          s.scheduled_date, s.technician_name || "", s.maintenance_status
        ])
      ]
    }

    const BOM = "\uFEFF"
    const csv = BOM + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${filename}-${now.toISOString().split("T")[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #722F37, #8B1A1A)" }}>
          <div>
            <h3 className="font-bold text-white text-sm">Export Report</h3>
            <p className="text-xs mt-0.5" style={{ color: "#D4AF37" }}>Choose format and filters</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format selector */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block uppercase tracking-wider">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(({ value, label, Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    format === value
                      ? "border-[#722F37] bg-[#722F37]/5 dark:bg-[#722F37]/10"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${format === value ? "text-[#722F37]" : "text-gray-400"}`} />
                  <span className={`text-xs font-semibold ${format === value ? "text-[#722F37]" : "text-gray-600 dark:text-gray-400"}`}>{label}</span>
                  <span className="text-[9px] text-gray-400 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block uppercase tracking-wider">
              Report Type
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/30 transition-all"
            >
              {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5 inline mr-1" />Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/30" />
              </div>
            </div>
          </div>

          {/* Department filter */}
          {departments.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block uppercase tracking-wider">
                Department Filter
              </label>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/30">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={String(d.id)}>{d.department_name}</option>)}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
              style={{ background: "linear-gradient(135deg, #722F37, #8B1A1A)", boxShadow: "0 4px 12px rgba(114,47,55,0.3)" }}
            >
              {exporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                : <><Download className="h-4 w-4" /> Export {format.toUpperCase()}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
