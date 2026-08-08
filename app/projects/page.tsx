"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Star, StarOff, Eye, Edit, Trash2, Users, Calendar, Activity, LogOut, User, RefreshCw } from 'lucide-react'
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface Project {
  _id: string
  name: string
  key: string
  description: string
  type: string
  lead: {
    _id: string
    name: string
    email: string
    role: string
  }
  members: Array<{
    user: {
      _id: string
      name: string
      email: string
      role: string
    }
    role: string
    joinedAt: string
  }>
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  isStarred?: boolean
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set())
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [newProject, setNewProject] = useState({
    name: "",
    key: "",
    description: "",
    type: "Web Application",
    priority: "Medium",
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchProjects()
  }, [user, router])

  useEffect(() => {
    filterProjects()
  }, [projects, searchTerm, typeFilter])

  const fetchProjects = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch projects",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterProjects = () => {
    let filtered = projects

    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.lead.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((project) => project.type === typeFilter)
    }

    // Sort starred projects first
    filtered.sort((a, b) => {
      const aStarred = starredProjects.has(a._id)
      const bStarred = starredProjects.has(b._id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    setFilteredProjects(filtered)
  }

  const createProject = async () => {
    if (!newProject.name.trim() || !newProject.key.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name and key are required",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProject),
      })

      if (response.ok) {
        const createdProject = await response.json()
        setProjects([createdProject, ...projects])
        setIsCreateDialogOpen(false)
        setNewProject({
          name: "",
          key: "",
          description: "",
          type: "Web Application",
          priority: "Medium",
        })

        toast({
          title: "Project Created! 🎉",
          description: `Project "${createdProject.name}" has been created successfully`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to create project",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleStar = (projectId: string) => {
    const newStarred = new Set(starredProjects)
    if (newStarred.has(projectId)) {
      newStarred.delete(projectId)
    } else {
      newStarred.add(projectId)
    }
    setStarredProjects(newStarred)
    // Save to localStorage
    localStorage.setItem("starredProjects", JSON.stringify(Array.from(newStarred)))
  }

  const openProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Planning":
        return "bg-blue-100 text-blue-800"
      case "On Hold":
        return "bg-yellow-100 text-yellow-800"
      case "Completed":
        return "bg-purple-100 text-purple-800"
      case "Archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
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

  // Load starred projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("starredProjects")
    if (saved) {
      setStarredProjects(new Set(JSON.parse(saved)))
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-muted-foreground">Manage your QA projects and test cases</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{user?.name}</span>
                  <Badge variant="outline">{user?.role}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search projects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Web Application">Web Application</SelectItem>
                <SelectItem value="Mobile App">Mobile App</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="Desktop App">Desktop App</SelectItem>
                <SelectItem value="Game">Game</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create project
          </Button>
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold">Name ↓</TableHead>
                  <TableHead className="font-semibold">Key</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Lead</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Members</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project._id} className="hover:bg-gray-50 cursor-pointer">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStar(project._id)
                        }}
                        className="p-1 h-auto"
                      >
                        {starredProjects.has(project._id) ? (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <Badge variant="outline" className="font-mono">
                        {project.key}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>{project.type}</TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <div>
                        <div className="font-medium">{project.lead.name}</div>
                        <div className="text-sm text-muted-foreground">{project.lead.role}</div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <Badge className={getPriorityColor(project.priority)}>{project.priority}</Badge>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{project.members.length}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => openProject(project._id)}>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openProject(project._id)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Open Project"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first project"}
                </p>
                {!searchTerm && typeFilter === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first project
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter project name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="projectKey">Project Key *</Label>
                <Input
                  id="projectKey"
                  placeholder="e.g., PROJ"
                  value={newProject.key}
                  onChange={(e) =>
                    setNewProject({ ...newProject, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                  }
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Short identifier (max 10 chars, letters and numbers only)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectType">Project Type</Label>
                <Select value={newProject.type} onValueChange={(value) => setNewProject({ ...newProject, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Web Application">Web Application</SelectItem>
                    <SelectItem value="Mobile App">Mobile App</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Desktop App">Desktop App</SelectItem>
                    <SelectItem value="Game">Game</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projectPriority">Priority</Label>
                <Select
                  value={newProject.priority}
                  onValueChange={(value) => setNewProject({ ...newProject, priority: value })}
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
            </div>

            <div>
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                placeholder="Brief description of the project"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createProject} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
