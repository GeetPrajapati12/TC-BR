import { NextResponse } from "next/server"
import mongoose from "mongoose"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import ActivityLog from "@/models/ActivityLog"

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

    const { name, email, password, role, companyName, isAdmin, companyDescription, industry } = await request.json()

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ message: "Please enter your company name" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists with this email" }, { status: 400 })
    }

    const companySlug = slugify(companyName)
    const existingCompany = await Company.findOne({ slug: companySlug })

    // Admin flow: must create a NEW company; if exists -> error
    const isUserAdmin = role === "Admin" || isAdmin === true

    if (isUserAdmin) {
      if (existingCompany) {
        return NextResponse.json(
          { message: "Enter your company name. This company is already registered." },
          { status: 400 },
        )
      }

      // Create company with temporary adminUser ObjectId
      const tempAdminId = new mongoose.Types.ObjectId()
      const company = await Company.create({
        name: companyName.trim(),
        slug: companySlug,
        description: companyDescription || "",
        industry: industry || "Technology",
        adminUser: tempAdminId,
      })

      // Create user as company admin
      const user = await User.create({
        name,
        email,
        password,
        role: "Admin",
        company: company._id,
        isCompanyAdmin: true,
      })

      // Link company adminUser to the created user
      company.adminUser = user._id
      await company.save()

      // Log activities
      await ActivityLog.create({
        user: user._id,
        company: company._id,
        action: "company_created",
        entityType: "Company",
        entityId: company._id.toString(),
        description: `${name} created company "${company.name}"`,
        details: { companyName: company.name, industry: company.industry },
      })

      await ActivityLog.create({
        user: user._id,
        company: company._id,
        action: "user_registered",
        entityType: "User",
        entityId: user._id.toString(),
        description: `${name} registered as Admin`,
        details: { role: "Admin", email },
      })

      const { password: _, ...userWithoutPassword } = user.toObject()
      return NextResponse.json({ message: "User created successfully", user: userWithoutPassword }, { status: 201 })
    }

    // Employee flow: company must EXIST; if not -> error
    if (!existingCompany) {
      return NextResponse.json({ message: "Enter your company name. Company not found." }, { status: 400 })
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      company: existingCompany._id,
      isCompanyAdmin: false,
    })

    await ActivityLog.create({
      user: user._id,
      company: existingCompany._id,
      action: "user_registered",
      entityType: "User",
      entityId: user._id.toString(),
      description: `${name} registered as ${role}`,
      details: { role, email, company: existingCompany.name },
    })

    const { password: _, ...userWithoutPassword } = user.toObject()
    return NextResponse.json({ message: "User created successfully", user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
