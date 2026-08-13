"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AppHeader } from "@/components/app-header"
import { PageLoader } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Search, Plus, Star, StarOff, Eye, RefreshCw,
  Users, Calendar, FolderKanban, Layers,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface Project {
  _id: string
  name: string
  key: string
  description?: string
  type: string
  lead: { _id: string; name: string; email: string; role: string }
  members: Array<{ user: { _id: string; name: string }; role: string }>
  status: string
  priority: string
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

const EMPTY_PROJECT = {
  name: "", key: "", description: "", type: "Web Application", priority: "Medium",
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [newProject, setNewProject] = useState(EMPTY_PROJECT)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setProjects(await res.json())
      } else {
        toast({ title: "Error", description: "Failed to load projects", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to load projects", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!user) { router.push("/login"); return }
    fetchProjects()
    const saved = localStorage.getItem("starredProjects")
    if (saved) setStarred(new Set(JSON.parse(saved)))
  }, [user, router, fetchProjects])

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("starredProjects", JSON.stringify([...next]))
      return next
    })
  }

  const createProject = async () => {
    if (!newProject.name.trim() || !newProject.key.trim()) {
      toast({ title: "Validation error", description: "Name and key are required", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newProject),
      })
      const data = await res.json()
      if (res.ok) {
        setProjects((prev) => [data, ...prev])
        setDialogOpen(false)
        setNewProject(EMPTY_PROJECT)
        toast({ title: "Project created", description: `"${data.name}" is ready` })
      } else {
        toast({ title: "Failed to create", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to create", description: "Check your connection", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const filtered = projects
    .filter((p) => {
      const q = searchTerm.toLowerCase()
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.lead.name.toLowerCase().includes(q)
      const matchesType = typeFilter === "all" || p.type === typeFilter
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      const aS = starred.has(a._id), bS = starred.has(b._id)
      if (aS !== bS) return aS ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  if (loading) return <PageLoader label="Loading projects…" />

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader breadcrumbs={[{ label: "Projects" }]} />

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Page title + action */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchProjects}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {["Web Application", "Mobile App", "API", "Desktop App", "Game", "Other"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={searchTerm || typeFilter !== "all" ? "Try adjusting your filters" : "Create your first project to get started"}
            action={
              !searchTerm && typeFilter === "all" ? (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Card
                key={project._id}
                className="group bg-white border hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/projects/${project._id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                        <Layers className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                        <span className="text-xs text-muted-foreground font-mono">{project.key}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(project._id) }}
                      className="shrink-0 ml-2 text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {starred.has(project._id)
                        ? <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        : <StarOff className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  {project.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge className={`text-xs ${STATUS_COLORS[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {project.status}
                    </Badge>
                    <Badge className={`text-xs ${PRIORITY_COLORS[project.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {project.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{project.type}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{project.members.length} member{project.members.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                    <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pName">Project Name *</Label>
                <Input
                  id="pName"
                  placeholder="My Project"
                  value={newProject.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                    setNewProject((p) => ({ ...p, name, key }))
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pKey">Project Key *</Label>
                <Input
                  id="pKey"
                  placeholder="MYPRJ"
                  value={newProject.key}
                  onChange={(e) =>
                    setNewProject((p) => ({ ...p, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) }))
                  }
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Up to 10 uppercase letters &amp; numbers</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newProject.type} onValueChange={(v) => setNewProject((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Web Application", "Mobile App", "API", "Desktop App", "Game", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newProject.priority} onValueChange={(v) => setNewProject((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="What is this project about?"
                value={newProject.description}
                onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={createProject} className="flex-1" disabled={creating}>
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Project
                  </span>
                )}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
