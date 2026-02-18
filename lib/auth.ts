export interface User {
    id: number
    username: string
    email: string
    role: string
    name: string
  }
  
  export async function getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        return data.user
      }
      return null
    } catch (error) {
      return null
    }
  }
  
  export async function login(
    username: string,
    password: string,
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
  
      const data = await response.json()
  
      if (response.ok) {
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }
  
  export async function logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }
  