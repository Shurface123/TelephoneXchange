"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/hooks/use-toast"
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, RefreshCw, Calendar,
  ChevronDown, ChevronUp, User, MapPin, Zap, BarChart3, X
} from "lucide-react"

const SEVERITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300", dot: "bg-red-500" },
  high: { label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300", dot: "bg-orange-500" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300", dot: "bg-yellow-500" },
  low: { label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300", dot: "bg-green-500" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-500" },
}

export default function TechnicianPage() {
  const { toast } = useToast()
  const [faults, setFaults] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [stations, setStations] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedFault, setExpandedFault] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [resolutionNote, setResolutionNote] = useState<Record<number, string>>({})
  
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showFaultModal, setShowFaultModal] = useState(false)

  const [schedForm, setSchedForm] = useState({
    stationId: "", maintenanceType: "preventive",
    maintenanceDescription: "", scheduledDate: "",
    scheduledTime: "", estimatedDuration: "",
    assignedTechnician: ""
  })

  const [faultForm, setFaultForm] = useState({
    stationId: "", departmentId: "", faultType: "hardware",
    faultCategory: "equipment", faultDescription: "",
    faultSeverity: "medium"
  })

  const fetchData = useCallback(async () => {
    try {
      const [faultsRes, schedRes, stationsRes, usersRes, deptRes] = await Promise.all([
        fetch("/api/faults"),
        fetch("/api/maintenance"),
        fetch("/api/stations"),
        fetch("/api/users"),
        fetch("/api/departments")
      ])
      if (faultsRes.ok) { const d = await faultsRes.json(); setFaults(d.faults) }
      if (schedRes.ok) { const d = await schedRes.json(); setSchedules(d.schedules) }
      if (stationsRes.ok) { const d = await stationsRes.json(); setStations(d.stations || []) }
      if (usersRes.ok) { const d = await usersRes.json(); setUsersList(d.users || []) }
      if (deptRes.ok) { const d = await deptRes.json(); setDepartments(d.departments || []) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateFaultStatus = async (faultId: number, status: string, notes?: string) => {
    const res = await fetch(`/api/faults/${faultId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faultStatus: status, resolutionNotes: notes }),
    })
    if (res.ok) {
      toast({ title: "Fault updated", description: `Status changed to ${status}` })
      fetchData()
    } else {
      toast({ title: "Error", description: "Failed to update fault", variant: "destructive" })
    }
  }

  const updateScheduleStatus = async (schedId: number, status: string) => {
    await fetch(`/api/maintenance?id=${schedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maintenanceStatus: status }),
    })
    toast({ title: "Schedule updated" })
    fetchData()
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedForm.maintenanceDescription || !schedForm.scheduledDate) {
      toast({ title: "Missing fields", description: "Please fill in scheduled date and description", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: parseInt(schedForm.stationId) || null,
          maintenanceType: schedForm.maintenanceType,
          maintenanceDescription: schedForm.maintenanceDescription,
          scheduledDate: schedForm.scheduledDate,
          scheduledTime: schedForm.scheduledTime || null,
          estimatedDuration: parseInt(schedForm.estimatedDuration) || null,
          assignedTechnician: parseInt(schedForm.assignedTechnician) || null
        })
      })
      if (res.ok) {
        toast({ title: "Schedule created", description: "New maintenance schedule successfully logged." })
        setShowScheduleModal(false)
        setSchedForm({
          stationId: "", maintenanceType: "preventive",
          maintenanceDescription: "", scheduledDate: "",
          scheduledTime: "", estimatedDuration: "",
          assignedTechnician: ""
        })
        fetchData()
      } else {
        toast({ title: "Failed to schedule", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to log schedule", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateFault = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!faultForm.faultDescription) {
      toast({ title: "Missing fields", description: "Please enter fault description", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/faults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: parseInt(faultForm.stationId) || null,
          departmentId: parseInt(faultForm.departmentId) || null,
          faultType: faultForm.faultType,
          faultCategory: faultForm.faultCategory,
          faultDescription: faultForm.faultDescription,
          faultSeverity: faultForm.faultSeverity
        })
      })
      if (res.ok) {
        toast({ title: "Fault logged", description: "New fault report successfully submitted." })
        setShowFaultModal(false)
        setFormState();
        fetchData()
      } else {
        toast({ title: "Failed to report fault", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to report fault", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const setFormState = () => {
    setFaultForm({
      stationId: "", departmentId: "", faultType: "hardware",
      faultCategory: "station", faultDescription: "",
      faultSeverity: "medium"
    })
  }

  const filteredFaults = faults.filter(f => statusFilter === "all" || f.fault_status === statusFilter)

  const stats = {
    open: faults.filter(f => f.fault_status === "open").length,
    inProgress: faults.filter(f => f.fault_status === "in_progress").length,
    resolved: faults.filter(f => f.fault_status === "resolved").length,
    critical: faults.filter(f => f.fault_severity === "critical" && !["resolved", "closed"].includes(f.fault_status)).length,
  }

  const upcomingSchedules = schedules.filter(s => s.maintenance_status === "scheduled" || s.maintenance_status === "in_progress")

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Fault management and maintenance scheduling</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowFaultModal(true)} size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10">
            <AlertTriangle className="h-3.5 w-3.5" /> Report Fault
          </Button>
          <Button onClick={() => setShowScheduleModal(true)} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10">
            <Calendar className="h-3.5 w-3.5" /> New Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open Faults", value: stats.open, icon: AlertTriangle, color: "border-l-gray-400 bg-gray-50 dark:bg-gray-800/30" },
          { label: "In Progress", value: stats.inProgress, icon: Wrench, color: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "border-l-green-500 bg-green-50 dark:bg-green-900/10" },
          { label: "Critical", value: stats.critical, icon: Zap, color: "border-l-red-500 bg-red-50 dark:bg-red-900/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-6 w-6 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fault Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Fault Reports</h2>
            <div className="flex gap-1">
              {["all", "open", "assigned", "in_progress", "resolved"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredFaults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                <p className="text-sm">No faults in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredFaults.map((fault: any) => {
                const sev = SEVERITY_CONFIG[fault.fault_severity] || SEVERITY_CONFIG.medium
                const sta = STATUS_CONFIG[fault.fault_status] || STATUS_CONFIG.open
                const isExpanded = expandedFault === fault.id

                return (
                  <Card key={fault.id} className={`border ${sev.color} transition-all`}>
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => setExpandedFault(isExpanded ? null : fault.id)}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{fault.fault_reference}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sta.color}`}>{sta.label}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">{fault.fault_description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {fault.department_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{fault.department_name}</span>}
                          {fault.station_name && <span>{fault.station_name}</span>}
                          <span>{new Date(fault.reported_at).toLocaleDateString("en-GH")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fault.assigned_to_name && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            <User className="h-3 w-3 inline mr-1" />{fault.assigned_to_name}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-current/10 pt-3 space-y-3">
                        <p className="text-sm text-muted-foreground">{fault.fault_description}</p>
                        {fault.resolution_notes && (
                          <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Resolution Notes</p>
                            <p className="text-sm text-green-800 dark:text-green-300">{fault.resolution_notes}</p>
                          </div>
                        )}

                        {!["resolved", "closed"].includes(fault.fault_status) && (
                          <div className="space-y-2">
                            <textarea
                              value={resolutionNote[fault.id] || ""}
                              onChange={e => setResolutionNote(n => ({ ...n, [fault.id]: e.target.value }))}
                              placeholder="Add resolution notes..."
                              rows={2}
                              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                            <div className="flex gap-2 flex-wrap">
                              {fault.fault_status === "open" && (
                                <Button size="sm" variant="outline" onClick={() => updateFaultStatus(fault.id, "in_progress")} className="gap-1">
                                  <Wrench className="h-3.5 w-3.5" /> Start Work
                                </Button>
                              )}
                              {["assigned", "in_progress"].includes(fault.fault_status) && (
                                <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => updateFaultStatus(fault.id, "resolved", resolutionNote[fault.id])}>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Maintenance Schedule */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" /> Upcoming Maintenance
          </h2>
          {upcomingSchedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2" />
                <p className="text-sm">No upcoming maintenance</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((sched: any) => (
                <Card key={sched.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sched.maintenance_type === "corrective" ? "bg-red-100 text-red-700" :
                              sched.maintenance_type === "preventive" ? "bg-blue-100 text-blue-700" :
                                "bg-purple-100 text-purple-700"
                            }`}>{sched.maintenance_type}</span>
                          {sched.maintenance_status === "in_progress" && (
                            <span className="text-xs text-yellow-600 font-medium">● In Progress</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{sched.maintenance_description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(sched.scheduled_date).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" })}</span>
                          {sched.scheduled_time && <span>at {sched.scheduled_time.slice(0, 5)}</span>}
                        </div>
                        {sched.estimated_duration && (
                          <p className="text-xs text-muted-foreground mt-0.5">Est. {sched.estimated_duration} min</p>
                        )}
                      </div>
                    </div>
                    {sched.maintenance_status === "scheduled" && (
                      <Button size="sm" variant="outline" className="w-full mt-3 gap-1 text-xs"
                        onClick={() => updateScheduleStatus(sched.id, "in_progress")}>
                        <Wrench className="h-3 w-3" /> Start Maintenance
                      </Button>
                    )}
                    {sched.maintenance_status === "in_progress" && (
                      <Button size="sm" className="w-full mt-3 gap-1 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => updateScheduleStatus(sched.id, "completed")}>
                        <CheckCircle2 className="h-3 w-3" /> Mark Complete
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Maintenance Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-150 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">New Maintenance Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Schedule preventive or corrective work</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Station / Desk</label>
                  <select
                    value={schedForm.stationId}
                    onChange={e => setSchedForm(f => ({ ...f, stationId: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Select Station (Optional)...</option>
                    {stations.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.station_name} ({s.station_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Maintenance Type *</label>
                  <select
                    value={schedForm.maintenanceType}
                    onChange={e => setSchedForm(f => ({ ...f, maintenanceType: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="routine">Routine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Scheduled Date *</label>
                  <input
                    type="date"
                    value={schedForm.scheduledDate}
                    onChange={e => setSchedForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Scheduled Time</label>
                  <input
                    type="time"
                    value={schedForm.scheduledTime}
                    onChange={e => setSchedForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Est. Duration (mins)</label>
                  <input
                    type="number"
                    placeholder="e.g. 60"
                    value={schedForm.estimatedDuration}
                    onChange={e => setSchedForm(f => ({ ...f, estimatedDuration: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Assign Technician</label>
                  <select
                    value={schedForm.assignedTechnician}
                    onChange={e => setSchedForm(f => ({ ...f, assignedTechnician: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Select Technician...</option>
                    {usersList.filter((u: any) => u.role === "technician" || u.role === "admin").map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Task Description *</label>
                <textarea
                  value={schedForm.maintenanceDescription}
                  onChange={e => setSchedForm(f => ({ ...f, maintenanceDescription: e.target.value }))}
                  placeholder="Describe the maintenance activities, components to inspect/replace..."
                  rows={4}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)} className="h-10 rounded-lg px-4">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-10 rounded-lg px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Schedule Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Fault Modal */}
      {showFaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-150 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Report System Fault</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Submit immediate telephone line / desk fault report</p>
              </div>
              <button onClick={() => setShowFaultModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateFault} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Station / Desk</label>
                  <select
                    value={faultForm.stationId}
                    onChange={e => setFaultForm(f => ({ ...f, stationId: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Select Station (Optional)...</option>
                    {stations.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.station_name} ({s.station_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Department *</label>
                  <select
                    value={faultForm.departmentId}
                    onChange={e => setFaultForm(f => ({ ...f, departmentId: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Fault Type *</label>
                  <select
                    value={faultForm.faultType}
                    onChange={e => setFaultForm(f => ({ ...f, faultType: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="network">Network / Connectivity</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Fault Category *</label>
                  <select
                    value={faultForm.faultCategory}
                    onChange={e => setFaultForm(f => ({ ...f, faultCategory: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="equipment">Station Equipment</option>
                    <option value="connection">Connection / Line</option>
                    <option value="phone_line">Telephone Line</option>
                    <option value="billing">Billing System</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Severity *</label>
                  <select
                    value={faultForm.faultSeverity}
                    onChange={e => setFaultForm(f => ({ ...f, faultSeverity: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Fault Description *</label>
                <textarea
                  value={faultForm.faultDescription}
                  onChange={e => setFaultForm(f => ({ ...f, faultDescription: e.target.value }))}
                  placeholder="Describe the exact issues (e.g. no dial tone, crackling sound, screen blank)..."
                  rows={4}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowFaultModal(false)} className="h-10 rounded-lg px-4">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-10 rounded-lg px-5 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                  Report Fault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
