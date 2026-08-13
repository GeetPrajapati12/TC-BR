"use client"

import { TestTube2, LogOut, User, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
}

export function AppHeader({ breadcrumbs }: AppHeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo + breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/projects" className="flex items-center gap-1.5 shrink-0">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <TestTube2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm hidden sm:block">QA Tool</span>
          </Link>

          {breadcrumbs?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2 min-w-0">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-sm text-muted-foreground hover:text-foreground truncate transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium truncate">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>

        {/* Right: User + logout */}
        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-right leading-tight">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.company?.name}</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {user.role}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
