import dbConnect from "@/lib/mongodb"
import BugReport from "@/models/BugReport"
import Project from "@/models/Project"
import ActivityLog from "@/models/ActivityLog"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, created, badRequest, notFound, withErrorHandling } from "@/lib/api-response"

export const GET = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const query = { company: user.company._id }
  if (projectId) query.project = projectId

  const bugs = await BugReport.find(query)
    .populate("reporter", "name email role")
    .populate("assignee", "name email role")
    .sort({ createdAt: -1 })
    .lean()

  return ok(bugs)
})

export const POST = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const body = await request.json()
  const projectId = body.projectId

  if (!projectId) return badRequest("projectId is required")

  const project = await Project.findOne({ _id: projectId, company: user.company._id, isActive: true })
  if (!project) return notFound("Project not found")

  const count = await BugReport.countDocuments({ project: project._id })
  const id = `BUG-${project.key}-${String(count + 1).padStart(4, "0")}`

  const { projectId: _, ...rest } = body

  const bug = await BugReport.create({
    ...rest,
    id,
    project: project._id,
    company: user.company._id,
    reporter: user._id,
  })

  await bug.populate("reporter", "name email role")
  await bug.populate("assignee", "name email role")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: project._id,
    action: "created_bug_report",
    entityType: "BugReport",
    entityId: bug.id,
    description: `${user.name} filed bug report "${bug.summary}"`,
    details: {
      bugId: bug.id,
      priority: bug.priority,
      severity: bug.severity,
      category: bug.category,
      aiGenerated: bug.aiGenerated,
    },
  })

  return created(bug)
})
