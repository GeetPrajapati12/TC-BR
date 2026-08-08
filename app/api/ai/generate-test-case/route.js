import { NextResponse } from "next/server"
import { generateTestCaseWithAI } from "@/lib/ai-generator"

export async function POST(request) {
  try {
    const { summary } = await request.json()

    if (!summary || !String(summary).trim()) {
      return NextResponse.json({ message: "Summary is required" }, { status: 400 })
    }

    const result = await generateTestCaseWithAI(String(summary).trim())
    return NextResponse.json(result)
  } catch (error) {
    console.error("Test case AI generation error:", error)
    return NextResponse.json({ message: "Failed to generate test case" }, { status: 500 })
  }
}
