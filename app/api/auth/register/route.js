import mongoose from "mongoose"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import ActivityLog from "@/models/ActivityLog"
import { slugify } from "@/lib/auth"
import { ok, badRequest, conflict, serverError } from "@/lib/api-response"

export async function POST(request) {
  try {
    await dbConnect()

    const body = await request.json()
    const { name, email, password, role, companyName, isAdmin, companyDescription, industry } = body

    if (!name?.trim() || !email?.trim() || !password || !role || !companyName?.trim()) {
      return badRequest("Name, email, password, role, and company name are required")
    }

    if (password.length < 6) {
      return badRequest("Password must be at least 6 characters")
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return conflict("An account with this email already exists")
    }

    const companySlug = slugify(companyName.trim())
    const existingCompany = await Company.findOne({ slug: companySlug })
    const isUserAdmin = role === "Admin" || isAdmin === true

    if (isUserAdmin) {
      if (existingCompany) {
        return conflict("A company with this name already exists. Choose a different name or sign in as a member.")
      }

      const tempId = new mongoose.Types.ObjectId()
      const company = await Company.create({
        name: companyName.trim(),
        slug: companySlug,
        description: companyDescription?.trim() ?? "",
        industry: industry ?? "Technology",
        adminUser: tempId,
      })

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: "Admin",
        company: company._id,
        isCompanyAdmin: true,
      })

      company.adminUser = user._id
      await company.save()

      await ActivityLog.create({
        user: user._id,
        company: company._id,
        action: "company_created",
        entityType: "Company",
        entityId: company._id.toString(),
        description: `${user.name} created company "${company.name}"`,
        details: { companyName: company.name, industry: company.industry },
      })

      await ActivityLog.create({
        user: user._id,
        company: company._id,
        action: "user_registered",
        entityType: "User",
        entityId: user._id.toString(),
        description: `${user.name} registered as Admin`,
        details: { role: "Admin", email: user.email },
      })

      return ok({ message: "Account created successfully. Please sign in." }, 201)
    }

    // Non-admin: company must exist
    if (!existingCompany) {
      return badRequest("Company not found. Check the company name or ask your admin to register it.")
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
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
      description: `${user.name} registered as ${role}`,
      details: { role, email: user.email, company: existingCompany.name },
    })

    return ok({ message: "Account created successfully. Please sign in." }, 201)
  } catch (error) {
    if (error.code === 11000) return conflict("An account with this email already exists")
    console.error("[Register]", error)
    return serverError()
  }
}
