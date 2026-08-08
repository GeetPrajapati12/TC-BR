import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import dbConnect from "@/lib/mongodb"
import BugReport from "@/models/BugReport"
import User from "@/models/User"
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
  if (!user) {
    throw new Error("User not found")
  }

  return user
}

function bugLookup(id, companyId) {
  const lookup = [{ id }]
  if (mongoose.Types.ObjectId.isValid(id)) {
    lookup.push({ _id: id })
  }
  return { company: companyId, $or: lookup }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { id } = await params
    const updates = await request.json()
    delete updates._id
    delete updates.id
    delete updates.company
    delete updates.project
    delete updates.reporter

    const query = bugLookup(id, user.company._id)
    const oldBugReport = await BugReport.findOne(query)
    if (!oldBugReport) {
      return NextResponse.json({ message: "Bug report not found" }, { status: 404 })
    }

    const bugReport = await BugReport.findOneAndUpdate(query, updates, { new: true })
      .populate("reporter", "name email role")
      .populate("assignee", "name email role")

    // Log the activity
    const changes = []
    Object.keys(updates).forEach((key) => {
      if (oldBugReport[key] !== updates[key]) {
        changes.push(`${key}: "${oldBugReport[key]}" → "${updates[key]}"`)
      }
    })

    await ActivityLog.create({
      user: user._id,
      company: user.company._id,
      project: bugReport.project,
      action: "updated_bug_report",
      entityType: "BugReport",
      entityId: bugReport._id,
      description: `${user.name} updated bug report "${bugReport.summary}"`,
      details: {
        bugReportId: bugReport._id,
        changes: changes,
        updatedFields: Object.keys(updates),
      },
    })

    return NextResponse.json(bugReport)
  } catch (error) {
    console.error("Bug report update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect()
    const user = await getAuthenticatedUser(request)

    const { id } = await params
    const bugReport = await BugReport.findOneAndDelete(bugLookup(id, user.company._id))

    if (!bugReport) {
      return NextResponse.json({ message: "Bug report not found" }, { status: 404 })
    }

    // Log the activity
    await ActivityLog.create({
      user: user._id,
      company: user.company._id,
      project: bugReport.project,
      action: "deleted_bug_report",
      entityType: "BugReport",
      entityId: bugReport._id,
      description: `${user.name} deleted bug report "${bugReport.summary}"`,
      details: {
        bugReportId: bugReport._id,
        summary: bugReport.summary,
        priority: bugReport.priority,
        severity: bugReport.severity,
        category: bugReport.category,
      },
    })

    return NextResponse.json({ message: "Bug report deleted successfully" })
  } catch (error) {
    console.error("Bug report deletion error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
