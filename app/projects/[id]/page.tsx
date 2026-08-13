"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bug, TestTube, Activity, Calendar, Users } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { PageLoader } from "@/components/ui/loading-spinner"
import { TestCaseSheet } from "@/components/test-case-sheet"
import { BugSheet } from "@/components/bug-sheet"
import { LogsSheet } from "@/components/logs-sheet"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface Project {
  _id: string
  name: string
  key: string
  description?: string
  type: string
  status: string
  priority: string
  lead: { _id: string; name: string; email: string; role: string }
  members: Array<{ user: { _id: string; name: string; role: string }; role: string }>
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Planning: "bg-blue-100 text-blue-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Completed: "bg-purple-100 text-purple-700",
  Archived: "bg-gray-100 text-gray-600",
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const projectId = String(params?.id ?? "")

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setProject(await res.json())
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Error", description: err.message ?? "Failed to load project", variant: "destructive" })
        router.push("/projects")
      }
    } catch {
      toast({ title: "Error", description: "Failed to load project", variant: "destructive" })
      router.push("/projects")
    } finally {
      setLoading(false)
    }
  }, [projectId, router, toast])

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return }
    if (!authLoading) fetchProject()
  }, [authLoading, user, router, fetchProject])

  if (authLoading || loading || !project) {
    return <PageLoader label="Loading project…" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Project header card */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/projects")}
                className="self-start shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-xl font-bold">{project.name}</h1>
                  <Badge variant="outline" className="font-mono text-xs">{project.key}</Badge>
                  <Badge className={STATUS_COLORS[project.status] ?? ""}>{project.status}</Badge>
                  <Badge className={PRIORITY_COLORS[project.priority] ?? ""}>{project.priority}</Badge>
                  <Badge variant="outline">{project.type}</Badge>
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground mb-3 max-w-2xl">{project.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Lead: <span className="text-foreground font-medium">{project.lead.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {formatDate(project.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="test-cases">
          <TabsList className="mb-6 bg-white border">
            <TabsTrigger value="test-cases" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="bug-reports" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bug Reports
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test-cases">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Test Cases</CardTitle>
                <CardDescription>Create and manage test cases for {project.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <TestCaseSheet projectId={project._id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bug-reports">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Bug Reports</CardTitle>
                <CardDescription>Track and manage bugs for {project.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <BugSheet projectId={project._id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Activity Log</CardTitle>
                <CardDescription>All actions taken in {project.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <LogsSheet projectId={project._id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
