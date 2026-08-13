import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import ActivityLog from "@/models/ActivityLog"
import { signToken, slugify } from "@/lib/auth"
import { ok, badRequest, unauthorized, serverError } from "@/lib/api-response"

export async function POST(request) {
  try {
    await dbConnect()

    const body = await request.json()
    const { email, password, companyName } = body

    if (!email?.trim() || !password || !companyName?.trim()) {
      return badRequest("Email, password, and company name are required")
    }

    const company = await Company.findOne({ slug: slugify(companyName.trim()) })
    if (!company) {
      return badRequest("Company not found. Check the company name and try again.")
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate("company", "name slug")
    if (!user) {
      return unauthorized("Invalid email or password")
    }

    if (String(user.company._id) !== String(company._id)) {
      return unauthorized("This account does not belong to the specified company")
    }

    if (!user.isActive) {
      return unauthorized("Your account has been deactivated. Contact your admin.")
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return unauthorized("Invalid email or password")
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    const token = signToken(user._id, user.email, company._id, company.name)

    await ActivityLog.create({
      user: user._id,
      company: company._id,
      action: "user_login",
      entityType: "User",
      entityId: user._id.toString(),
      description: `${user.name} signed in`,
      details: { role: user.role },
    })

    return ok({
      token,
      user: user.toJSON(),
      company: { _id: company._id, name: company.name, slug: company.slug },
    })
  } catch (error) {
    console.error("[Login]", error)
    return serverError()
  }
}
