import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import TestCase from "@/models/TestCase"
import User from "@/models/User"
import Project from "@/models/Project"
import ActivityLog from "@/models/ActivityLog"

const JWT_SECRET = process.env.JWT_SECRET

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided")
  }
  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, JWT_SECRET)
  const user = await User.findById(decoded.userId).populate("company")
  if (!user) throw new Error("User not found")
  return user
}

export async function GET(request) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    const query = { company: user.company._id }
    if (projectId) query.project = projectId

    const testCases = await TestCase.find(query)
      .populate("createdBy", "name email role")
      .populate("assignee", "name email role")
      .sort({ createdAt: -1 })

    return NextResponse.json(testCases)
  } catch (error) {
    console.error("Test cases fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { searchParams } = new URL(request.url)
    const body = await request.json()
    const projectId = body.projectId || searchParams.get("projectId")
    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 })
    }

    const project = await Project.findOne({ _id: projectId, company: user.company._id })
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 })
    }

    // Generate unique ID within the project
    const count = await TestCase.countDocuments({ project: project._id })
    const id = `TC-${project.key}-${String(count + 1).padStart(3, "0")}`

    const data = body

    const testCase = await TestCase.create({
      ...data,
      id,
      project: project._id,
      company: user.company._id,
      createdBy: user._id,
    })

    await testCase.populate("createdBy", "name email role")
    await testCase.populate("assignee", "name email role")

    await ActivityLog.create({
      user: user._id,
      company: user.company._id,
      project: project._id,
      action: "created_test_case",
      entityType: "TestCase",
      entityId: testCase.id,
      description: `${user.name} created test case "${testCase.scenario}"`,
      details: {
        testCaseId: testCase.id,
        scenario: testCase.scenario,
        priority: testCase.priority,
        category: testCase.category,
        aiGenerated: testCase.aiGenerated,
      },
    })

    return NextResponse.json(testCase, { status: 201 })
  } catch (error) {
    console.error("Test case creation error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
