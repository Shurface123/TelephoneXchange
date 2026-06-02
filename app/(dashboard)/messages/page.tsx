"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  Mail, Send, Inbox, ArrowUpRight, Search, Plus, Calendar, Clock,
  User, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Users, Loader2, ChevronRight
} from "lucide-react"

export default function MessagesAndConferencesPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"messages" | "conferences">("messages")
  const [msgTab, setMsgTab] = useState<"inbox" | "sent">("inbox")
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Loading states
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [loadingConfs, setLoadingConfs] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Data lists
  const [messages, setMessages] = useState<any[]>([])
  const [conferences, setConferences] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Selection
  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [showConfModal, setShowConfModal] = useState(false)

  // Forms
  const [composeForm, setComposeForm] = useState({ recipientId: "", subject: "", body: "", priority: "normal" })
  const [confForm, setConfForm] = useState({ title: "", scheduledDate: "", scheduledTime: "", durationMins: "60", agenda: "", participantIds: [] as string[] })
  const [replyText, setReplyText] = useState("")

  // Fetch Current User
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setCurrentUser(data))
      .catch(() => {})
  }, [])

  // Fetch users for dropdown list
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const d = await res.json()
        setUsers(d.users || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Fetch Messages
  const fetchMessages = useCallback(async () => {
    setLoadingMsgs(true)
    try {
      const endpoint = msgTab === "inbox" ? "/api/messages" : "/api/messages/sent"
      const res = await fetch(endpoint)
      if (res.ok) {
        const d = await res.json()
        const fetched = d.messages || []
        setMessages(fetched)
        // Auto select first message if none selected
        if (fetched.length > 0 && !selectedMsg) {
          setSelectedMsg(fetched[0])
          if (msgTab === "inbox" && !fetched[0].is_read) {
            markAsRead(fetched[0].id)
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMsgs(false)
    }
  }, [msgTab, selectedMsg])

  // Fetch Conferences
  const fetchConferences = useCallback(async () => {
    setLoadingConfs(true)
    try {
      const res = await fetch("/api/conferences")
      if (res.ok) {
        const d = await res.json()
        setConferences(d.conferences || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConfs(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "messages") {
      fetchMessages()
    } else {
      fetchConferences()
    }
  }, [activeTab, fetchMessages, fetchConferences])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleMsgSelect = async (msg: any) => {
    setSelectedMsg(msg)
    if (msgTab === "inbox" && !msg.is_read) {
      // Mark read in DB
      await markAsRead(msg.id)
      // Update local state
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/messages/${id}/read`, { method: "PATCH" })
    } catch (e) {
      console.error(e)
    }
  }

  // Handle compose submit
  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!composeForm.recipientId || !composeForm.subject || !composeForm.body) {
      toast({ title: "Validation error", description: "All fields are required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: parseInt(composeForm.recipientId),
          subject: composeForm.subject,
          body: composeForm.body,
          priority: composeForm.priority
        })
      })
      if (res.ok) {
        toast({ title: "Message sent", description: "Your message has been delivered." })
        setShowComposeModal(false)
        setComposeForm({ recipientId: "", subject: "", body: "", priority: "normal" })
        if (msgTab === "sent") fetchMessages()
      } else {
        const err = await res.json()
        toast({ title: "Failed to send", description: err.error || "Server error", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Connection failure", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle reply submit
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedMsg) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/messages/${selectedMsg.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText })
      })
      if (res.ok) {
        toast({ title: "Reply sent", description: "Your reply has been delivered." })
        setReplyText("")
        fetchMessages()
      } else {
        toast({ title: "Failed to send reply", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Connection failure", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle RSVP
  const handleRSVP = async (confId: number, status: "accepted" | "declined") => {
    try {
      // Typically goes to RSVP API, since we didn't define a standalone RSVP API,
      // let's define a prompt or directly update it. Wait, the DB table is conference_participants.
      // We can make a quick API route or insert/update it directly. Let's make sure it handles.
      // Wait, we can implement it as a fetch to '/api/conferences/' + confId + '/rsvp' POST
      const res = await fetch(`/api/conferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conferenceId: confId, status })
      })
      if (res.ok) {
        toast({ title: `RSVP updated`, description: `You have ${status} the invitation.` })
        fetchConferences()
      } else {
        // Fallback simulated update if PATCH not available, but let's implement PATCH in route.ts shortly
        toast({ title: "Error updating RSVP", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    }
  }

  // Handle schedule conference submit
  const handleConfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confForm.title || !confForm.scheduledDate || !confForm.scheduledTime) {
      toast({ title: "Validation error", description: "Title and Scheduled Date/Time are required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    const scheduledAt = `${confForm.scheduledDate} ${confForm.scheduledTime}:00`
    try {
      const res = await fetch("/api/conferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: confForm.title,
          scheduledAt,
          durationMins: parseInt(confForm.durationMins),
          agenda: confForm.agenda,
          participantIds: confForm.participantIds
        })
      })
      if (res.ok) {
        toast({ title: "Conference scheduled", description: "Internal conference has been successfully scheduled." })
        setShowConfModal(false)
        setConfForm({ title: "", scheduledDate: "", scheduledTime: "", durationMins: "60", agenda: "", participantIds: [] })
        fetchConferences()
      } else {
        const err = await res.json()
        toast({ title: "Failed to schedule", description: err.error || "Server error", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Connection failure", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Filter messages based on search
  const filteredMessages = messages.filter(m => {
    const queryStr = searchQuery.toLowerCase()
    const subjectMatch = m.subject?.toLowerCase().includes(queryStr)
    const bodyMatch = m.body?.toLowerCase().includes(queryStr)
    const nameMatch = (m.sender_name || m.recipient_name || "")?.toLowerCase().includes(queryStr)
    return subjectMatch || bodyMatch || nameMatch
  })

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communication Center</h1>
          <p className="text-sm text-muted-foreground">Manage internal messages and coordinate web conferences</p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab("messages"); setSelectedMsg(null) }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "messages"
                ? "bg-[#722F37] text-white shadow-md"
                : "text-muted-foreground hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Messages
          </button>
          <button
            onClick={() => setActiveTab("conferences")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "conferences"
                ? "bg-[#722F37] text-white shadow-md"
                : "text-muted-foreground hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Web Conferences
          </button>
        </div>
      </div>

      {/* MESSAGES TAB CONTENT */}
      {activeTab === "messages" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)] min-h-[500px]">
          {/* Messages List (Left Sidebar) */}
          <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden">
            {/* Folder Toggle & Compose */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 bg-gray-50 dark:bg-slate-950/40 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => { setMsgTab("inbox"); setSelectedMsg(null) }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                      msgTab === "inbox" ? "bg-white dark:bg-slate-850 text-gray-900 dark:text-white shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Inbox className="h-3 w-3" /> Inbox
                  </button>
                  <button
                    onClick={() => { setMsgTab("sent"); setSelectedMsg(null) }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                      msgTab === "sent" ? "bg-white dark:bg-slate-850 text-gray-900 dark:text-white shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <ArrowUpRight className="h-3 w-3" /> Sent
                  </button>
                </div>
                <button
                  onClick={() => setShowComposeModal(true)}
                  className="bg-[#722F37] hover:bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm shadow-[#722F37]/35"
                >
                  <Plus className="h-3.5 w-3.5" /> Compose
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search subject, body, sender..."
                  className="pl-8 text-xs h-9 bg-gray-50 dark:bg-slate-950/20 border-gray-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
              {loadingMsgs ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No messages found</div>
              ) : (
                filteredMessages.map(m => {
                  const isSelected = selectedMsg?.id === m.id
                  const author = msgTab === "inbox" ? m.sender_name : m.recipient_name
                  const role = msgTab === "inbox" ? m.sender_role : m.recipient_role
                  const unread = msgTab === "inbox" && !m.is_read

                  return (
                    <button
                      key={m.id}
                      onClick={() => handleMsgSelect(m)}
                      className={`w-full text-left p-4 flex gap-3 transition-colors ${
                        isSelected
                          ? "bg-slate-50 dark:bg-slate-800/40 border-l-4 border-l-[#722F37]"
                          : unread
                          ? "bg-blue-50/20 dark:bg-blue-950/5 hover:bg-gray-50 dark:hover:bg-slate-800/20 border-l-4 border-l-transparent"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800/20 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#722F37] to-[#8B1A1A] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {author?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-xs truncate ${unread ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
                            {author}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {new Date(m.created_at).toLocaleDateString("en-GH", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <p className={`text-xs truncate ${unread ? "font-bold text-gray-900 dark:text-white" : "text-gray-950 dark:text-gray-100"}`}>
                          {m.subject}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {m.body}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                            {role}
                          </span>
                          {m.priority === "urgent" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 uppercase tracking-wide">
                              <AlertTriangle className="h-2 w-2" /> Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Message Thread Details (Right Pane) */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden">
            {selectedMsg ? (
              <div className="flex flex-col h-full">
                {/* Thread Header */}
                <div className="p-6 border-b flex items-start justify-between bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">{selectedMsg.subject}</h2>
                      {selectedMsg.priority === "urgent" && (
                        <span className="bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {msgTab === "inbox" ? "From: " : "To: "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {msgTab === "inbox" ? selectedMsg.sender_name : selectedMsg.recipient_name}
                      </span>
                      {` (${msgTab === "inbox" ? selectedMsg.sender_email || selectedMsg.sender_username + "@cocobod.gov.gh" : selectedMsg.recipient_email || selectedMsg.recipient_username + "@cocobod.gov.gh"})`}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground font-mono">
                    {new Date(selectedMsg.created_at).toLocaleString("en-GH")}
                  </div>
                </div>

                {/* Message Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  {/* The main body of the message */}
                  <div className="bg-[#FDFAFD] dark:bg-slate-800/10 border border-gray-100 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full bg-[#722F37]/10 flex items-center justify-center text-[#722F37] font-bold text-sm">
                        {(msgTab === "inbox" ? selectedMsg.sender_name : selectedMsg.recipient_name)?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {msgTab === "inbox" ? selectedMsg.sender_name : selectedMsg.recipient_name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Sent via CHED Internal messaging
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedMsg.body}
                    </div>
                  </div>
                </div>

                {/* Reply section (Only if received in inbox) */}
                {msgTab === "inbox" && (
                  <form onSubmit={handleReplySubmit} className="p-4 border-t bg-gray-50/50 dark:bg-slate-950/20">
                    <div className="flex items-end gap-3 bg-white dark:bg-slate-900 border rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-[#722F37]/20 transition-all">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={`Reply to ${selectedMsg.sender_name || "sender"}...`}
                        className="flex-1 bg-transparent resize-none border-0 focus:ring-0 p-1 text-xs outline-none h-14"
                      />
                      <Button
                        type="submit"
                        disabled={submitting || !replyText.trim()}
                        className="bg-[#722F37] hover:bg-[#8B1A1A] text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0"
                      >
                        {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send Reply
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Select a message from the list to read or reply</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFERENCES TAB CONTENT */}
      {activeTab === "conferences" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Scheduled Conferences</h2>
            <Button
              onClick={() => setShowConfModal(true)}
              className="bg-[#722F37] hover:bg-[#8B1A1A] text-white text-xs gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" /> Schedule Conference
            </Button>
          </div>

          {loadingConfs ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : conferences.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <h4 className="text-sm font-semibold mb-1">No conferences scheduled</h4>
                <p className="text-xs">Schedule a web conference meeting and invite division staff</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conferences.map(conf => {
                const userParticipant = conf.participants?.find((p: any) => p.user_id === currentUser?.userId)
                const isOrganizer = conf.organizer_id === currentUser?.userId

                return (
                  <Card key={conf.id} className="overflow-hidden border-t-4 border-t-[#722F37] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-4">
                      {/* Conference info */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            conf.status === "scheduled" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                            conf.status === "in_progress" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-pulse" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {conf.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: CONF-{conf.id}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mt-1">{conf.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{conf.agenda || "No agenda provided"}</p>
                      </div>

                      {/* Organizer and schedule */}
                      <div className="space-y-2 border-t border-b py-3 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{new Date(conf.scheduled_at).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{new Date(conf.scheduled_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })} ({conf.duration_mins} mins)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span>Organizer: <strong className="text-gray-800 dark:text-gray-200">{isOrganizer ? "You" : conf.organizer_name}</strong></span>
                        </div>
                      </div>

                      {/* Participants list */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invited Staff ({conf.participant_count})</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {conf.participants?.map((p: any) => (
                            <span
                              key={p.user_id}
                              title={`${p.name} - ${p.response_status}`}
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                p.response_status === "accepted" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" :
                                p.response_status === "declined" ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" :
                                "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                              }`}
                            >
                              {p.name.split(" ").map((n: string) => n[0]).join("")} ({p.response_status === "accepted" ? "✓" : p.response_status === "declined" ? "✗" : "?"})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* RSVP Actions */}
                      {!isOrganizer && userParticipant && (
                        <div className="flex gap-2 pt-2 border-t mt-3">
                          <button
                            onClick={() => handleRSVP(conf.id, "accepted")}
                            disabled={userParticipant.response_status === "accepted"}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              userParticipant.response_status === "accepted"
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/10 dark:text-green-400"
                                : "bg-white hover:bg-green-50 border-gray-250 text-gray-700 hover:text-green-700 hover:border-green-300 dark:bg-slate-900"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => handleRSVP(conf.id, "declined")}
                            disabled={userParticipant.response_status === "declined"}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              userParticipant.response_status === "declined"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/10 dark:text-red-400"
                                : "bg-white hover:bg-red-50 border-gray-250 text-gray-700 hover:text-red-700 hover:border-red-300 dark:bg-slate-900"
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Decline
                          </button>
                        </div>
                      )}
                      {isOrganizer && (
                        <div className="text-center text-[10px] text-muted-foreground pt-2 border-t mt-3 font-semibold uppercase tracking-wider">
                          You are hosting this meeting
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPOSE MESSAGE MODAL */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #722F37, #8B1A1A)" }}>
              <div>
                <h3 className="font-bold text-white text-sm">New Internal Message</h3>
                <p className="text-[11px]" style={{ color: "#D4AF37" }}>Secure communication within CHED exchange</p>
              </div>
              <button onClick={() => setShowComposeModal(false)} className="text-white/60 hover:text-white"><XCircle className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleComposeSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Recipient *</label>
                <select
                  value={composeForm.recipientId}
                  onChange={e => setComposeForm(f => ({ ...f, recipientId: e.target.value }))}
                  required
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                >
                  <option value="">Select Recipient...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Subject *</label>
                  <Input
                    value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Enter message subject"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Priority</label>
                  <select
                    value={composeForm.priority}
                    onChange={e => setComposeForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Message Body *</label>
                <textarea
                  value={composeForm.body}
                  onChange={e => setComposeForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Type your message details here..."
                  required
                  className="w-full h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowComposeModal(false)}>Cancel</Button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#722F37] hover:bg-[#8B1A1A] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{ boxShadow: "0 4px 12px rgba(114,47,55,0.3)" }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE CONFERENCE MODAL */}
      {showConfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #722F37, #8B1A1A)" }}>
              <div>
                <h3 className="font-bold text-white text-sm">Schedule Web Conference</h3>
                <p className="text-[11px]" style={{ color: "#D4AF37" }}>Coordinate audio/video conference schedule</p>
              </div>
              <button onClick={() => setShowConfModal(false)} className="text-white/60 hover:text-white"><XCircle className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleConfSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Meeting Title *</label>
                <Input
                  value={confForm.title}
                  onChange={e => setConfForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monthly Performance Review"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Date *</label>
                  <input
                    type="date"
                    value={confForm.scheduledDate}
                    onChange={e => setConfForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Time *</label>
                  <input
                    type="time"
                    value={confForm.scheduledTime}
                    onChange={e => setConfForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Duration (Mins)</label>
                  <select
                    value={confForm.durationMins}
                    onChange={e => setConfForm(f => ({ ...f, durationMins: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Agenda / Topic</label>
                <textarea
                  value={confForm.agenda}
                  onChange={e => setConfForm(f => ({ ...f, agenda: e.target.value }))}
                  placeholder="Outline topics to discuss..."
                  className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#722F37]/35 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Invite Staff participants</label>
                <div className="max-h-28 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2 bg-gray-50/50 dark:bg-slate-950/20">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confForm.participantIds.includes(String(u.id))}
                        onChange={e => {
                          const idStr = String(u.id)
                          if (e.target.checked) {
                            setConfForm(f => ({ ...f, participantIds: [...f.participantIds, idStr] }))
                          } else {
                            setConfForm(f => ({ ...f, participantIds: f.participantIds.filter(x => x !== idStr) }))
                          }
                        }}
                        className="rounded text-[#722F37] focus:ring-[#722F37] h-3.5 w-3.5"
                      />
                      <span>{u.first_name} {u.last_name} ({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowConfModal(false)}>Cancel</Button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#722F37] hover:bg-[#8B1A1A] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{ boxShadow: "0 4px 12px rgba(114,47,55,0.3)" }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Conference"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
