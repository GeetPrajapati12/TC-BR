"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Search, RefreshCw, Activity, User, Filter } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime, formatAction } from "@/lib/utils"

interface ActivityLog {
  _id: string
  user: { _id: string; name: string; email: string; role: string }
  action: string
  entityType?: string
  entityId?: string
  description: string
  details?: Record<string, unknown>
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const ACTION_COLORS: Record<string, string> = {
  created_test_case: "bg-emerald-100 text-emerald-700",
  created_bug_report: "bg-emerald-100 text-emerald-700",
  created_project: "bg-emerald-100 text-emerald-700",
  user_registered: "bg-emerald-100 text-emerald-700",
  company_created: "bg-emerald-100 text-emerald-700",
  updated_test_case: "bg-blue-100 text-blue-700",
  updated_bug_report: "bg-blue-100 text-blue-700",
  updated_project: "bg-blue-100 text-blue-700",
  status_changed: "bg-blue-100 text-blue-700",
  deleted_test_case: "bg-red-100 text-red-700",
  deleted_bug_report: "bg-red-100 text-red-700",
  deleted_project: "bg-red-100 text-red-700",
  user_login: "bg-amber-100 text-amber-700",
  user_logout: "bg-gray-100 text-gray-600",
  assigned_task: "bg-purple-100 text-purple-700",
}

function token() { return localStorage.getItem("token") }

export function LogsSheet({ projectId }: { projectId?: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchLogs = useCallback(async (page = 1) => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" })
      if (projectId) params.set("projectId", projectId)
      const res = await fetch(`/api/logs?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      } else {
        toast({ title: "Error", description: "Failed to load activity logs", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to load activity logs", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [user, projectId, toast])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  const filtered = logs.filter((log) => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q
      || log.description.toLowerCase().includes(q)
      || log.user.name.toLowerCase().includes(q)
      || log.user.email.toLowerCase().includes(q)
    const matchAction = actionFilter === "all" || log.action === actionFilter
    const matchUser = userFilter === "all" || log.user._id === userFilter
    return matchSearch && matchAction && matchUser
  })

  const uniqueActions = [...new Set(logs.map((l) => l.action))]
  const uniqueUsers = Object.values(
    Object.fromEntries(logs.map((l) => [l.user._id, l.user]))
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={pagination.total} />
        <StatCard label="Created" value={logs.filter((l) => l.action.startsWith("created")).length} colorClass="text-emerald-600" />
        <StatCard label="Updated" value={logs.filter((l) => l.action.startsWith("updated")).length} colorClass="text-blue-600" />
        <StatCard label="Active Users" value={uniqueUsers.length} colorClass="text-purple-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search activity…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((a) => <SelectItem key={a} value={a}>{formatAction(a)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading activity…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity found"
          description={searchTerm || actionFilter !== "all" || userFilter !== "all"
            ? "Try adjusting your filters"
            : "Activity will appear here as your team works"}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-36 font-semibold">User</TableHead>
                  <TableHead className="w-20 font-semibold">Role</TableHead>
                  <TableHead className="w-40 font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="w-40 font-semibold">Date &amp; Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log._id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="text-sm font-medium">{log.user.name}</div>
                      <div className="text-xs text-muted-foreground">{log.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{log.description}</p>
                      {log.entityId && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{log.entityId}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page === 1 || loading}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
            <span className="ml-2 text-xs">({pagination.total} total)</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page === pagination.pages || loading}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
