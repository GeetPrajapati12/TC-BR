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
import { generateTestCaseWithAI } from "@/lib/ai-generator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
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
  assignee?: {
    _id: string
    name: string
    email: string
    role: string
  }
  createdBy: {
    _id: string
    name: string
    email: string
    role: string
  }
  createdAt: string
  updatedAt: string
  aiGenerated?: boolean
}

export function TestCaseSheet() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [summary, setSummary] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false)
  const [manualTestCase, setManualTestCase] = useState<Partial<TestCase>>({
    scenario: "",
    steps: "",
    expected: "",
    actual: "",
    status: "Not Started",
    remarks: "",
    priority: "Medium",
    category: "Functional",
  })

  useEffect(() => {
    fetchTestCases()
  }, [])

  const fetchTestCases = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/test-cases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTestCases(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch test cases",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch test cases:", error)
      toast({
        title: "Error",
        description: "Failed to fetch test cases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateTestCaseFromSummary = async (summary: string) => {
    if (!summary.trim()) return

    setIsGenerating(true)
    try {
      // Use AI to generate comprehensive test case (with fallback)
      const aiResult = await generateTestCaseWithAI(summary)

      const newTestCase = {
        scenario: aiResult.scenario,
        steps: aiResult.steps,
        expected: aiResult.expected,
        actual: "",
        status: "Not Started" as const,
        remarks: "",
        priority: aiResult.priority,
        category: aiResult.category,
        aiGenerated: true,
      }

      const token = localStorage.getItem("token")
      const response = await fetch("/api/test-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTestCase),
      })

      if (response.ok) {
        const createdTestCase = await response.json()
        setTestCases([createdTestCase, ...testCases])
        setSummary("")

        toast({
          title: "Test Case Generated! ✨",
          description: `Comprehensive test case created for "${summary}"`,
        })
      } else {
        throw new Error("Failed to create test case")
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate test case. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateTestCase = async (testCase: TestCase) => {
    setIsGenerating(true)
    try {
      const aiResult = await generateTestCaseWithAI(testCase.scenario)

      const updates = {
        steps: aiResult.steps,
        expected: aiResult.expected,
        priority: aiResult.priority,
        category: aiResult.category,
        aiGenerated: true,
      }

      const token = localStorage.getItem("token")
      const response = await fetch(`/api/test-cases/${testCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedTestCase = await response.json()
        setTestCases(testCases.map((tc) => (tc.id === testCase.id ? updatedTestCase : tc)))

        toast({
          title: "Test Case Regenerated! ✨",
          description: "AI has updated the test case with fresh content",
        })
      } else {
        throw new Error("Failed to regenerate test case")
      }
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate test case. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const openEditDialog = (testCase: TestCase) => {
    setEditingTestCase({ ...testCase })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (testCase: TestCase) => {
    setViewingTestCase(testCase)
    setIsViewDialogOpen(true)
  }

  const saveEditedTestCase = async () => {
    if (!editingTestCase) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/test-cases/${editingTestCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTestCase),
      })

      if (response.ok) {
        const updatedTestCase = await response.json()
        setTestCases(testCases.map((tc) => (tc.id === editingTestCase.id ? updatedTestCase : tc)))
        setIsEditDialogOpen(false)
        setEditingTestCase(null)

        toast({
          title: "Test Case Updated! ✅",
          description: "Your changes have been saved successfully",
        })
      } else {
        throw new Error("Failed to update test case")
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update test case. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateTestCase = async (id: string, field: keyof TestCase, value: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/test-cases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        const updatedTestCase = await response.json()
        setTestCases(testCases.map((tc) => (tc.id === id ? updatedTestCase : tc)))
      }
    } catch (error) {
      console.error("Failed to update test case:", error)
    }
  }

  const deleteTestCase = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/test-cases/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setTestCases(testCases.filter((tc) => tc.id !== id))
        toast({
          title: "Test Case Deleted",
          description: "Test case has been removed successfully",
        })
      } else {
        throw new Error("Failed to delete test case")
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete test case. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToExcel = () => {
    const exportData = filteredTestCases.map((tc) => ({
      ID: tc.id,
      Scenario: tc.scenario,
      Steps: tc.steps,
      Expected: tc.expected,
      Actual: tc.actual,
      Status: tc.status,
      Priority: tc.priority,
      Category: tc.category,
      Assignee: tc.assignee?.name || "",
      "Created By": tc.createdBy.name,
      "Created At": new Date(tc.createdAt).toLocaleDateString(),
      Remarks: tc.remarks,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "TestCases")
    XLSX.writeFile(workbook, `TestCases_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const getStatusColor = (status: TestCase["status"]) => {
    switch (status) {
      case "Passed":
        return "bg-green-100 text-green-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "Blocked":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: TestCase["priority"]) => {
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

  const filteredTestCases = testCases.filter((tc) => {
    const matchesSearch =
      tc.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.assignee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tc.status === statusFilter
    const matchesPriority = priorityFilter === "all" || tc.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const openManualDialog = () => {
    setManualTestCase({
      scenario: "",
      steps: "",
      expected: "",
      actual: "",
      status: "Not Started",
      remarks: "",
      priority: "Medium",
      category: "Functional",
    })
    setIsManualDialogOpen(true)
  }

  const saveManualTestCase = async () => {
    if (!manualTestCase.scenario?.trim()) {
      toast({
        title: "Validation Error",
        description: "Test scenario is required",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/test-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...manualTestCase,
          aiGenerated: false,
        }),
      })

      if (response.ok) {
        const newTestCase = await response.json()
        setTestCases([newTestCase, ...testCases])
        setIsManualDialogOpen(false)

        toast({
          title: "Test Case Created! ✅",
          description: "Manual test case has been added successfully",
        })
      } else {
        throw new Error("Failed to create test case")
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create test case. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading test cases...</p>
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
              placeholder="Search test cases..."
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
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Passed">Passed</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
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
          <Button onClick={fetchTestCases} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* AI-Powered Test Case Generator */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI-Powered Test Case Generator
          </CardTitle>
          <CardDescription>
            Enter a brief summary and our AI will generate comprehensive test cases with detailed steps, expected
            results, and smart categorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'user login with invalid credentials', 'payment processing with expired card', 'file upload with large files'"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === "Enter" && !isGenerating && generateTestCaseFromSummary(summary)}
              disabled={isGenerating}
            />
            <Button
              onClick={() => generateTestCaseFromSummary(summary)}
              disabled={!summary.trim() || isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
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
          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>✨ AI Features:</strong> Smart categorization, detailed steps, edge case consideration, priority
              assessment, professional QA language
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Test Case Creator */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-green-600" />
            Manual Test Case Creator
          </CardTitle>
          <CardDescription>Create test cases manually with full control over all fields and details</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={openManualDialog} className="bg-green-600 hover:bg-green-700">
            <Edit className="w-4 h-4 mr-2" />
            Create Manual Test Case
          </Button>
          <div className="mt-3 p-3 bg-green-100 rounded-lg">
            <div className="text-sm text-green-800">
              <strong>✍️ Manual Features:</strong> Full control, custom fields, step-by-step creation, professional
              templates
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{testCases.length}</div>
            <div className="text-xs text-muted-foreground">Total Cases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{testCases.filter((tc) => tc.aiGenerated).length}</div>
            <div className="text-xs text-muted-foreground">AI Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {testCases.filter((tc) => tc.status === "Passed").length}
            </div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {testCases.filter((tc) => tc.status === "Failed").length}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {testCases.filter((tc) => tc.status === "In Progress").length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {testCases.filter((tc) => tc.status === "Blocked").length}
            </div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cases ({filteredTestCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead className="min-w-[200px]">Scenario</TableHead>
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Assignee</TableHead>
                  <TableHead className="w-32">Created By</TableHead>
                  <TableHead className="w-24">Created</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestCases.map((testCase) => (
                  <TableRow key={testCase._id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        {testCase.id}
                        {testCase.aiGenerated && <Sparkles className="w-3 h-3 text-blue-500" title="AI Generated" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={testCase.scenario}>
                        {testCase.scenario}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(testCase.priority)}>{testCase.priority}</Badge>
                    </TableCell>
                    <TableCell>{testCase.category}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(testCase.status)}>{testCase.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {testCase.assignee ? (
                          <div>
                            <div className="font-medium">{testCase.assignee.name}</div>
                            <div className="text-xs text-muted-foreground">{testCase.assignee.role}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{testCase.createdBy.name}</div>
                        <div className="text-xs text-muted-foreground">{testCase.createdBy.role}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(testCase.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(testCase)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(testCase)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit Test Case"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {testCase.aiGenerated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateTestCase(testCase)}
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
                          onClick={() => deleteTestCase(testCase.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Test Case"
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
          {filteredTestCases.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No test cases found. Create your first AI-powered test case to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Test Case Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Test Case Details - {viewingTestCase?.id}
              {viewingTestCase?.aiGenerated && <Sparkles className="w-4 h-4 text-blue-500" title="AI Generated" />}
            </DialogTitle>
          </DialogHeader>
          {viewingTestCase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <Badge className={getPriorityColor(viewingTestCase.priority)}>{viewingTestCase.priority}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <p className="text-sm">{viewingTestCase.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Badge className={getStatusColor(viewingTestCase.status)}>{viewingTestCase.status}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Assignee</Label>
                  <p className="text-sm">{viewingTestCase.assignee ? viewingTestCase.assignee.name : "Not assigned"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created By</Label>
                  <p className="text-sm">
                    {viewingTestCase.createdBy.name} ({viewingTestCase.createdBy.role})
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created At</Label>
                  <p className="text-sm">{new Date(viewingTestCase.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Test Scenario</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingTestCase.scenario}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Test Steps</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <pre className="text-sm whitespace-pre-wrap">{viewingTestCase.steps}</pre>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Expected Result</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingTestCase.expected}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Actual Result</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingTestCase.actual || "Not executed yet"}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Remarks</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-sm">{viewingTestCase.remarks || "No remarks"}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Test Case Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Test Case - {editingTestCase?.id}
            </DialogTitle>
          </DialogHeader>
          {editingTestCase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={editingTestCase.priority}
                    onValueChange={(value: any) => setEditingTestCase({ ...editingTestCase, priority: value })}
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
                  <Label htmlFor="category">Category</Label>
                  <Input
                    value={editingTestCase.category}
                    onChange={(e) => setEditingTestCase({ ...editingTestCase, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingTestCase.status}
                    onValueChange={(value: any) => setEditingTestCase({ ...editingTestCase, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Passed">Passed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="scenario">Test Scenario</Label>
                <Textarea
                  value={editingTestCase.scenario}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, scenario: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="steps">Test Steps</Label>
                <Textarea
                  value={editingTestCase.steps}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, steps: e.target.value })}
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="expected">Expected Result</Label>
                <Textarea
                  value={editingTestCase.expected}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, expected: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="actual">Actual Result</Label>
                <Textarea
                  value={editingTestCase.actual}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, actual: e.target.value })}
                  rows={3}
                  placeholder="Enter actual result after execution..."
                />
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  value={editingTestCase.remarks}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, remarks: e.target.value })}
                  rows={2}
                  placeholder="Add any additional remarks..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveEditedTestCase} className="flex-1">
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

      {/* Manual Test Case Creation Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Create Manual Test Case
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={manualTestCase.priority}
                  onValueChange={(value: any) => setManualTestCase({ ...manualTestCase, priority: value })}
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
                <Label htmlFor="category">Category</Label>
                <Select
                  value={manualTestCase.category}
                  onValueChange={(value) => setManualTestCase({ ...manualTestCase, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="UI/UX">UI/UX</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Integration">Integration</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Database">Database</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={manualTestCase.status}
                  onValueChange={(value: any) => setManualTestCase({ ...manualTestCase, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="scenario">Test Scenario *</Label>
              <Textarea
                value={manualTestCase.scenario}
                onChange={(e) => setManualTestCase({ ...manualTestCase, scenario: e.target.value })}
                rows={2}
                placeholder="Describe what you want to test..."
                required
              />
            </div>

            <div>
              <Label htmlFor="steps">Test Steps</Label>
              <Textarea
                value={manualTestCase.steps}
                onChange={(e) => setManualTestCase({ ...manualTestCase, steps: e.target.value })}
                rows={6}
                placeholder="1. Step one&#10;2. Step two&#10;3. Step three..."
              />
            </div>

            <div>
              <Label htmlFor="expected">Expected Result</Label>
              <Textarea
                value={manualTestCase.expected}
                onChange={(e) => setManualTestCase({ ...manualTestCase, expected: e.target.value })}
                rows={3}
                placeholder="What should happen when the test is executed..."
              />
            </div>

            <div>
              <Label htmlFor="actual">Actual Result</Label>
              <Textarea
                value={manualTestCase.actual}
                onChange={(e) => setManualTestCase({ ...manualTestCase, actual: e.target.value })}
                rows={3}
                placeholder="What actually happened (fill after execution)..."
              />
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                value={manualTestCase.remarks}
                onChange={(e) => setManualTestCase({ ...manualTestCase, remarks: e.target.value })}
                rows={2}
                placeholder="Any additional notes or comments..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveManualTestCase} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Create Test Case
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
