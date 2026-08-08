"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bug, TestTube, Activity, Calendar, Users } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { TestCaseSheet } from "@/components/test-case-sheet"
import { BugSheet } from "@/components/bug-sheet"

interface Project {
  _id: string
  name: string
  key: string
  description?: string
  type: string
  status: string
  priority: string
  lead: { _id: string; name: string; email: string; role: string }
  members: Array<{ user: { _id: string; name: string; email: string; role: string }; role: string; joinedAt: string }>
  createdAt: string
  updatedAt: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const projectId = String(params?.id || "")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      setIsLoading(true)
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || "Failed to load project")
        }
        const data = await res.json()
        setProject(data)
      } catch (err: any) {
        console.error(err)
        toast({
          title: "Error",
          description: err.message || "Failed to load project",
          variant: "destructive",
        })
        router.push("/projects")
      } finally {
        setIsLoading(false)
      }
    }
    fetchProject()
  }, [projectId, router, toast])

  if (loading || isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline" className="font-mono">
                {project.key}
              </Badge>
              <Badge>{project.type}</Badge>
              <Badge className="bg-green-100 text-green-800">{project.status}</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">{project.priority}</Badge>
            </div>
            {project.description && <p className="text-muted-foreground mt-2 max-w-3xl">{project.description}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Lead: {project.lead.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="test-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="test-cases" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" /> Test Cases
          </TabsTrigger>
          <TabsTrigger value="bug-reports" className="flex items-center gap-2">
            <Bug className="w-4 h-4" /> Bug Reports
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Activity Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Management</CardTitle>
              <CardDescription>Work with test cases scoped to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass projectId to scope API calls */}
              <TestCaseSheet projectId={project._id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bug-reports">
          <Card>
            <CardHeader>
              <CardTitle>Bug Report Management</CardTitle>
              <CardDescription>Track bugs for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <BugSheet projectId={project._id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-logs">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Project-wide activity (coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* You can filter logs by project on the API later */}
              <p className="text-muted-foreground text-sm">Project activity logs will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
