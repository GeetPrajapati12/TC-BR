import dbConnect from "@/lib/mongodb"
import Project from "@/models/Project"
import ActivityLog from "@/models/ActivityLog"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, created, badRequest, conflict, withErrorHandling } from "@/lib/api-response"

export const GET = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const projects = await Project.find({ company: user.company._id, isActive: true })
    .populate("lead", "name email role")
    .populate("members.user", "name email role")
    .sort({ updatedAt: -1 })
    .lean()

  return ok(projects)
})

export const POST = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const body = await request.json()
  const name = String(body.name ?? "").trim()
  const key = String(body.key ?? "").toUpperCase().trim()
  const description = String(body.description ?? "").trim()
  const type = String(body.type ?? "Web Application")
  const priority = String(body.priority ?? "Medium")

  if (!name || !key) return badRequest("Project name and key are required")
  if (!/^[A-Z0-9]{1,10}$/.test(key)) return badRequest("Key must be 1–10 uppercase letters and numbers")

  const duplicate = await Project.findOne({ key, company: user.company._id })
  if (duplicate) return conflict(`Project key "${key}" already exists in your company`)

  const project = await Project.create({
    name,
    key,
    description,
    type,
    priority,
    company: user.company._id,
    lead: user._id,
    members: [{ user: user._id, role: "Lead", joinedAt: new Date() }],
    status: "Active",
    startDate: new Date(),
    isActive: true,
  })

  await project.populate("lead", "name email role")
  await project.populate("members.user", "name email role")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: project._id,
    action: "created_project",
    entityType: "Project",
    entityId: project._id.toString(),
    description: `${user.name} created project "${project.name}" (${project.key})`,
    details: { key: project.key, priority, type },
  })

  return created(project)
})
