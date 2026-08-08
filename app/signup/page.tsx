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
import { Eye, EyeOff, TestTube, UserPlus, Building } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Textarea } from "@/components/ui/textarea"

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

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

  const updateFormData = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }))
  const handleRoleChange = (value: string) => {
    updateFormData("role", value)
    setIsAdmin(value === "Admin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <TestTube className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join the QA Tool platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Can create new company)</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Tester">Tester</SelectItem>
                  <SelectItem value="QA Lead">QA Lead</SelectItem>
                  <SelectItem value="Product Manager">Product Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Company</h3>
              </div>
              <div>
                <Label htmlFor="companyName">
                  Company Name
                  {isAdmin ? (
                    <span className="text-green-600 ml-1">(Will be created)</span>
                  ) : (
                    <span className="text-orange-600 ml-1">(Must exist)</span>
                  )}
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => updateFormData("companyName", e.target.value)}
                  placeholder={isAdmin ? "Enter new company name" : "Enter existing company name"}
                  required
                />
              </div>

              {isAdmin && (
                <>
                  <div className="mt-4">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => updateFormData("industry", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="companyDescription">Company Description (optional)</Label>
                    <Textarea
                      id="companyDescription"
                      value={formData.companyDescription}
                      onChange={(e) => updateFormData("companyDescription", e.target.value)}
                      rows={3}
                      placeholder="Tell us briefly about your company"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
