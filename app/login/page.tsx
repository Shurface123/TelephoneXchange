"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, Shield, AlertCircle, Database, Lock } from "lucide-react"

// COCOBOD Ghana Cocoa Board Logo SVG
function CocobodLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="60" cy="60" r="57" fill="none" stroke="#D4AF37" strokeWidth="4" />
      <circle cx="60" cy="60" r="50" fill="#2C1810" />
      {/* Inner decorative ring */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Cocoa pod body */}
      <ellipse cx="60" cy="62" rx="14" ry="22" fill="#8B6914" />
      <ellipse cx="60" cy="62" rx="11" ry="19" fill="#C8A951" />
      {/* Pod ridges */}
      {[-6,-3,0,3,6].map((x, i) => (
        <line key={i} x1={60+x} y1="43" x2={60+x} y2="81" stroke="#8B6914" strokeWidth="0.8" opacity="0.6" />
      ))}
      {/* Stem */}
      <rect x="57.5" y="38" width="5" height="8" rx="2" fill="#5C3D11" />
      {/* Left leaf */}
      <path d="M46 50 Q30 38 32 22 Q44 35 46 50Z" fill="#2D5016" />
      <line x1="46" y1="50" x2="34" y2="26" stroke="#1A3A0A" strokeWidth="0.8" />
      {/* Right leaf */}
      <path d="M74 50 Q90 38 88 22 Q76 35 74 50Z" fill="#2D5016" />
      <line x1="74" y1="50" x2="86" y2="26" stroke="#1A3A0A" strokeWidth="0.8" />
      {/* Lower left leaf */}
      <path d="M48 70 Q28 72 25 55 Q40 62 48 70Z" fill="#3A6B1A" />
      {/* Lower right leaf */}
      <path d="M72 70 Q92 72 95 55 Q80 62 72 70Z" fill="#3A6B1A" />
      {/* Text arc top */}
      <path id="topArc" d="M 18 60 A 42 42 0 0 1 102 60" fill="none" />
      <text fontSize="7.5" fill="#D4AF37" fontFamily="serif" fontWeight="bold" letterSpacing="1">
        <textPath href="#topArc" startOffset="8%">GHANA COCOA BOARD</textPath>
      </text>
      {/* Text arc bottom */}
      <path id="botArc" d="M 20 65 A 40 40 0 0 0 100 65" fill="none" />
      <text fontSize="6.5" fill="#D4AF37" fontFamily="serif" letterSpacing="1.5">
        <textPath href="#botArc" startOffset="14%">COCOBOD · CHED</textPath>
      </text>
    </svg>
  )
}

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1A0A00 0%, #2C1810 40%, #3D1F0D 70%, #1A0A00 100%)" }}>

      {/* Animated background orbs — cocoa-themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: "rgba(212,175,55,0.08)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: "rgba(114,47,55,0.15)", animationDelay: "1.5s" }} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{ background: "rgba(45,80,22,0.06)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(212,175,55,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-5">
            <CocobodLogo className="w-24 h-24 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#F5E6C8" }}>CHED Exchange</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#D4AF37" }}>
            Ghana Cocoa Board · Telephone Management System
          </p>
          <p className="text-xs mt-2" style={{ color: "rgba(245,230,200,0.35)" }}>{currentTime}</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(212,175,55,0.2)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.1)",
            ...(shake ? { animation: "shake 0.5s ease-in-out" } : {})
          }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold" style={{ color: "#F5E6C8" }}>Secure Sign In</h2>
            <p className="text-sm mt-1" style={{ color: "rgba(245,230,200,0.5)" }}>
              Enter your authorised credentials to access the system
            </p>
          </div>

          {error && (
            <div className={`flex items-start gap-2 rounded-lg px-4 py-3 mb-5 text-sm border ${
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
                    <p>4. Run <code className="bg-orange-900/30 px-1 rounded">database/migration_001_all_fixes.sql</code></p>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(245,230,200,0.7)" }}>
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full rounded-lg px-4 py-3 text-sm transition-all focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  color: "#F5E6C8",
                }}
                onFocus={e => { e.target.style.border = "1px solid rgba(212,175,55,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.1)" }}
                onBlur={e => { e.target.style.border = "1px solid rgba(212,175,55,0.2)"; e.target.style.boxShadow = "none" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(245,230,200,0.7)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-lg px-4 py-3 pr-12 text-sm transition-all focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    color: "#F5E6C8",
                  }}
                  onFocus={e => { e.target.style.border = "1px solid rgba(212,175,55,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.1)" }}
                  onBlur={e => { e.target.style.border = "1px solid rgba(212,175,55,0.2)"; e.target.style.boxShadow = "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(212,175,55,0.5)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#D4AF37")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.5)")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: isLocked
                  ? "rgba(180,120,40,0.3)"
                  : loading
                  ? "#8B6914"
                  : "linear-gradient(135deg, #8B1A1A 0%, #722F37 50%, #8B1A1A 100%)",
                color: isLocked ? "rgba(212,175,55,0.5)" : "#F5E6C8",
                border: "1px solid rgba(212,175,55,0.3)",
                boxShadow: isLocked ? "none" : "0 4px 20px rgba(139,26,26,0.4)",
                cursor: isLocked || loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => {
                if (!loading && !isLocked) {
                  (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #A01F1F 0%, #8B3040 50%, #A01F1F 100%)"
                  ;(e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(139,26,26,0.5)"
                }
              }}
              onMouseLeave={e => {
                if (!loading && !isLocked) {
                  (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #8B1A1A 0%, #722F37 50%, #8B1A1A 100%)"
                  ;(e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(139,26,26,0.4)"
                }
              }}
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
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(245,230,200,0.2)" }}>
          © {new Date().getFullYear()} Ghana Cocoa Board · CHED Exchange · Authorised Access Only
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        input::placeholder { color: rgba(245,230,200,0.25) !important; }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#1A0A00" }} />}>
      <LoginForm />
    </Suspense>
  )
}
