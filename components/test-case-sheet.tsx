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
  RefreshCw, Edit, Eye, Save, X, Plus, TestTube,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate } from "@/lib/utils"
import * as XLSX from "xlsx"

interface TestCase {
  _id: string
  id: string
  scenario: string
  steps: string
  expected: string
  actual: string
  status: "Not Started" | "In Progress" | "Passed" | "Failed" | "Blocked"
  remarks: string
  priority: "Low" | "Medium" | "High" | "Critical"
  category: string
  assignee?: { _id: string; name: string; email: string; role: string }
  createdBy: { _id: string; name: string; email: string; role: string }
  createdAt: string
  updatedAt: string
  aiGenerated?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Blocked: "bg-amber-100 text-amber-700",
  "Not Started": "bg-gray-100 text-gray-600",
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
}

const CATEGORIES = [
  "Functional", "UI/UX", "Performance", "Security",
  "Integration", "API", "Database", "Mobile", "Web", "Other",
]

const BLANK_TC = {
  scenario: "", steps: "", expected: "", actual: "",
  status: "Not Started" as const, remarks: "", priority: "Medium" as const, category: "Functional",
}

function token() { return localStorage.getItem("token") }

export function TestCaseSheet({ projectId }: { projectId?: string }) {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiSummary, setAiSummary] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Dialogs
  const [viewTC, setViewTC] = useState<TestCase | null>(null)
  const [editTC, setEditTC] = useState<TestCase | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTC, setManualTC] = useState<typeof BLANK_TC>({ ...BLANK_TC })

  const { toast } = useToast()
  const { user } = useAuth()

  const fetchTestCases = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const url = `/api/test-cases${projectId ? `?projectId=${projectId}` : ""}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) setTestCases(await res.json())
      else toast({ title: "Error", description: "Failed to load test cases", variant: "destructive" })
    } catch {
      toast({ title: "Error", description: "Failed to load test cases", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [user, projectId, toast])

  useEffect(() => { fetchTestCases() }, [fetchTestCases])

  // ── AI Generation ────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    if (!aiSummary.trim()) return
    setGenerating(true)
    try {
      const aiRes = await fetch("/api/ai/generate-test-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: aiSummary }),
      })
      if (!aiRes.ok) throw new Error("AI generation failed")
      const aiData = await aiRes.json()

      const res = await fetch(`/api/test-cases${projectId ? `?projectId=${projectId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...aiData, actual: "", remarks: "", status: "Not Started", aiGenerated: true, projectId }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const created = await res.json()
      setTestCases((prev) => [created, ...prev])
      setAiSummary("")
      toast({ title: "Test case generated ✨", description: `"${created.scenario.slice(0, 60)}…"` })
    } catch {
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const regenerateTC = async (tc: TestCase) => {
    setGenerating(true)
    try {
      const aiRes = await fetch("/api/ai/generate-test-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: tc.scenario }),
      })
      if (!aiRes.ok) throw new Error()
      const aiData = await aiRes.json()

      const res = await fetch(`/api/test-cases/${tc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ steps: aiData.steps, expected: aiData.expected, priority: aiData.priority, category: aiData.category, aiGenerated: true }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setTestCases((prev) => prev.map((t) => (t.id === tc.id ? updated : t)))
      toast({ title: "Regenerated ✨" })
    } catch {
      toast({ title: "Regeneration failed", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const saveManual = async () => {
    if (!manualTC.scenario.trim() || !manualTC.steps.trim() || !manualTC.expected.trim()) {
      toast({ title: "Validation error", description: "Scenario, steps and expected result are required", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/test-cases${projectId ? `?projectId=${projectId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...manualTC, aiGenerated: false, projectId }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setTestCases((prev) => [created, ...prev])
      setManualOpen(false)
      setManualTC({ ...BLANK_TC })
      toast({ title: "Test case created ✅" })
    } catch {
      toast({ title: "Failed to create", variant: "destructive" })
    }
  }

  const saveEdit = async () => {
    if (!editTC) return
    try {
      const res = await fetch(`/api/test-cases/${editTC.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(editTC),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setTestCases((prev) => prev.map((t) => (t.id === editTC.id ? updated : t)))
      setEditTC(null)
      toast({ title: "Test case updated ✅" })
    } catch {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const deleteTC = async (id: string) => {
    if (!confirm("Delete this test case?")) return
    try {
      const res = await fetch(`/api/test-cases/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error()
      setTestCases((prev) => prev.filter((t) => t.id !== id))
      toast({ title: "Test case deleted" })
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = filtered.map((tc) => ({
      ID: tc.id,
      Scenario: tc.scenario,
      Steps: tc.steps,
      Expected: tc.expected,
      Actual: tc.actual,
      Status: tc.status,
      Priority: tc.priority,
      Category: tc.category,
      Assignee: tc.assignee?.name ?? "",
      "Created By": tc.createdBy.name,
      "Created At": formatDate(tc.createdAt),
      Remarks: tc.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Test Cases")
    XLSX.writeFile(wb, `TestCases_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = testCases.filter((tc) => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q || tc.scenario.toLowerCase().includes(q) || tc.category.toLowerCase().includes(q)
    const matchStatus = statusFilter === "all" || tc.status === statusFilter
    const matchPriority = priorityFilter === "all" || tc.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard label="Total" value={testCases.length} />
        <StatCard label="AI Generated" value={testCases.filter((t) => t.aiGenerated).length} colorClass="text-blue-600" />
        <StatCard label="Passed" value={testCases.filter((t) => t.status === "Passed").length} colorClass="text-emerald-600" />
        <StatCard label="Failed" value={testCases.filter((t) => t.status === "Failed").length} colorClass="text-red-600" />
        <StatCard label="In Progress" value={testCases.filter((t) => t.status === "In Progress").length} colorClass="text-blue-500" />
        <StatCard label="Blocked" value={testCases.filter((t) => t.status === "Blocked").length} colorClass="text-amber-600" />
      </div>

      {/* AI Generator */}
      <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">AI Test Case Generator</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {process.env.NEXT_PUBLIC_AI_ENABLED !== "false" ? "Powered by Gemini" : "Using smart fallback"}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. user login with invalid credentials, payment with expired card…"
            value={aiSummary}
            onChange={(e) => setAiSummary(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !generating && generateWithAI()}
            disabled={generating}
            className="bg-white"
          />
          <Button
            onClick={generateWithAI}
            disabled={!aiSummary.trim() || generating}
            className="shrink-0 bg-blue-600 hover:bg-blue-700"
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
              placeholder="Search test cases…"
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
              {["Not Started", "In Progress", "Passed", "Failed", "Blocked"].map((s) => (
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
          <Button variant="outline" size="sm" onClick={fetchTestCases}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => { setManualTC({ ...BLANK_TC }); setManualOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Manually
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TestTube}
          title="No test cases found"
          description={searchTerm || statusFilter !== "all" || priorityFilter !== "all"
            ? "Try adjusting your filters"
            : "Generate your first test case with AI or add one manually"}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-28 font-semibold">ID</TableHead>
                  <TableHead className="min-w-[200px] font-semibold">Scenario</TableHead>
                  <TableHead className="w-24 font-semibold">Priority</TableHead>
                  <TableHead className="w-28 font-semibold">Category</TableHead>
                  <TableHead className="w-28 font-semibold">Status</TableHead>
                  <TableHead className="w-28 font-semibold">Created By</TableHead>
                  <TableHead className="w-24 font-semibold">Date</TableHead>
                  <TableHead className="w-32 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tc) => (
                  <TableRow key={tc._id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {tc.id}
                        {tc.aiGenerated && (
                          <Sparkles className="w-3 h-3 text-blue-400" title="AI generated" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-2" title={tc.scenario}>{tc.scenario}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${PRIORITY_COLORS[tc.priority]}`}>{tc.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tc.category}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[tc.status]}`}>{tc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{tc.createdBy.name}</div>
                      <div className="text-muted-foreground">{tc.createdBy.role}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(tc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setViewTC(tc)} title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setEditTC({ ...tc })} title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {tc.aiGenerated && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => regenerateTC(tc)} disabled={generating} title="Regenerate">
                            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteTC(tc.id)} title="Delete">
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
      <Dialog open={!!viewTC} onOpenChange={() => setViewTC(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewTC?.id}
              {viewTC?.aiGenerated && <Sparkles className="w-4 h-4 text-blue-400" />}
            </DialogTitle>
          </DialogHeader>
          {viewTC && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Priority", <Badge className={`text-xs ${PRIORITY_COLORS[viewTC.priority]}`}>{viewTC.priority}</Badge>],
                  ["Status", <Badge className={`text-xs ${STATUS_COLORS[viewTC.status]}`}>{viewTC.status}</Badge>],
                  ["Category", viewTC.category],
                  ["Assignee", viewTC.assignee?.name ?? "Unassigned"],
                  ["Created By", `${viewTC.createdBy.name} (${viewTC.createdBy.role})`],
                  ["Created", formatDate(viewTC.createdAt)],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="text-xs text-muted-foreground font-medium mb-0.5">{label}</div>
                    <div>{val}</div>
                  </div>
                ))}
              </div>
              {[
                ["Scenario", viewTC.scenario],
                ["Test Steps", viewTC.steps],
                ["Expected Result", viewTC.expected],
                ["Actual Result", viewTC.actual || "Not yet executed"],
                ["Remarks", viewTC.remarks || "—"],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                  <div className="rounded-lg bg-gray-50 border px-3 py-2 whitespace-pre-wrap text-sm">{val}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!editTC} onOpenChange={() => setEditTC(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test Case — {editTC?.id}</DialogTitle>
          </DialogHeader>
          {editTC && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editTC.priority} onValueChange={(v: any) => setEditTC({ ...editTC, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High", "Critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editTC.status} onValueChange={(v: any) => setEditTC({ ...editTC, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Not Started", "In Progress", "Passed", "Failed", "Blocked"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editTC.category} onValueChange={(v) => setEditTC({ ...editTC, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Scenario</Label>
                <Textarea rows={2} value={editTC.scenario} onChange={(e) => setEditTC({ ...editTC, scenario: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Test Steps</Label>
                <Textarea rows={5} value={editTC.steps} onChange={(e) => setEditTC({ ...editTC, steps: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expected Result</Label>
                  <Textarea rows={3} value={editTC.expected} onChange={(e) => setEditTC({ ...editTC, expected: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Result</Label>
                  <Textarea rows={3} value={editTC.actual} onChange={(e) => setEditTC({ ...editTC, actual: e.target.value })} placeholder="Fill after execution…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Textarea rows={2} value={editTC.remarks} onChange={(e) => setEditTC({ ...editTC, remarks: e.target.value })} placeholder="Optional notes…" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-1.5" />Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditTC(null)}>
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
            <DialogTitle>Create Test Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={manualTC.priority} onValueChange={(v: any) => setManualTC({ ...manualTC, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={manualTC.status} onValueChange={(v: any) => setManualTC({ ...manualTC, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Not Started", "In Progress", "Passed", "Failed", "Blocked"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={manualTC.category} onValueChange={(v) => setManualTC({ ...manualTC, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scenario *</Label>
              <Textarea rows={2} value={manualTC.scenario} onChange={(e) => setManualTC({ ...manualTC, scenario: e.target.value })} placeholder="Describe what you want to test…" />
            </div>
            <div className="space-y-1.5">
              <Label>Test Steps *</Label>
              <Textarea rows={5} value={manualTC.steps} onChange={(e) => setManualTC({ ...manualTC, steps: e.target.value })} placeholder={"1. Navigate to…\n2. Click…\n3. Verify…"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expected Result *</Label>
                <Textarea rows={3} value={manualTC.expected} onChange={(e) => setManualTC({ ...manualTC, expected: e.target.value })} placeholder="What should happen…" />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Result</Label>
                <Textarea rows={3} value={manualTC.actual} onChange={(e) => setManualTC({ ...manualTC, actual: e.target.value })} placeholder="Fill after execution…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea rows={2} value={manualTC.remarks} onChange={(e) => setManualTC({ ...manualTC, remarks: e.target.value })} placeholder="Optional notes…" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveManual}>
                <Plus className="w-4 h-4 mr-1.5" />Create Test Case
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
