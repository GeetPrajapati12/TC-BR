import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import ActivityLog from "@/models/ActivityLog"

const JWT_SECRET = process.env.JWT_SECRET

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function POST(request) {
  try {
    await dbConnect()

    const { email, password, companyName } = await request.json()

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ message: "Please enter your company name" }, { status: 400 })
    }

    const company = await Company.findOne({ slug: slugify(companyName) })
    if (!company) {
      return NextResponse.json({ message: "Company not found. Please enter your company name." }, { status: 400 })
    }

    // Find user and ensure they belong to this company
    const user = await User.findOne({ email }).populate("company", "name slug")
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    if (!user.company || String(user.company._id) !== String(company._id)) {
      return NextResponse.json({ message: "User does not belong to this company" }, { status: 403 })
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, companyId: company._id, companyName: company.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    await ActivityLog.create({
      user: user._id,
      company: company._id,
      action: "user_login",
      entityType: "User",
      entityId: user._id.toString(),
      description: `${user.name} logged in`,
      details: { email, role: user.role, company: company.name },
    })

    const { password: _, ...userWithoutPassword } = user.toObject()
    return NextResponse.json({
      token,
      user: userWithoutPassword,
      company: { _id: company._id, name: company.name, slug: company.slug },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
