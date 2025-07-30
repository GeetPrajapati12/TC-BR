"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trash2, Download, Search, Filter, Sparkles, RefreshCw, Edit, Eye, Save, X } from "lucide-react"
import { generateBugReportWithAI } from "@/lib/ai-generator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import * as XLSX from "xlsx"

interface Bug {
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
  assignee?: {
    _id: string
    name: string
    email: string
    role: string
  }
  reporter: {
    _id: string
    name: string
    email: string
    role: string
  }
  category: string
  createdAt: string
  updatedAt: string
  aiGenerated?: boolean
}

export function BugSheet() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [summary, setSummary] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingBug, setEditingBug] = useState<Bug | null>(null)
  const [viewingBug, setViewingBug] = useState<Bug | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false)
  const [manualBug, setManualBug] = useState<Partial<Bug>>({
    summary: "",
    description: "",
    steps: "",
    expected: "",
    actual: "",
    priority: "Medium",
    severity: "Major",
    status: "Open",
    environment: "",
    category: "Functional",
  })

  useEffect(() => {
    fetchBugReports()
  }, [])

  const fetchBugReports = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/bug-reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBugs(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch bug reports",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch bug reports:", error)
      toast({
        title: "Error",
        description: "Failed to fetch bug reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateBugFromSummary = async (summary: string) => {
    if (!summary.trim()) return

    setIsGenerating(true)
    try {
      // Use AI to generate comprehensive bug report (with fallback)
      const aiResult = await generateBugReportWithAI(summary)

      const newBugReport = {
        summary,
        description: aiResult.description,
        steps: aiResult.steps,
        expected: aiResult.expected,
        actual: aiResult.actual,
        priority: aiResult.priority,
        severity: aiResult.severity,
        status: "Open" as const,
        environment: aiResult.environment,
        category: aiResult.category,
        aiGenerated: true,
      }

      const token = localStorage.getItem("token")
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBugReport),
      })

      if (response.ok) {
        const createdBugReport = await response.json()
        setBugs([createdBugReport, ...bugs])
        setSummary("")

        toast({
          title: "Bug Report Generated! 🐛",
          description: `Comprehensive bug report created for "${summary}"`,
        })
      } else {
        throw new Error("Failed to create bug report")
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate bug report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateBugReport = async (bug: Bug) => {
    setIsGenerating(true)
    try {
      const aiResult = await generateBugReportWithAI(bug.summary)

      const updates = {
        description: aiResult.description,
        steps: aiResult.steps,
        expected: aiResult.expected,
        actual: aiResult.actual,
        priority: aiResult.priority,
        severity: aiResult.severity,
        category: aiResult.category,
        environment: aiResult.environment,
        aiGenerated: true,
      }

      const token = localStorage.getItem("token")
      const response = await fetch(`/api/bug-reports/${bug.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedBug = await response.json()
        setBugs(bugs.map((b) => (b.id === bug.id ? updatedBug : b)))

        toast({
          title: "Bug Report Regenerated! 🐛",
          description: "AI has updated the bug report with fresh analysis",
        })
      } else {
        throw new Error("Failed to regenerate bug report")
      }
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate bug report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const openEditDialog = (bug: Bug) => {
    setEditingBug({ ...bug })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (bug: Bug) => {
    setViewingBug(bug)
    setIsViewDialogOpen(true)
  }

  const saveEditedBug = async () => {
    if (!editingBug) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/bug-reports/${editingBug.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingBug),
      })

      if (response.ok) {
        const updatedBug = await response.json()
        setBugs(bugs.map((b) => (b.id === editingBug.id ? updatedBug : b)))
        setIsEditDialogOpen(false)
        setEditingBug(null)

        toast({
          title: "Bug Report Updated! ✅",
          description: "Your changes have been saved successfully",
        })
      } else {
        throw new Error("Failed to update bug report")
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update bug report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateBug = async (id: string, field: keyof Bug, value: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/bug-reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        const updatedBug = await response.json()
        setBugs(bugs.map((b) => (b.id === id ? updatedBug : b)))
      }
    } catch (error) {
      console.error("Failed to update bug report:", error)
    }
  }

  const deleteBug = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/bug-reports/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setBugs(bugs.filter((b) => b.id !== id))
        toast({
          title: "Bug Report Deleted",
          description: "Bug report has been removed successfully",
        })
      } else {
        throw new Error("Failed to delete bug report")
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete bug report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToExcel = () => {
    const exportData = filteredBugs.map((bug) => ({
      ID: bug.id,
      Summary: bug.summary,
      Description: bug.description,
      Steps: bug.steps,
      Expected: bug.expected,
      Actual: bug.actual,
      Priority: bug.priority,
      Severity: bug.severity,
      Status: bug.status,
      Category: bug.category,
      Environment: bug.environment,
      Assignee: bug.assignee?.name || "",
      Reporter: bug.reporter.name,
      "Created At": new Date(bug.createdAt).toLocaleDateString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BugReports")
    XLSX.writeFile(workbook, `BugReports_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const getPriorityColor = (priority: Bug["priority"]) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-800"
      case "High":
        return "bg-orange-100 text-orange-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSeverityColor = (severity: Bug["severity"]) => {
    switch (severity) {
      case "Blocker":
        return "bg-red-100 text-red-800"
      case "Critical":
        return "bg-orange-100 text-orange-800"
      case "Major":
        return "bg-yellow-100 text-yellow-800"
      case "Minor":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: Bug["status"]) => {
    switch (status) {
      case "Resolved":
        return "bg-green-100 text-green-800"
      case "Closed":
        return "bg-gray-100 text-gray-800"
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "Reopened":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-red-100 text-red-800"
    }
  }

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.assignee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.reporter.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || bug.status === statusFilter
    const matchesPriority = priorityFilter === "all" || bug.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const openManualDialog = () => {
    setManualBug({
      summary: "",
      description: "",
      steps: "",
      expected: "",
      actual: "",
      priority: "Medium",
      severity: "Major",
      status: "Open",
      environment: "",
      category: "Functional",
    })
    setIsManualDialogOpen(true)
  }

  const saveManualBug = async () => {
    if (!manualBug.summary?.trim()) {
      toast({
        title: "Validation Error",
        description: "Bug summary is required",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...manualBug,
          aiGenerated: false,
        }),
      })

      if (response.ok) {
        const newBug = await response.json()
        setBugs([newBug, ...bugs])
        setIsManualDialogOpen(false)

        toast({
          title: "Bug Report Created! ✅",
          description: "Manual bug report has been added successfully",
        })
      } else {
        throw new Error("Failed to create bug report")
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create bug report. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading bug reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search bug reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Reopened">Reopened</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBugReports} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* AI-Powered Bug Report Generator */}
      <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-600" />
            AI-Powered Bug Report Generator
          </CardTitle>
          <CardDescription>
            Describe the issue and our AI will generate detailed bug reports with reproduction steps, impact analysis,
            and smart categorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'app crashes when uploading large files', 'payment fails with credit card', 'login button not responding'"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === "Enter" && !isGenerating && generateBugFromSummary(summary)}
              disabled={isGenerating}
            />
            <Button
              onClick={() => generateBugFromSummary(summary)}
              disabled={!summary.trim() || isGenerating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <div className="text-sm text-red-800">
              <strong>🐛 AI Features:</strong> Impact analysis, detailed reproduction steps, environment detection,
              priority/severity assessment, professional bug reporting
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Bug Report Creator */}
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-orange-600" />
            Manual Bug Report Creator
          </CardTitle>
          <CardDescription>
            Create bug reports manually with complete control over all fields and detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={openManualDialog} className="bg-orange-600 hover:bg-orange-700">
            <Edit className="w-4 h-4 mr-2" />
            Create Manual Bug Report
          </Button>
          <div className="mt-3 p-3 bg-orange-100 rounded-lg">
            <div className="text-sm text-orange-800">
              <strong>✍️ Manual Features:</strong> Custom fields, detailed descriptions, step-by-step reproduction,
              environment specification
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{bugs.length}</div>
            <div className="text-xs text-muted-foreground">Total Bugs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{bugs.filter((bug) => bug.aiGenerated).length}</div>
            <div className="text-xs text-muted-foreground">AI Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{bugs.filter((bug) => bug.status === "Open").length}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {bugs.filter((bug) => bug.status === "In Progress").length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {bugs.filter((bug) => bug.status === "Resolved").length}
            </div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {bugs.filter((bug) => bug.priority === "Critical" || bug.priority === "High").length}
            </div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </CardContent>
        </Card>
      </div>

      {/* Bug Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bug Reports ({filteredBugs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="min-w-[200px]">Summary</TableHead>
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-32">Assignee</TableHead>
                  <TableHead className="w-32">Reporter</TableHead>
                  <TableHead className="w-24">Created</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBugs.map((bug) => (
                  <TableRow key={bug._id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        {bug.id}
                        {bug.aiGenerated && <Sparkles className="w-3 h-3 text-red-500" title="AI Generated" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={bug.summary}>
                        {bug.summary}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(bug.priority)}>{bug.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(bug.severity)}>{bug.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bug.status)}>{bug.status}</Badge>
                    </TableCell>
                    <TableCell>{bug.category}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {bug.assignee ? (
                          <div>
                            <div className="font-medium">{bug.assignee.name}</div>
                            <div className="text-xs text-muted-foreground">{bug.assignee.role}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{bug.reporter.name}</div>
                        <div className="text-xs text-muted-foreground">{bug.reporter.role}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(bug)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(bug)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit Bug Report"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {bug.aiGenerated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateBugReport(bug)}
                            disabled={isGenerating}
                            className="text-purple-600 hover:text-purple-800"
                            title="Regenerate with AI"
                          >
                            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBug(bug.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Bug Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredBugs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No bug reports found. Create your first AI-powered bug report to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Bug Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Bug Report Details - {viewingBug?.id}
              {viewingBug?.aiGenerated && <Sparkles className="w-4 h-4 text-red-500" title="AI Generated" />}
            </DialogTitle>
          </DialogHeader>
          {viewingBug && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <Badge className={getPriorityColor(viewingBug.priority)}>{viewingBug.priority}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Severity</Label>
                  <Badge className={getSeverityColor(viewingBug.severity)}>{viewingBug.severity}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Badge className={getStatusColor(viewingBug.status)}>{viewingBug.status}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <p className="text-sm">{viewingBug.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Assignee</Label>
                  <p className="text-sm">{viewingBug.assignee ? viewingBug.assignee.name : "Not assigned"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Reporter</Label>
                  <p className="text-sm">
                    {viewingBug.reporter.name} ({viewingBug.reporter.role})
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Bug Summary</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">{viewingBug.summary}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingBug.description}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Steps to Reproduce</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <pre className="text-sm whitespace-pre-wrap">{viewingBug.steps}</pre>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Expected Result</Label>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <p className="text-sm">{viewingBug.expected}</p>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Actual Result</Label>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <p className="text-sm">{viewingBug.actual}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Environment</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingBug.environment}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Bug Report Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Bug Report - {editingBug?.id}
            </DialogTitle>
          </DialogHeader>
          {editingBug && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={editingBug.priority}
                    onValueChange={(value: any) => setEditingBug({ ...editingBug, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={editingBug.severity}
                    onValueChange={(value: any) => setEditingBug({ ...editingBug, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Minor">Minor</SelectItem>
                      <SelectItem value="Major">Major</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="Blocker">Blocker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingBug.status}
                    onValueChange={(value: any) => setEditingBug({ ...editingBug, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Reopened">Reopened</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    value={editingBug.category}
                    onChange={(e) => setEditingBug({ ...editingBug, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Bug Summary</Label>
                <Input
                  value={editingBug.summary}
                  onChange={(e) => setEditingBug({ ...editingBug, summary: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  value={editingBug.description}
                  onChange={(e) => setEditingBug({ ...editingBug, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="steps">Steps to Reproduce</Label>
                <Textarea
                  value={editingBug.steps}
                  onChange={(e) => setEditingBug({ ...editingBug, steps: e.target.value })}
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expected">Expected Result</Label>
                  <Textarea
                    value={editingBug.expected}
                    onChange={(e) => setEditingBug({ ...editingBug, expected: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="actual">Actual Result</Label>
                  <Textarea
                    value={editingBug.actual}
                    onChange={(e) => setEditingBug({ ...editingBug, actual: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="environment">Environment</Label>
                <Input
                  value={editingBug.environment}
                  onChange={(e) => setEditingBug({ ...editingBug, environment: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveEditedBug} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Bug Report Creation Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Create Manual Bug Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={manualBug.priority}
                  onValueChange={(value: any) => setManualBug({ ...manualBug, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={manualBug.severity}
                  onValueChange={(value: any) => setManualBug({ ...manualBug, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minor">Minor</SelectItem>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Blocker">Blocker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={manualBug.status}
                  onValueChange={(value: any) => setManualBug({ ...manualBug, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Reopened">Reopened</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={manualBug.category}
                  onValueChange={(value) => setManualBug({ ...manualBug, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crash">Crash</SelectItem>
                    <SelectItem value="UI">UI</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Integration">Integration</SelectItem>
                    <SelectItem value="Functional">Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="summary">Bug Summary *</Label>
              <Input
                value={manualBug.summary}
                onChange={(e) => setManualBug({ ...manualBug, summary: e.target.value })}
                placeholder="Brief description of the bug..."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                value={manualBug.description}
                onChange={(e) => setManualBug({ ...manualBug, description: e.target.value })}
                rows={3}
                placeholder="Detailed description of the bug and its impact..."
              />
            </div>

            <div>
              <Label htmlFor="steps">Steps to Reproduce</Label>
              <Textarea
                value={manualBug.steps}
                onChange={(e) => setManualBug({ ...manualBug, steps: e.target.value })}
                rows={6}
                placeholder="1. Step one&#10;2. Step two&#10;3. Step three..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expected">Expected Result</Label>
                <Textarea
                  value={manualBug.expected}
                  onChange={(e) => setManualBug({ ...manualBug, expected: e.target.value })}
                  rows={3}
                  placeholder="What should happen..."
                />
              </div>
              <div>
                <Label htmlFor="actual">Actual Result</Label>
                <Textarea
                  value={manualBug.actual}
                  onChange={(e) => setManualBug({ ...manualBug, actual: e.target.value })}
                  rows={3}
                  placeholder="What actually happens..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="environment">Environment</Label>
              <Input
                value={manualBug.environment}
                onChange={(e) => setManualBug({ ...manualBug, environment: e.target.value })}
                placeholder="e.g., Windows 10, Chrome 120, Production Environment..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveManualBug} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Create Bug Report
              </Button>
              <Button variant="outline" onClick={() => setIsManualDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
