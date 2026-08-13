import jwt from "jsonwebtoken"
import User from "@/models/User"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("Please define the JWT_SECRET environment variable inside .env.local")
}

/**
 * Extracts and verifies the Bearer token from a request,
 * then returns the populated user document.
 * Throws a typed error that API routes can catch and map to HTTP responses.
 */
export async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("No token provided")
    err.status = 401
    throw err
  }

  const token = authHeader.substring(7)

  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    const err = new Error("Invalid or expired token")
    err.status = 401
    throw err
  }

  const user = await User.findById(decoded.userId)
    .populate("company", "name slug _id")
    .lean()

  if (!user) {
    const err = new Error("User not found")
    err.status = 404
    throw err
  }

  if (!user.isActive) {
    const err = new Error("Account is deactivated")
    err.status = 403
    throw err
  }

  return user
}

/**
 * Signs a JWT for a given user + company.
 */
export function signToken(userId, email, companyId, companyName) {
  return jwt.sign(
    { userId, email, companyId, companyName },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}

/**
 * Maps auth errors to NextResponse-compatible shapes.
 */
export function authErrorResponse(error) {
  const status = error.status ?? 500
  return { message: error.message ?? "Internal server error", status }
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
