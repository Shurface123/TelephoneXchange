import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes requiring authentication (any logged-in user)
const authRequiredRoutes = ["/", "/receptionist", "/calls", "/billing", "/reports", "/maintenance", "/admin", "/manager"]

// Role-based restrictions (on top of auth requirement)
const roleRestrictedRoutes: Record<string, string[]> = {
  "/admin": ["admin"],
  "/receptionist": ["admin", "receptionist"],
  "/calls": ["admin", "receptionist"],
  "/billing": ["admin", "receptionist"],
  "/reports": ["admin", "receptionist", "technician"],
  "/maintenance": ["admin", "technician"],
  "/manager": ["admin", "manager"],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected route
  const isProtected = authRequiredRoutes.some(route =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(route + "/")
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Get session cookie
  const sessionToken = request.cookies.get("auth-session")?.value

  // No session → redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const sessionData = JSON.parse(Buffer.from(sessionToken, "base64").toString())

    // Check session expiry (1 hour — reduced from 8h per security audit)
    const sessionAge = Date.now() - sessionData.timestamp
    if (sessionAge > 60 * 60 * 1000) {
      const response = NextResponse.redirect(new URL("/login?expired=1", request.url))
      response.cookies.delete("auth-session")
      return response
    }

    // Check role-based access
    const requiredRoles = roleRestrictedRoutes[pathname] ??
      Object.entries(roleRestrictedRoutes).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1]

    if (requiredRoles && !requiredRoles.includes(sessionData.role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Attach user info to headers
    const response = NextResponse.next()
    response.headers.set("x-user-id", String(sessionData.userId))
    response.headers.set("x-user-role", sessionData.role)
    response.headers.set("x-user-name", sessionData.name)
    return response

  } catch {
    // Corrupt session → clear and redirect
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("auth-session")
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - /login, /api/*, /_next/*, static files
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|unauthorized).*)",
  ],
}
