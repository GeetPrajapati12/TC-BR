import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
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

    const user = await User.findById(decoded.userId).select("-password").populate("company", "name slug")

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Auth verification error:", error)
    return NextResponse.json({ message: "Invalid token" }, { status: 401 })
  }
}
