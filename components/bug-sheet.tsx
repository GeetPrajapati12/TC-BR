"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Trash2, Download, Search, Filter, Sparkles,
  RefreshCw, Edit, Eye, Save, X, Plus, Bug,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate } from "@/lib/utils"
import * as XLSX from "xlsx"

interface BugReport {
  _id: string
  id: string
  summary: string
  description: string
  steps: string
  expected: string
  actual: string
  priority: "Low" | "Medium" | "High" | "Critical"
  severity: "Minor" | "Major" | "Critical" | "Blocker"
  status: "Open" | "In Progress" | "Resolved" | "Closed" | "Reopened"
  environment: string
  category: string
  assignee?: { _id: string; name: string; role: string }
  reporter: { _id: string; name: string; email: string; role: string }
  createdAt: string
  aiGenerated?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-gray-100 text-gray-600",
  Reopened: "bg-purple-100 text-purple-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
}

const SEVERITY_COLORS: Record<string, string> = {
  Blocker: "bg-red-100 text-red-700",
  Critical: "bg-orange-100 text-orange-700",
  Major: "bg-yellow-100 text-yellow-700",
  Minor: "bg-green-100 text-green-700",
}

const CATEGORIES = [
  "Crash", "UI", "Performance", "Security", "Payment",
  "Data", "Network", "Integration", "Functional", "Other",
]

const BLANK_BUG = {
  summary: "", description: "", steps: "", expected: "", actual: "",
  priority: "Medium" as const, severity: "Major" as const,
  status: "Open" as const, environment: "", category: "Functional",
}

function token() { return localStorage.getItem("token") }

export function BugSheet({ projectId }: { projectId?: string }) {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiSummary, setAiSummary] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const [viewBug, setViewBug] = useState<BugReport | null>(null)
  const [editBug, setEditBug] = useState<BugReport | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualBug, setManualBug] = useState<typeof BLANK_BUG>({ ...BLANK_BUG })

  const { toast } = useToast()
  const { user } = useAuth()

  const fetchBugs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const url = `/api/bug-reports${projectId ? `?projectId=${projectId}` : ""}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) setBugs(await res.json())
      else toast({ title: "Error", description: "Failed to load bug reports", variant: "destructive" })
    } catch {
      toast({ title: "Error", description: "Failed to load bug reports", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [user, projectId, toast])

  useEffect(() => { fetchBugs() }, [fetchBugs])

  // ── AI Generation ─────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    if (!aiSummary.trim()) return
    setGenerating(true)
    try {
      const aiRes = await fetch("/api/ai/generate-bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: aiSummary }),
      })
      if (!aiRes.ok) throw new Error()
      const aiData = await aiRes.json()

      const res = await fetch(`/api/bug-reports${projectId ? `?projectId=${projectId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...aiData, summary: aiSummary, status: "Open", aiGenerated: true, projectId }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setBugs((prev) => [created, ...prev])
      setAiSummary("")
      toast({ title: "Bug report generated 🐛", description: `"${created.summary.slice(0, 60)}…"` })
    } catch {
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const regenerateBug = async (bug: BugReport) => {
    setGenerating(true)
    try {
      const aiRes = await fetch("/api/ai/generate-bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: bug.summary }),
      })
      if (!aiRes.ok) throw new Error()
      const aiData = await aiRes.json()

      const res = await fetch(`/api/bug-reports/${bug.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...aiData, aiGenerated: true }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)))
      toast({ title: "Regenerated ✨" })
    } catch {
      toast({ title: "Regeneration failed", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveManual = async () => {
    if (!manualBug.summary.trim() || !manualBug.steps.trim() || !manualBug.expected.trim() || !manualBug.actual.trim() || !manualBug.environment.trim()) {
      toast({ title: "Validation error", description: "Summary, steps, expected, actual and environment are required", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/bug-reports${projectId ? `?projectId=${projectId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...manualBug, aiGenerated: false, projectId }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setBugs((prev) => [created, ...prev])
      setManualOpen(false)
      setManualBug({ ...BLANK_BUG })
      toast({ title: "Bug report created ✅" })
    } catch {
      toast({ title: "Failed to create", variant: "destructive" })
    }
  }

  const saveEdit = async () => {
    if (!editBug) return
    try {
      const res = await fetch(`/api/bug-reports/${editBug.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(editBug),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setBugs((prev) => prev.map((b) => (b.id === editBug.id ? updated : b)))
      setEditBug(null)
      toast({ title: "Bug report updated ✅" })
    } catch {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const deleteBug = async (id: string) => {
    if (!confirm("Delete this bug report?")) return
    try {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error()
      setBugs((prev) => prev.filter((b) => b.id !== id))
      toast({ title: "Bug report deleted" })
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = filtered.map((b) => ({
      ID: b.id, Summary: b.summary, Description: b.description,
      Steps: b.steps, Expected: b.expected, Actual: b.actual,
      Priority: b.priority, Severity: b.severity, Status: b.status,
      Category: b.category, Environment: b.environment,
      Reporter: b.reporter.name, "Created At": formatDate(b.createdAt),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Bug Reports")
    XLSX.writeFile(wb, `BugReports_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = bugs.filter((b) => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q || b.summary.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    const matchStatus = statusFilter === "all" || b.status === statusFilter
    const matchPriority = priorityFilter === "all" || b.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard label="Total" value={bugs.length} />
        <StatCard label="AI Generated" value={bugs.filter((b) => b.aiGenerated).length} colorClass="text-blue-600" />
        <StatCard label="Open" value={bugs.filter((b) => b.status === "Open").length} colorClass="text-red-600" />
        <StatCard label="In Progress" value={bugs.filter((b) => b.status === "In Progress").length} colorClass="text-blue-500" />
        <StatCard label="Resolved" value={bugs.filter((b) => b.status === "Resolved").length} colorClass="text-emerald-600" />
        <StatCard label="High Priority" value={bugs.filter((b) => b.priority === "Critical" || b.priority === "High").length} colorClass="text-orange-600" />
      </div>

      {/* AI Generator */}
      <div className="rounded-xl border-2 border-red-100 bg-gradient-to-r from-red-50 to-pink-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-red-600" />
          <span className="font-semibold text-sm">AI Bug Report Generator</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. app crashes when uploading large files, payment fails with credit card…"
            value={aiSummary}
            onChange={(e) => setAiSummary(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !generating && generateWithAI()}
            disabled={generating}
            className="bg-white"
          />
          <Button
            onClick={generateWithAI}
            disabled={!aiSummary.trim() || generating}
            className="shrink-0 bg-red-600 hover:bg-red-700"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" />Generate</>
            )}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bug reports…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {["Open", "In Progress", "Resolved", "Closed", "Reopened"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {["Critical", "High", "Medium", "Low"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchBugs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />Export
          </Button>
          <Button size="sm" onClick={() => { setManualBug({ ...BLANK_BUG }); setManualOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />Add Manually
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No bug reports found"
          description={searchTerm || statusFilter !== "all" || priorityFilter !== "all"
            ? "Try adjusting your filters"
            : "Generate your first bug report with AI or add one manually"}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-28 font-semibold">ID</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Summary</TableHead>
                  <TableHead className="w-24 font-semibold">Priority</TableHead>
                  <TableHead className="w-24 font-semibold">Severity</TableHead>
                  <TableHead className="w-28 font-semibold">Status</TableHead>
                  <TableHead className="w-24 font-semibold">Category</TableHead>
                  <TableHead className="w-28 font-semibold">Reporter</TableHead>
                  <TableHead className="w-24 font-semibold">Date</TableHead>
                  <TableHead className="w-32 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((bug) => (
                  <TableRow key={bug._id} className="hover:bg-red-50/20 transition-colors">
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {bug.id}
                        {bug.aiGenerated && <Sparkles className="w-3 h-3 text-red-400" title="AI generated" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-2" title={bug.summary}>{bug.summary}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${PRIORITY_COLORS[bug.priority]}`}>{bug.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${SEVERITY_COLORS[bug.severity]}`}>{bug.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[bug.status]}`}>{bug.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{bug.category}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{bug.reporter.name}</div>
                      <div className="text-muted-foreground">{bug.reporter.role}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(bug.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                          onClick={() => setViewBug(bug)} title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setEditBug({ ...bug })} title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {bug.aiGenerated && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50"
                            onClick={() => regenerateBug(bug)} disabled={generating} title="Regenerate">
                            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          onClick={() => deleteBug(bug.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── View Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!viewBug} onOpenChange={() => setViewBug(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewBug?.id}
              {viewBug?.aiGenerated && <Sparkles className="w-4 h-4 text-red-400" />}
            </DialogTitle>
          </DialogHeader>
          {viewBug && (
            <div className="space-y-4 text-sm">
              <div className="font-semibold text-base">{viewBug.summary}</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Priority", <Badge className={`text-xs ${PRIORITY_COLORS[viewBug.priority]}`}>{viewBug.priority}</Badge>],
                  ["Severity", <Badge className={`text-xs ${SEVERITY_COLORS[viewBug.severity]}`}>{viewBug.severity}</Badge>],
                  ["Status", <Badge className={`text-xs ${STATUS_COLORS[viewBug.status]}`}>{viewBug.status}</Badge>],
                  ["Category", viewBug.category],
                  ["Reporter", `${viewBug.reporter.name} (${viewBug.reporter.role})`],
                  ["Date", formatDate(viewBug.createdAt)],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="text-xs text-muted-foreground font-medium mb-0.5">{label}</div>
                    <div>{val}</div>
                  </div>
                ))}
              </div>
              {[
                ["Description", viewBug.description],
                ["Steps to Reproduce", viewBug.steps],
                ["Expected", viewBug.expected],
                ["Actual", viewBug.actual],
                ["Environment", viewBug.environment],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                  <div className="rounded-lg bg-gray-50 border px-3 py-2 whitespace-pre-wrap">{val}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!editBug} onOpenChange={() => setEditBug(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bug Report — {editBug?.id}</DialogTitle>
          </DialogHeader>
          {editBug && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["priority", "severity", "status", "category"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="capitalize">{field}</Label>
                    <Select value={editBug[field]} onValueChange={(v: any) => setEditBug({ ...editBug, [field]: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {field === "priority" && ["Low", "Medium", "High", "Critical"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        {field === "severity" && ["Minor", "Major", "Critical", "Blocker"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        {field === "status" && ["Open", "In Progress", "Resolved", "Closed", "Reopened"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        {field === "category" && CATEGORIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Summary</Label>
                <Input value={editBug.summary} onChange={(e) => setEditBug({ ...editBug, summary: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={editBug.description} onChange={(e) => setEditBug({ ...editBug, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Steps to Reproduce</Label>
                <Textarea rows={4} value={editBug.steps} onChange={(e) => setEditBug({ ...editBug, steps: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expected</Label>
                  <Textarea rows={3} value={editBug.expected} onChange={(e) => setEditBug({ ...editBug, expected: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual</Label>
                  <Textarea rows={3} value={editBug.actual} onChange={(e) => setEditBug({ ...editBug, actual: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Environment</Label>
                <Input value={editBug.environment} onChange={(e) => setEditBug({ ...editBug, environment: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-1.5" />Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditBug(null)}>
                  <X className="w-4 h-4 mr-1.5" />Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manual Create Dialog ─────────────────────────────────────────── */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Bug Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["priority", "severity", "status", "category"] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="capitalize">{field}</Label>
                  <Select value={manualBug[field]} onValueChange={(v: any) => setManualBug({ ...manualBug, [field]: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {field === "priority" && ["Low", "Medium", "High", "Critical"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      {field === "severity" && ["Minor", "Major", "Critical", "Blocker"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      {field === "status" && ["Open", "In Progress", "Resolved", "Closed", "Reopened"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      {field === "category" && CATEGORIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Summary *</Label>
              <Input value={manualBug.summary} onChange={(e) => setManualBug({ ...manualBug, summary: e.target.value })} placeholder="Brief description of the bug…" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={manualBug.description} onChange={(e) => setManualBug({ ...manualBug, description: e.target.value })} placeholder="Detailed description and impact…" />
            </div>
            <div className="space-y-1.5">
              <Label>Steps to Reproduce *</Label>
              <Textarea rows={4} value={manualBug.steps} onChange={(e) => setManualBug({ ...manualBug, steps: e.target.value })} placeholder={"1. Go to…\n2. Click…\n3. Observe…"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expected *</Label>
                <Textarea rows={3} value={manualBug.expected} onChange={(e) => setManualBug({ ...manualBug, expected: e.target.value })} placeholder="What should happen…" />
              </div>
              <div className="space-y-1.5">
                <Label>Actual *</Label>
                <Textarea rows={3} value={manualBug.actual} onChange={(e) => setManualBug({ ...manualBug, actual: e.target.value })} placeholder="What actually happens…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Environment *</Label>
              <Input value={manualBug.environment} onChange={(e) => setManualBug({ ...manualBug, environment: e.target.value })} placeholder="e.g. Windows 11, Chrome 120, Production" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveManual}>
                <Plus className="w-4 h-4 mr-1.5" />Create Bug Report
              </Button>
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                <X className="w-4 h-4 mr-1.5" />Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
