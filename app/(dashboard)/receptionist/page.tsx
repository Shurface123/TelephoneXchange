"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  Phone, PhoneCall, PhoneOff, PhoneMissed, Search, Plus, Clock,
  RefreshCw, User, Building2, AlertCircle, CheckCircle2, ChevronRight, Bell, X
} from "lucide-react"

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
}

function CallTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = new Date(startTime).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime])
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0")
  const s = (elapsed % 60).toString().padStart(2, "0")
  return <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{m}:{s}</span>
}

export default function ReceptionistPage() {
  const { toast } = useToast()
  const [activeCallsData, setActiveCallsData] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [transferring, setTransferring] = useState(false)
  
  // Call transfer states
  const [transferCallId, setTransferCallId] = useState<number | null>(null)
  const [transferDeptId, setTransferDeptId] = useState("")
  const [transferUserId, setTransferUserId] = useState("")
  const [transferReason, setTransferReason] = useState("")
  const [transferNotes, setTransferNotes] = useState("")

  const [contactSearch, setContactSearch] = useState("")
  const [contactResults, setContactResults] = useState<any[]>([])
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout>()

  const [form, setForm] = useState({
    callerName: "", callerPhone: "", callTypeId: "2",
    departmentId: "", callReason: "", priority: "medium", contactId: ""
  })

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, deptRes, followRes, usersRes] = await Promise.all([
        fetch("/api/calls/stats"),
        fetch("/api/departments"),
        fetch("/api/calls?status=completed&limit=50"),
        fetch("/api/users"),
      ])
      if (statsRes.ok) setActiveCallsData(await statsRes.json())
      if (deptRes.ok) { const d = await deptRes.json(); setDepartments(d.departments) }
      if (usersRes.ok) { const d = await usersRes.json(); setUsersList(d.users || []) }
      if (followRes.ok) {
        const d = await followRes.json()
        const today = new Date().toISOString().split("T")[0]
        setFollowUps(d.calls.filter((c: any) => c.follow_up_required && c.follow_up_date <= today).slice(0, 5))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferCallId) return
    setTransferring(true)
    try {
      const callObj = activeCallsData?.activeCallsList?.find((c: any) => c.id === transferCallId)
      const empObj = usersList.find((u: any) => u.id === parseInt(transferUserId))

      const res = await fetch("/api/calls/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: transferCallId,
          fromDepartmentId: callObj?.department_id || null,
          fromEmployeeId: null,
          toDepartmentId: parseInt(transferDeptId) || null,
          toEmployeeId: empObj?.employee_id || null,
          transferReason,
          transferNotes
        })
      })
      if (res.ok) {
        toast({ title: "Call transferred", description: "The call has been successfully routed." })
        setTransferCallId(null)
        setTransferDeptId("")
        setTransferUserId("")
        setTransferReason("")
        setTransferNotes("")
        fetchData()
      } else {
        const d = await res.json()
        toast({ title: "Transfer failed", description: d.error || "Failed to transfer call", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "An error occurred during transfer", variant: "destructive" })
    } finally {
      setTransferring(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Caller auto-lookup
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (contactSearch.length < 3) { setContactResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts?phone=${encodeURIComponent(contactSearch)}&name=${encodeURIComponent(contactSearch)}&limit=5`)
      if (res.ok) { const d = await res.json(); setContactResults(d.contacts); setShowContactDropdown(true) }
    }, 300)
  }, [contactSearch])

  const selectContact = (contact: any) => {
    setForm(f => ({ ...f, callerName: contact.name, callerPhone: contact.phone, contactId: contact.id.toString() }))
    setContactSearch(contact.phone)
    setShowContactDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.callerName || !form.callerPhone) {
      toast({ title: "Missing fields", description: "Caller name and phone are required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: "Call logged", description: `Call recorded successfully` })
        setForm({ callerName: "", callerPhone: "", callTypeId: "2", departmentId: "", callReason: "", priority: "medium", contactId: "" })
        setContactSearch("")
        fetchData()
      } else {
        const d = await res.json()
        toast({ title: "Error", description: d.error, variant: "destructive" })
      }
    } catch { toast({ title: "Error", description: "Failed to log call", variant: "destructive" }) }
    finally { setSubmitting(false) }
  }

  const endCall = async (callId: number) => {
    const duration = Math.floor((Date.now() - new Date(activeCallsData?.activeCallsList?.find((c: any) => c.id === callId)?.start_time).getTime()) / 1000)
    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callStatus: "completed", endTime: new Date().toISOString(), durationSeconds: duration }),
    })
    toast({ title: "Call ended", description: "Call marked as completed" })
    fetchData()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reception</h1>
          <p className="text-sm text-muted-foreground">Log calls, manage active lines, track follow-ups</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active", value: activeCallsData?.activeCalls ?? 0, icon: PhoneCall, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
          { label: "Today", value: activeCallsData?.todayCalls ?? 0, icon: Phone, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
          { label: "Missed", value: activeCallsData?.missedToday ?? 0, icon: PhoneMissed, color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
          { label: "Follow-ups", value: followUps.length, icon: Bell, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className={`p-4 flex items-center gap-3 ${color} rounded-lg`}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Call Intake Form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" /> Log New Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Caller lookup */}
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Search Caller (Phone/Name)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    placeholder="Search by phone or name..."
                    className="pl-9"
                  />
                </div>
                {showContactDropdown && contactResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border rounded-lg shadow-xl">
                    {contactResults.map((c: any) => (
                      <button key={c.id} type="button" onClick={() => selectContact(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b last:border-0">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone} · {c.company || c.contact_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Caller Name *</label>
                <Input value={form.callerName} onChange={e => setForm(f => ({ ...f, callerName: e.target.value }))} placeholder="Full name" required />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number *</label>
                <Input value={form.callerPhone} onChange={e => setForm(f => ({ ...f, callerPhone: e.target.value }))} placeholder="+233 XX XXX XXXX" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                  <select
                    value={form.departmentId}
                    onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select dept...</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Call Reason</label>
                <textarea
                  value={form.callReason}
                  onChange={e => setForm(f => ({ ...f, callReason: e.target.value }))}
                  placeholder="Brief description of the call purpose..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                {submitting ? "Logging..." : "Log Call"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Calls Board */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Active Calls Board
              </CardTitle>
              <CardDescription>Live call queue — updates every 15s</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (activeCallsData?.activeCallsList?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                <p className="text-sm font-medium">All clear — no active calls</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCallsData.activeCallsList.map((call: any) => (
                  <div key={call.id} className={`flex items-center gap-3 p-3 rounded-lg border ${priorityColors[call.priority]} transition-all`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{call.caller_name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${call.call_status === "connected" ? "bg-blue-500 text-white" : "bg-yellow-500 text-white"}`}>
                          {call.call_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs opacity-70">{call.caller_phone}</span>
                        {call.department_name && (
                          <span className="text-xs opacity-70 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{call.department_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {call.start_time && <CallTimer startTime={call.start_time} />}
                      <Button size="sm" variant="outline" onClick={() => setTransferCallId(call.id)} className="h-7 px-2 gap-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800">
                        <Phone className="h-3 w-3 rotate-90" /> Route
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => endCall(call.id)} className="h-7 px-2 gap-1 text-xs">
                        <PhoneOff className="h-3 w-3" /> End
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Reminders */}
      {followUps.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Bell className="h-4 w-4" /> Follow-up Reminders ({followUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {followUps.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div>
                    <p className="text-sm font-medium">{call.caller_name}</p>
                    <p className="text-xs text-muted-foreground">{call.call_reference} · Due: {call.follow_up_date}</p>
                    {call.follow_up_notes && <p className="text-xs text-muted-foreground mt-0.5">{call.follow_up_notes}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Routing/Transfer Modal */}
      {transferCallId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-150 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Route Active Call</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Route call to department & operator</p>
              </div>
              <button 
                onClick={() => setTransferCallId(null)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Target Department</label>
                <select
                  value={transferDeptId}
                  onChange={e => setTransferDeptId(e.target.value)}
                  required
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                >
                  <option value="">Select Target Department...</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Target Employee / Operator</label>
                <select
                  value={transferUserId}
                  onChange={e => setTransferUserId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                >
                  <option value="">Select Operator (Optional)...</option>
                  {usersList
                    .filter((u: any) => !transferDeptId || u.department_name === departments.find(d => d.id === parseInt(transferDeptId))?.department_name)
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.position || u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Transfer Reason</label>
                <Input 
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="e.g. Inquiry about billing discrepancy"
                  className="h-10 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Internal Routing Notes</label>
                <textarea
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="Any additional context for the receiving operator..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setTransferCallId(null)}
                  className="h-10 rounded-lg px-4"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={transferring}
                  className="h-10 rounded-lg px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                >
                  {transferring ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 rotate-90 mr-2" />}
                  Confirm Route
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
