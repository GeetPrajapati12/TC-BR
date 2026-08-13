import { generateBugReportWithAI } from "@/lib/ai-generator"
import { ok, badRequest, serverError } from "@/lib/api-response"

export async function POST(request) {
  try {
    const { summary } = await request.json()
    if (!summary?.trim()) return badRequest("Summary is required")

    const result = await generateBugReportWithAI(String(summary).trim())
    return ok(result)
  } catch (error) {
    console.error("[AI/generate-bug-report]", error)
    return serverError("Failed to generate bug report")
  }
}
