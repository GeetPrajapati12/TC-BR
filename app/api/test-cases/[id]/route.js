import dbConnect from "@/lib/mongodb"
import TestCase from "@/models/TestCase"
import ActivityLog from "@/models/ActivityLog"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, notFound, withErrorHandling } from "@/lib/api-response"

export const PUT = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  const updates = await request.json()
  delete updates._id
  delete updates.id
  delete updates.company
  delete updates.project
  delete updates.createdBy

  const old = await TestCase.findOne({ id, company: user.company._id })
  if (!old) return notFound("Test case not found")

  const testCase = await TestCase.findOneAndUpdate(
    { id, company: user.company._id },
    updates,
    { new: true, runValidators: true }
  )
    .populate("createdBy", "name email role")
    .populate("assignee", "name email role")

  const changes = Object.keys(updates)
    .filter((k) => String(old[k]) !== String(updates[k]))
    .map((k) => `${k}: "${old[k]}" → "${updates[k]}"`)

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: testCase.project,
    action: "updated_test_case",
    entityType: "TestCase",
    entityId: testCase.id,
    description: `${user.name} updated test case "${testCase.scenario}"`,
    details: { changes, updatedFields: Object.keys(updates) },
  })

  return ok(testCase)
})

export const DELETE = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  const testCase = await TestCase.findOneAndDelete({ id, company: user.company._id })
  if (!testCase) return notFound("Test case not found")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: testCase.project,
    action: "deleted_test_case",
    entityType: "TestCase",
    entityId: testCase.id,
    description: `${user.name} deleted test case "${testCase.scenario}"`,
    details: { priority: testCase.priority, category: testCase.category },
  })

  return ok({ message: "Test case deleted" })
})
