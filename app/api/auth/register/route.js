import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import ActivityLog from "@/models/ActivityLog"

export async function POST(request) {
  try {
    await dbConnect()

    const { name, email, password, role } = await request.json()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists with this email" }, { status: 400 })
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
    })

    // Log the registration
    await ActivityLog.create({
      user: user._id,
      action: "user_registered",
      entityType: "User",
      entityId: user._id.toString(),
      description: `${name} registered as ${role}`,
      details: { role, email },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject()

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
