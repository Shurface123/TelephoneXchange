"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Phone, Loader2, Shield, AlertCircle, Database, CheckCircle2, Lock } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPath = searchParams?.get("from") || "/"
  const isExpired = searchParams?.get("expired") === "1"

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(isExpired ? "Your session has expired. Please sign in again." : "")
  const [isDbError, setIsDbError] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [shake, setShake] = useState(false)
  const [currentTime, setCurrentTime] = useState("")

  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleString("en-GH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    }))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return
    if (!username || !password) { setError("Please enter your credentials"); triggerShake(); return }
    setLoading(true); setError(""); setIsDbError(false); setIsLocked(false); setAttemptsRemaining(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setIsDbError(res.status === 503)
        setIsLocked(data.locked === true || res.status === 429)
        if (typeof data.attemptsRemaining === "number") setAttemptsRemaining(data.attemptsRemaining)
        setError(data.error || "Login failed")
        triggerShake()
      } else {
        // Redirect to original destination or role-appropriate dashboard
        const role = data.user?.role
        const dest = fromPath !== "/" ? fromPath :
          role === "technician" ? "/maintenance" :
          role === "receptionist" ? "/receptionist" :
          role === "manager" ? "/manager" : "/"
        router.push(dest)
        router.refresh()
      }
    } catch {
      setError("Connection error. Please check your network and try again.")
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/40 mb-4">
            <Phone className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CHED Exchange</h1>
          <p className="text-blue-300 text-sm mt-1 font-medium">COCOBOD · Telephone Management System</p>
          <p className="text-slate-500 text-xs mt-2">{currentTime}</p>
        </div>

        {/* Glassmorphism card */}
        <div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
          style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Sign In</h2>
            <p className="text-slate-400 text-sm mt-1">Enter your credentials to access the system</p>
          </div>

          {error && (
            <div className={`flex items-start gap-2 border rounded-lg px-4 py-3 mb-5 text-sm ${
              isDbError ? "bg-orange-500/10 border-orange-500/30 text-orange-300" :
              isLocked ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
              "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {isDbError ? <Database className="h-4 w-4 flex-shrink-0 mt-0.5" /> :
               isLocked ? <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" /> :
               <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p>{error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="text-xs mt-1 opacity-80">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining before lockout
                  </p>
                )}
                {isDbError && (
                  <div className="mt-2 text-xs text-orange-400/80 space-y-1">
                    <p className="font-medium">Setup steps:</p>
                    <p>1. Open <strong>phpMyAdmin</strong> (localhost/phpmyadmin)</p>
                    <p>2. Run <code className="bg-orange-900/30 px-1 rounded">database/schema.sql</code></p>
                    <p>3. Run <code className="bg-orange-900/30 px-1 rounded">database/seed.sql</code></p>
                    <p>4. Ensure WAMP MySQL service is running</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                isLocked
                  ? "bg-amber-700/60 cursor-not-allowed text-amber-200 shadow-amber-900/30"
                  : "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : isLocked ? (
                <><Lock className="h-4 w-4" /> Account Temporarily Locked</>
              ) : (
                <><Shield className="h-4 w-4" /> Sign In Securely</>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center mb-3">Demo Credentials (password: <code className="text-slate-400">password</code>)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { role: "Admin", user: "admin", color: "hover:border-purple-500/40 hover:bg-purple-500/5" },
                { role: "Reception", user: "receptionist", color: "hover:border-blue-500/40 hover:bg-blue-500/5" },
                { role: "Manager", user: "manager", color: "hover:border-emerald-500/40 hover:bg-emerald-500/5" },
                { role: "Technician", user: "technician", color: "hover:border-orange-500/40 hover:bg-orange-500/5" },
              ].map(({ role, user, color }) => (
                <button
                  key={user}
                  type="button"
                  onClick={() => { setUsername(user); setPassword("password"); setError(""); setIsDbError(false); setIsLocked(false); setAttemptsRemaining(null) }}
                  className={`text-xs bg-white/5 border border-white/10 rounded-lg py-2.5 px-2 text-slate-400 hover:text-white transition-all text-center ${color}`}
                >
                  <div className="font-medium">{role}</div>
                  <div className="text-slate-600 text-[10px]">{user}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} COCOBOD CHED · Secure Access System
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginForm />
    </Suspense>
  )
}
