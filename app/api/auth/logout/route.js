import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import ActivityLog from "@/models/ActivityLog"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request) {
  try {
    await dbConnect()

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        const user = await User.findById(decoded.userId)

        if (user) {
          // Log the logout
          await ActivityLog.create({
            user: user._id,
            action: "user_logout",
            entityType: "User",
            entityId: user._id.toString(),
            description: `${user.name} logged out`,
            details: { email: user.email, role: user.role },
          })
        }
      } catch (error) {
        console.error("Token verification error during logout:", error)
      }
    }

    return NextResponse.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
