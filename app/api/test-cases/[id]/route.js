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

export async function PUT(request, { params }) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { id } = params
    const updates = await request.json()

    const oldTestCase = await TestCase.findOne({ id })
    if (!oldTestCase) {
      return NextResponse.json({ message: "Test case not found" }, { status: 404 })
    }

    const testCase = await TestCase.findOneAndUpdate({ id }, updates, { new: true })
      .populate("createdBy", "name email role")
      .populate("assignee", "name email role")

    // Log the activity
    const changes = []
    Object.keys(updates).forEach((key) => {
      if (oldTestCase[key] !== updates[key]) {
        changes.push(`${key}: "${oldTestCase[key]}" → "${updates[key]}"`)
      }
    })

    await ActivityLog.create({
      user: user._id,
      action: "updated_test_case",
      entityType: "TestCase",
      entityId: testCase.id,
      description: `${user.name} updated test case "${testCase.scenario}"`,
      details: {
        testCaseId: testCase.id,
        changes: changes,
        updatedFields: Object.keys(updates),
      },
    })

    return NextResponse.json(testCase)
  } catch (error) {
    console.error("Test case update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { id } = params
    const testCase = await TestCase.findOneAndDelete({ id })

    if (!testCase) {
      return NextResponse.json({ message: "Test case not found" }, { status: 404 })
    }

    // Log the activity
    await ActivityLog.create({
      user: user._id,
      action: "deleted_test_case",
      entityType: "TestCase",
      entityId: testCase.id,
      description: `${user.name} deleted test case "${testCase.scenario}"`,
      details: {
        testCaseId: testCase.id,
        scenario: testCase.scenario,
        priority: testCase.priority,
        category: testCase.category,
      },
    })

    return NextResponse.json({ message: "Test case deleted successfully" })
  } catch (error) {
    console.error("Test case deletion error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
