"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Eye, EyeOff, UserPlus, Building2, TestTube2, Info } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    companyName: "",
    industry: "",
    companyDescription: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const isAdmin = formData.role === "Admin"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match")
      return
    }
    if (!formData.role) {
      alert("Please select a role")
      return
    }
    if (!formData.companyName.trim()) {
      alert("Please enter a company name")
      return
    }
    setLoading(true)
    const success = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.role,
      formData.companyName,
      isAdmin,
      formData.companyDescription,
      formData.industry,
    )
    if (success) router.push("/login")
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <TestTube2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">QA Tool</span>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-gray-200/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-center">Create your account</CardTitle>
            <CardDescription className="text-center">
              Join the QA Tool platform and start managing quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => update("role", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin — creates a new company workspace</SelectItem>
                    <SelectItem value="QA Lead">QA Lead</SelectItem>
                    <SelectItem value="Tester">Tester</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Product Manager">Product Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company section */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Company</span>
                  {formData.role && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isAdmin
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {isAdmin ? "Will be created" : "Must already exist"}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder={isAdmin ? "Enter a new company name" : "Enter your company's existing name"}
                    value={formData.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    required
                    autoComplete="organization"
                  />
                  {!isAdmin && formData.role && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3" />
                      Must match exactly the name your Admin used when creating the workspace
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={formData.industry} onValueChange={(v) => update("industry", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail", "Other"].map(
                            (i) => (
                              <SelectItem key={i} value={i}>{i}</SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="companyDescription">
                        Company Description{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        id="companyDescription"
                        placeholder="Brief description of your company"
                        value={formData.companyDescription}
                        onChange={(e) => update("companyDescription", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
