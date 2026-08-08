import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import Project from "@/models/Project"
import User from "@/models/User"

const JWT_SECRET = process.env.JWT_SECRET

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided")
  }
  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, JWT_SECRET)
  await dbConnect()
  const user = await User.findById(decoded.userId).populate("company", "name slug")
  if (!user) throw new Error("User not found")
  return user
}

// GET /api/projects/[id] - returns project details if it belongs to user's company
export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    const { id } = await params

    const project = await Project.findOne({ _id: id, company: user.company._id })
      .populate("lead", "name email role")
      .populate("members.user", "name email role")

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Project GET error:", error)
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    if (error.message === "No token provided") {
      return NextResponse.json({ message: "No token provided" }, { status: 401 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
