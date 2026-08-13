import dbConnect from "@/lib/mongodb"
import ActivityLog from "@/models/ActivityLog"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, withErrorHandling } from "@/lib/api-response"

export const GET = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")))
  const skip = (page - 1) * limit

  const query = { company: user.company._id }
  const projectId = searchParams.get("projectId")
  if (projectId) query.project = projectId

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ])

  return ok({
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})
