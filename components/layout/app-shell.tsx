"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
    Phone, LayoutDashboard, Receipt, Wrench, BarChart3,
    Settings, LogOut, Menu, X, PhoneCall, ChevronRight,
    Bell, Shield, Users, Headphones
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "receptionist", "technician"] },
    { href: "/receptionist", label: "Reception", icon: Headphones, roles: ["admin", "receptionist"] },
    { href: "/calls", label: "Call Log", icon: PhoneCall, roles: ["admin", "receptionist"] },
    { href: "/billing", label: "Billing", icon: Receipt, roles: ["admin", "receptionist"] },
    { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["admin", "technician"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "receptionist", "technician"] },
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
        admin: "Administrator", receptionist: "Receptionist", technician: "Technician"
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
                        <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">CHED Exchange</p>
                        <p className="text-slate-400 text-xs truncate">COCOBOD</p>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Live clock */}
                <div className="px-5 py-3 border-b border-slate-700/50">
                    <p className="text-slate-400 text-xs font-mono">{currentTime}</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {filteredNav.map(({ href, label, icon: Icon }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname === href || (pathname ?? "").startsWith(href + "/")
                        return (
                            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}>
                                    <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                                    <span className="flex-1">{label}</span>
                                    {label === "Reception" && activeCalls > 0 && (
                                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                            {activeCalls}
                                        </span>
                                    )}
                                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* User profile */}
                {user && (
                    <div className="p-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                                <p className="text-slate-400 text-xs truncate">{roleLabel[user.role] || user.role}</p>
                            </div>
                            <button onClick={handleLogout} title="Logout"
                                className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700/50 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{getPageTitle()}</h2>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            COCOBOD CHED · Telephone Exchange Management System
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeCalls > 0 && (
                            <Link href="/receptionist">
                                <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    {activeCalls} active
                                </div>
                            </Link>
                        )}
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
