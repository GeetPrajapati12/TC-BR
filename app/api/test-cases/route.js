import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import TestCase from "@/models/TestCase"
import User from "@/models/User"
import ActivityLog from "@/models/ActivityLog"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided")
  }

  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, JWT_SECRET)
  const user = await User.findById(decoded.userId)
  if (!user) {
    throw new Error("User not found")
  }

  return user
}

export async function GET(request) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const testCases = await TestCase.find()
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

    const data = await request.json()

    // Generate unique ID
    const count = await TestCase.countDocuments()
    const id = `TC-${String(count + 1).padStart(3, "0")}`

    const testCase = await TestCase.create({
      ...data,
      id,
      createdBy: user._id,
    })

    await testCase.populate("createdBy", "name email role")
    await testCase.populate("assignee", "name email role")

    // Log the activity
    await ActivityLog.create({
      user: user._id,
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
