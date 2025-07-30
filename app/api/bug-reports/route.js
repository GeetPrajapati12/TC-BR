import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import BugReport from "@/models/BugReport"
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

    const bugReports = await BugReport.find()
      .populate("reporter", "name email role")
      .populate("assignee", "name email role")
      .sort({ createdAt: -1 })

    return NextResponse.json(bugReports)
  } catch (error) {
    console.error("Bug reports fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const data = await request.json()

    // Generate unique ID
    const count = await BugReport.countDocuments()
    const id = `BUG-${String(count + 1).padStart(4, "0")}`

    const bugReport = await BugReport.create({
      ...data,
      id,
      reporter: user._id,
    })

    await bugReport.populate("reporter", "name email role")
    await bugReport.populate("assignee", "name email role")

    // Log the activity
    await ActivityLog.create({
      user: user._id,
      action: "created_bug_report",
      entityType: "BugReport",
      entityId: bugReport.id,
      description: `${user.name} created bug report "${bugReport.summary}"`,
      details: {
        bugReportId: bugReport.id,
        summary: bugReport.summary,
        priority: bugReport.priority,
        severity: bugReport.severity,
        category: bugReport.category,
        aiGenerated: bugReport.aiGenerated,
      },
    })

    return NextResponse.json(bugReport, { status: 201 })
  } catch (error) {
    console.error("Bug report creation error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
