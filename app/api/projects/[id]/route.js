import dbConnect from "@/lib/mongodb"
import Project from "@/models/Project"
import ActivityLog from "@/models/ActivityLog"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, badRequest, notFound, withErrorHandling } from "@/lib/api-response"

export const GET = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  const project = await Project.findOne({ _id: id, company: user.company._id, isActive: true })
    .populate("lead", "name email role")
    .populate("members.user", "name email role")
    .lean()

  if (!project) return notFound("Project not found")
  return ok(project)
})

export const PUT = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  const updates = await request.json()
  // Prevent overwriting protected fields
  delete updates._id
  delete updates.company
  delete updates.key
  delete updates.lead

  const project = await Project.findOneAndUpdate(
    { _id: id, company: user.company._id },
    updates,
    { new: true, runValidators: true }
  )
    .populate("lead", "name email role")
    .populate("members.user", "name email role")

  if (!project) return notFound("Project not found")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: project._id,
    action: "updated_project",
    entityType: "Project",
    entityId: project._id.toString(),
    description: `${user.name} updated project "${project.name}"`,
    details: { updatedFields: Object.keys(updates) },
  })

  return ok(project)
})

export const DELETE = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  // Soft delete
  const project = await Project.findOneAndUpdate(
    { _id: id, company: user.company._id },
    { isActive: false },
    { new: true }
  )

  if (!project) return notFound("Project not found")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    action: "deleted_project",
    entityType: "Project",
    entityId: project._id.toString(),
    description: `${user.name} deleted project "${project.name}"`,
  })

  return ok({ message: "Project deleted" })
})
