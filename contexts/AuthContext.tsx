"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Company {
  _id: string
  name: string
  slug: string
}

interface User {
  _id: string
  name: string
  email: string
  role: string
  company: Company
  isCompanyAdmin?: boolean
  isActive?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, companyName: string) => Promise<boolean>
  register: (
    name: string,
    email: string,
    password: string,
    role: string,
    companyName: string,
    isAdmin?: boolean,
    companyDescription?: string,
    industry?: string
  ) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        localStorage.removeItem("token")
        setUser(null)
      }
    } catch {
      localStorage.removeItem("token")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string, companyName: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, companyName }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem("token", data.token)
        setUser(data.user)
        toast({ title: "Welcome back!", description: `Signed in as ${data.user.name}` })
        return true
      }
      toast({ title: "Sign in failed", description: data.message, variant: "destructive" })
      return false
    } catch {
      toast({ title: "Sign in failed", description: "Check your connection and try again", variant: "destructive" })
      return false
    }
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string,
    companyName: string,
    isAdmin?: boolean,
    companyDescription?: string,
    industry?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, companyName, isAdmin, companyDescription, industry }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "Account created", description: "Sign in to continue" })
        return true
      }
      toast({ title: "Registration failed", description: data.message, variant: "destructive" })
      return false
    } catch {
      toast({ title: "Registration failed", description: "Check your connection and try again", variant: "destructive" })
      return false
    }
  }

  const logout = async () => {
    const token = getToken()
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch {
      // Ignore — still clear local state
    } finally {
      localStorage.removeItem("token")
      setUser(null)
      router.push("/login")
      toast({ title: "Signed out" })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
