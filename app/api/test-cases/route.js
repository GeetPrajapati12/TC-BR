import dbConnect from "@/lib/mongodb"
import TestCase from "@/models/TestCase"
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

  const testCases = await TestCase.find(query)
    .populate("createdBy", "name email role")
    .populate("assignee", "name email role")
    .sort({ createdAt: -1 })
    .lean()

  return ok(testCases)
})

export const POST = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)

  const body = await request.json()
  const projectId = body.projectId

  if (!projectId) return badRequest("projectId is required")

  const project = await Project.findOne({ _id: projectId, company: user.company._id, isActive: true })
  if (!project) return notFound("Project not found")

  const count = await TestCase.countDocuments({ project: project._id })
  const id = `TC-${project.key}-${String(count + 1).padStart(3, "0")}`

  const { projectId: _, ...rest } = body

  const testCase = await TestCase.create({
    ...rest,
    id,
    project: project._id,
    company: user.company._id,
    createdBy: user._id,
  })

  await testCase.populate("createdBy", "name email role")
  await testCase.populate("assignee", "name email role")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: project._id,
    action: "created_test_case",
    entityType: "TestCase",
    entityId: testCase.id,
    description: `${user.name} created test case "${testCase.scenario}"`,
    details: {
      testCaseId: testCase.id,
      priority: testCase.priority,
      category: testCase.category,
      aiGenerated: testCase.aiGenerated,
    },
  })

  return created(testCase)
})
