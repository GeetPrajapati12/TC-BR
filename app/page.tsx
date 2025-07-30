"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TestCaseSheet } from "@/components/test-case-sheet"
import { BugSheet } from "@/components/bug-sheet"
import { LogsSheet } from "@/components/logs-sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bug, TestTube, Activity, LogOut, User } from "lucide-react"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

function QAToolContent() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with User Info */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QA Test & Bug Report Tool</h1>
          <p className="text-muted-foreground mt-2">
            Streamline your testing workflow with dynamic test case and bug report management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{user.name}</span>
              <Badge variant="outline">{user.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="test-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="test-cases" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test Cases
          </TabsTrigger>
          <TabsTrigger value="bug-reports" className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Bug Reports
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Management</CardTitle>
              <CardDescription>
                Create, manage, and execute test cases with dynamic templates and customizable fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestCaseSheet />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bug-reports">
          <Card>
            <CardHeader>
              <CardTitle>Bug Report Management</CardTitle>
              <CardDescription>
                Generate and track bug reports with customizable priorities, environments, and detailed descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BugSheet />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-logs">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Track all user activities, changes, and system events with detailed logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogsSheet />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function QAToolPage() {
  return (
    <AuthProvider>
      <QAToolContent />
    </AuthProvider>
  )
}
