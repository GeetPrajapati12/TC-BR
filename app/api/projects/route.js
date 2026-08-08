import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import Project from "@/models/Project"
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
  await dbConnect()
  const user = await User.findById(decoded.userId).populate("company")
  if (!user) throw new Error("User not found")
  return user
}

// GET /api/projects - list projects for user's company
export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request)

    const projects = await Project.find({ company: user.company._id })
      .populate("lead", "name email role")
      .populate("members.user", "name email role")
      .sort({ updatedAt: -1 })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Projects GET error:", error)
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    if (error.message === "No token provided") {
      return NextResponse.json({ message: "No token provided" }, { status: 401 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST /api/projects - create a project in user's company
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request)
    const body = await request.json()
    const name = String(body.name || "").trim()
    const key = String(body.key || "")
      .toUpperCase()
      .trim()
    const description = String(body.description || "").trim()
    const type = String(body.type || "Web Application")
    const priority = String(body.priority || "Medium")

    if (!name || !key) {
      return NextResponse.json({ message: "Project name and key are required" }, { status: 400 })
    }

    // Enforce unique key within company
    const duplicate = await Project.findOne({ key, company: user.company._id })
    if (duplicate) {
      return NextResponse.json(
        { message: `Project key "${key}" already exists in ${user.company.name}` },
        { status: 409 },
      )
    }

    const project = await Project.create({
      name,
      key,
      description,
      type,
      company: user.company._id,
      lead: user._id,
      members: [
        {
          user: user._id,
          role: "Lead",
          joinedAt: new Date(),
        },
      ],
      status: "Active",
      priority,
      startDate: new Date(),
      isActive: true,
    })

    // Populate for UI consumption
    await project.populate("lead", "name email role")
    await project.populate("members.user", "name email role")

    // Activity log
    await ActivityLog.create({
      user: user._id,
      company: user.company._id,
      project: project._id,
      action: "created_project",
      entityType: "Project",
      entityId: project._id.toString(),
      description: `${user.name} created project "${project.name}" (${project.key})`,
      details: { key: project.key, priority: project.priority, type: project.type },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Projects POST error:", error)
    if (error.code === 11000) {
      // Unique index violation (e.g., key+company)
      return NextResponse.json({ message: "Project key must be unique within the company" }, { status: 409 })
    }
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    if (error.message === "No token provided") {
      return NextResponse.json({ message: "No token provided" }, { status: 401 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
