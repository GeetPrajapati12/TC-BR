import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import ActivityLog from "@/models/ActivityLog"
import User from "@/models/User"

const JWT_SECRET = process.env.JWT_SECRET

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "No token provided" }, { status: 401 })
    }

    await dbConnect()

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId).populate("company")
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const logs = await ActivityLog.find({ company: user.company._id })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await ActivityLog.countDocuments({ company: user.company._id })

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Logs fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
