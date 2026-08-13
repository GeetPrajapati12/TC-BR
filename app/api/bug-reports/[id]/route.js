import dbConnect from "@/lib/mongodb"
import BugReport from "@/models/BugReport"
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
  delete updates.reporter

  const old = await BugReport.findOne({ $or: [{ id }, { _id: id }], company: user.company._id })
  if (!old) return notFound("Bug report not found")

  const bug = await BugReport.findOneAndUpdate(
    { $or: [{ id }, { _id: id }], company: user.company._id },
    updates,
    { new: true, runValidators: true }
  )
    .populate("reporter", "name email role")
    .populate("assignee", "name email role")

  const changes = Object.keys(updates)
    .filter((k) => String(old[k]) !== String(updates[k]))
    .map((k) => `${k}: "${old[k]}" → "${updates[k]}"`)

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: bug.project,
    action: "updated_bug_report",
    entityType: "BugReport",
    entityId: bug.id,
    description: `${user.name} updated bug report "${bug.summary}"`,
    details: { changes, updatedFields: Object.keys(updates) },
  })

  return ok(bug)
})

export const DELETE = withErrorHandling(async (request, { params }) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  const { id } = await params

  const bug = await BugReport.findOneAndDelete({
    $or: [{ id }, { _id: id }],
    company: user.company._id,
  })
  if (!bug) return notFound("Bug report not found")

  await ActivityLog.create({
    user: user._id,
    company: user.company._id,
    project: bug.project,
    action: "deleted_bug_report",
    entityType: "BugReport",
    entityId: bug.id,
    description: `${user.name} deleted bug report "${bug.summary}"`,
    details: { priority: bug.priority, severity: bug.severity },
  })

  return ok({ message: "Bug report deleted" })
})
