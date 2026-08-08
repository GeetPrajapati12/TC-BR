// Temporary debug file - you can delete this after testing
export function debugEnvironment() {
  console.log("🔍 Environment Debug:")
  console.log("- NODE_ENV:", process.env.NODE_ENV)
  console.log(
    "- All env keys:",
    Object.keys(process.env).filter((key) => key.includes("GOOGLE")),
  )
  console.log("- Direct key check:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "EXISTS" : "MISSING")
  console.log("- Key length:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0)
  console.log("- Key preview:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 10) + "...")
}
