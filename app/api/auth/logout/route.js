import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import ActivityLog from "@/models/ActivityLog"
import { signToken } from "@/lib/auth"
import jwt from "jsonwebtoken"
import { ok, serverError } from "@/lib/api-response"

const JWT_SECRET = process.env.JWT_SECRET

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      await dbConnect()
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        const user = await User.findById(decoded.userId).populate("company", "_id name")
        if (user?.company) {
          await ActivityLog.create({
            user: user._id,
            company: user.company._id,
            action: "user_logout",
            entityType: "User",
            entityId: user._id.toString(),
            description: `${user.name} signed out`,
            details: { role: user.role },
          })
        }
      } catch {
        // Token already invalid — still return success
      }
    }
    return ok({ message: "Signed out successfully" })
  } catch (error) {
    console.error("[Logout]", error)
    return serverError()
  }
}
