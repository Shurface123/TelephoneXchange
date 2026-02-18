"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/hooks/use-toast"
import {
  Users, Phone, DollarSign, AlertTriangle, RefreshCw, Plus,
  Shield, CheckCircle2, XCircle, Edit2, Trash2, Eye, EyeOff, Search
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  receptionist: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  technician: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]

export default function AdminPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [billingStats, setBillingStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "receptionist", firstName: "", lastName: "", phone: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, usersRes, billingRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/users"),
        fetch("/api/billing/stats"),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users) }
      if (billingRes.ok) setBillingStats(await billingRes.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser }),
      })
      if (res.ok) {
        toast({ title: "User created", description: `${newUser.firstName} ${newUser.lastName} added successfully` })
        setShowCreateUser(false)
        setNewUser({ username: "", email: "", password: "", role: "receptionist", firstName: "", lastName: "", phone: "" })
        fetchAll()
      } else {
        const d = await res.json()
        toast({ title: "Error", description: d.error, variant: "destructive" })
      }
    } catch { toast({ title: "Error", description: "Failed to create user", variant: "destructive" }) }
    finally { setSubmitting(false) }
  }

  const toggleUserStatus = async (user: any) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.is_active }),
    })
    toast({ title: user.is_active ? "User deactivated" : "User activated", description: `${user.first_name} ${user.last_name}` })
    fetchAll()
  }

  const filteredUsers = users.filter(u =>
    !userSearch || `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  )

  const roleDistribution = ["admin", "receptionist", "technician"].map(role => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: users.filter(u => u.role === role).length,
  }))

  const monthlyRevenue = billingStats?.monthlyRevenue?.map((d: any) => ({
    month: d.month,
    revenue: parseFloat(d.revenue),
  })) || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administration</h1>
          <p className="text-sm text-muted-foreground">System management and oversight</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateUser(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, sub: `${users.filter(u => u.is_active).length} active`, icon: Users, color: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/10" },
          { label: "Active Calls", value: stats?.calls?.active ?? 0, sub: `${stats?.calls?.today ?? 0} today`, icon: Phone, color: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10" },
          { label: "Month Revenue", value: `GHS ${Number(billingStats?.monthRevenue ?? 0).toLocaleString()}`, sub: `${billingStats?.pendingCount ?? 0} pending`, icon: DollarSign, color: "border-l-green-500 bg-green-50 dark:bg-green-900/10" },
          { label: "Open Faults", value: stats?.maintenance?.openFaults ?? 0, sub: `${stats?.maintenance?.criticalFaults ?? 0} critical`, icon: AlertTriangle, color: "border-l-red-500 bg-red-50 dark:bg-red-900/10" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Revenue (GHS)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`GHS ${Number(v).toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">User Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {roleDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Management Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">User Management</CardTitle>
            <CardDescription>{users.length} total users</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-8 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  {["Name", "Username", "Role", "Department", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-xs">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.department_name || "—"}</td>
                    <td className="px-4 py-3">
                      {user.is_active
                        ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3.5 w-3.5" /> Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleUserStatus(user)}
                          title={user.is_active ? "Deactivate" : "Activate"}>
                          {user.is_active ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-600" /> Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name *</label>
                    <Input value={newUser.firstName} onChange={e => setNewUser(u => ({ ...u, firstName: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name *</label>
                    <Input value={newUser.lastName} onChange={e => setNewUser(u => ({ ...u, lastName: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Username *</label>
                  <Input value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                  <Input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Password *</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Role *</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="receptionist">Receptionist</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                    <Input value={newUser.phone} onChange={e => setNewUser(u => ({ ...u, phone: e.target.value }))} placeholder="+233..." />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
