"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
    Phone, LayoutDashboard, Receipt, Wrench, BarChart3,
    Settings, LogOut, Menu, X, PhoneCall, ChevronRight,
    Bell, Shield, Users, Headphones, Mail
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { useToast } from "@/components/hooks/use-toast"
import { CocobodLogo } from "@/components/reports/cocobod-logo"

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "receptionist", "technician", "manager"] },
    { href: "/receptionist", label: "Reception", icon: Headphones, roles: ["admin", "receptionist"] },
    { href: "/calls", label: "Call Log", icon: PhoneCall, roles: ["admin", "receptionist"] },
    { href: "/messages", label: "Messages", icon: Mail, roles: ["admin", "receptionist", "technician", "manager"] },
    { href: "/billing", label: "Billing", icon: Receipt, roles: ["admin", "receptionist", "manager"] },
    { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["admin", "technician"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "receptionist", "technician", "manager"] },
    { href: "/manager", label: "Management", icon: BarChart3, roles: ["admin", "manager"] },
    { href: "/admin", label: "Administration", icon: Shield, roles: ["admin"] },
]

interface User {
    id: number; username: string; email: string; role: string; name: string
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [currentTime, setCurrentTime] = useState("")
    const [activeCalls, setActiveCalls] = useState(0)
    const { toast } = useToast()
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)
    const prevNotificationIdsRef = useRef<Set<number>>(new Set())

    // Fetch session user
    useEffect(() => {
        fetch("/api/auth/me")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setUser(data)
                else router.push("/login")
            })
            .catch(() => router.push("/login"))
    }, [router])

    // Live clock
    useEffect(() => {
        const update = () => setCurrentTime(new Date().toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    // Poll active calls count
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch("/api/calls/stats")
                if (res.ok) { const d = await res.json(); setActiveCalls(d.activeCalls) }
            } catch { }
        }
        poll()
        const interval = setInterval(poll, 30000)
        return () => clearInterval(interval)
    }, [])

    // Poll notifications
    useEffect(() => {
        if (!user) return
        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/notifications")
                if (res.ok) {
                    const data = await res.json()
                    setNotifications(data.notifications)
                    setUnreadCount(data.unreadCount)
                    
                    const prevIds = prevNotificationIdsRef.current
                    const newIds = new Set<number>()
                    
                    data.notifications.forEach((n: any) => {
                        newIds.add(n.id)
                        if (!n.is_read && !prevIds.has(n.id)) {
                            if (prevIds.size > 0) {
                                toast({
                                    title: n.title,
                                    description: n.message || "New alert received",
                                })
                            }
                        }
                    })
                    prevNotificationIdsRef.current = newIds
                }
            } catch (e) {
                console.error("Notifications poll error:", e)
            }
        }
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 10000)
        return () => clearInterval(interval)
    }, [user, toast])

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true })
            })
            if (res.ok) {
                setUnreadCount(0)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                toast({ title: "Notifications cleared", description: "All notifications marked as read" })
            }
        } catch (e) { }
    }

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        router.push("/login")
        router.refresh()
    }

    const filteredNav = NAV_ITEMS.filter(item => !user || item.roles.includes(user.role))

    const getPageTitle = () => {
        const path = pathname ?? ""
        const item = filteredNav.find(n => n.href === path || (n.href !== "/" && path.startsWith(n.href)))
        return item?.label || "Dashboard"
    }

    const roleLabel: Record<string, string> = {
        admin: "Administrator", receptionist: "Receptionist", technician: "Technician", manager: "Manager"
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[#2C1810] border-r border-[#4A2511]/40 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-[#4A2511]/40">
                    <div className="flex-shrink-0">
                        <CocobodLogo size={36} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">CHED Exchange</p>
                        <p className="text-[#D4AF37] text-[10px] tracking-wider font-semibold uppercase">COCOBOD</p>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Live clock */}
                <div className="px-5 py-3 border-b border-[#4A2511]/40">
                    <p className="text-[#D4AF37]/80 text-xs font-mono tracking-widest">{currentTime}</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {filteredNav.map(({ href, label, icon: Icon }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname === href || (pathname ?? "").startsWith(href + "/")
                        return (
                            <Link 
                                key={href} 
                                href={href} 
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group border-l-4",
                                    isActive
                                        ? "bg-[#722F37] text-white border-l-[#D4AF37] shadow-md shadow-[#722F37]/35"
                                        : "text-gray-300 hover:bg-[#3D2316] hover:text-[#EEDC82] border-l-transparent"
                                )}
                            >
                                <Icon className={cn("h-4.5 w-4.5 flex-shrink-0", isActive ? "text-[#D4AF37]" : "text-gray-400 group-hover:text-[#EEDC82]")} />
                                <span className="flex-1">{label}</span>
                                {label === "Reception" && activeCalls > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                        {activeCalls}
                                    </span>
                                )}
                                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* User profile */}
                {user && (
                    <div className="p-3 border-t border-[#4A2511]/40">
                        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[#3D2316]/75 border border-[#4A2511]/30">
                            <div className="w-8 h-8 rounded-full bg-[#722F37] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-bold text-xs flex-shrink-0">
                                {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                                <p className="text-[#D4AF37] text-[10px] truncate font-medium">{roleLabel[user.role] || user.role}</p>
                            </div>
                            <button onClick={handleLogout} title="Logout"
                                className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                 <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border/40 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                     <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white">
                         <Menu className="h-5 w-5" />
                     </button>
 
                     <div className="flex-1">
                         <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{getPageTitle()}</h2>
                         <p className="text-xs text-muted-foreground hidden sm:block">
                             COCOBOD CHED · Telephone Exchange Management System
                         </p>
                     </div>
 
                     <div className="flex items-center gap-2 relative">
                         {activeCalls > 0 && (
                             <Link href="/receptionist">
                                 <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                                     <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                     {activeCalls} active
                                 </div>
                             </Link>
                         )}
                         
                         {/* Notifications Bell Dropdown */}
                         <div className="relative">
                             <button
                                 onClick={() => setShowNotifications(!showNotifications)}
                                 className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-muted transition-all focus:outline-none"
                             >
                                 <Bell className="h-5 w-5" />
                                 {unreadCount > 0 && (
                                     <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white dark:border-background animate-pulse">
                                         {unreadCount}
                                     </span>
                                 )}
                             </button>
 
                             {showNotifications && (
                                 <>
                                     <div 
                                         className="fixed inset-0 z-45" 
                                         onClick={() => setShowNotifications(false)}
                                     />
                                     <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-card rounded-xl shadow-2xl border border-gray-150 dark:border-border/60 z-50 overflow-hidden divide-y divide-gray-100 dark:divide-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                                         <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-muted/40">
                                             <span className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Alerts</span>
                                             {unreadCount > 0 && (
                                                 <button 
                                                     onClick={handleMarkAllRead}
                                                     className="text-xs text-primary dark:text-[#D4AF37] hover:text-[#722F37] dark:hover:text-[#EEDC82] font-medium"
                                                 >
                                                     Mark all read
                                                 </button>
                                             )}
                                         </div>
                                         <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-border/40">
                                             {notifications.length === 0 ? (
                                                 <div className="p-6 text-center text-xs text-muted-foreground">
                                                     No notifications
                                                 </div>
                                             ) : (
                                                 notifications.map((n: any) => (
                                                     <div 
                                                         key={n.id} 
                                                         className={cn(
                                                             "px-4 py-3 text-left transition-colors",
                                                             n.is_read ? "bg-white dark:bg-card" : "bg-amber-500/5 dark:bg-amber-500/10"
                                                         )}
                                                     >
                                                         <div className="flex justify-between items-start gap-2">
                                                             <p className={cn("text-xs font-semibold", n.is_read ? "text-gray-900 dark:text-white" : "text-[#722F37] dark:text-[#D4AF37]")}>
                                                                 {n.title}
                                                             </p>
                                                             {!n.is_read && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0 mt-1" />}
                                                         </div>
                                                         {n.message && (
                                                             <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                                                 {n.message}
                                                             </p>
                                                         )}
                                                         <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-mono">
                                                             {new Date(n.created_at).toLocaleString("en-GH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                         </p>
                                                     </div>
                                                 ))
                                             )}
                                         </div>
                                     </div>
                                 </>
                            )}
                        </div>

                        <ModeToggle />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
