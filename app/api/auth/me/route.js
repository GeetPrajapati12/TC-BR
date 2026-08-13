import dbConnect from "@/lib/mongodb"
import { getAuthenticatedUser } from "@/lib/auth"
import { ok, withErrorHandling } from "@/lib/api-response"

export const GET = withErrorHandling(async (request) => {
  await dbConnect()
  const user = await getAuthenticatedUser(request)
  return ok(user)
})
