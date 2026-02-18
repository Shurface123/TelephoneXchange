import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": ["admin"],
  "/receptionist": ["admin", "receptionist"],
  "/calls": ["admin", "receptionist"],
  "/billing": ["admin"],
  "/reports": ["admin"],
  "/maintenance": ["admin", "technician"],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route is protected
  const requiredRoles = protectedRoutes[pathname as keyof typeof protectedRoutes]

  if (requiredRoles) {
    const sessionToken = request.cookies.get("auth-session")?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      // Decode session data
      const sessionData = JSON.parse(Buffer.from(sessionToken, "base64").toString())

      // Check if session is expired (8 hours)
      const sessionAge = Date.now() - sessionData.timestamp
      const maxAge = 8 * 60 * 60 * 1000 // 8 hours in milliseconds

      if (sessionAge > maxAge) {
        return NextResponse.redirect(new URL("/login", request.url))
      }

      // Check if user has required role
      if (!requiredRoles.includes(sessionData.role)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }

      // Add user info to headers for use in components
      const response = NextResponse.next()
      response.headers.set("x-user-id", sessionData.userId.toString())
      response.headers.set("x-user-role", sessionData.role)
      response.headers.set("x-user-name", sessionData.name)

      return response
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/receptionist/:path*",
    "/calls/:path*",
    "/billing/:path*",
    "/reports/:path*",
    "/maintenance/:path*",
  ],
}
