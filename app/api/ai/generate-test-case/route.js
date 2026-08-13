import { generateTestCaseWithAI } from "@/lib/ai-generator"
import { ok, badRequest, serverError } from "@/lib/api-response"

export async function POST(request) {
  try {
    const { summary } = await request.json()
    if (!summary?.trim()) return badRequest("Summary is required")

    const result = await generateTestCaseWithAI(String(summary).trim())
    return ok(result)
  } catch (error) {
    console.error("[AI/generate-test-case]", error)
    return serverError("Failed to generate test case")
  }
}
