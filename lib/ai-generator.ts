import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export interface TestCaseGenerationResult {
  scenario: string
  steps: string
  expected: string
  priority: "Low" | "Medium" | "High" | "Critical"
  category: string
}

export interface BugReportGenerationResult {
  description: string
  steps: string
  expected: string
  actual: string
  priority: "Low" | "Medium" | "High" | "Critical"
  severity: "Minor" | "Major" | "Critical" | "Blocker"
  category: string
  environment: string
}

function isAIAvailable(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
}

// ─── Test Case ────────────────────────────────────────────────────────────────

export async function generateTestCaseWithAI(
  summary: string
): Promise<TestCaseGenerationResult> {
  if (!isAIAvailable()) {
    return generateFallbackTestCase(summary)
  }

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-pro"),
      system: `You are a senior QA engineer. Generate a detailed test case as a JSON object.
Schema:
{
  "scenario": string,
  "steps": string (numbered list),
  "expected": string,
  "priority": "Low" | "Medium" | "High" | "Critical",
  "category": string
}
Return only valid JSON. No markdown, no explanation.`,
      prompt: `Generate a comprehensive QA test case for: "${summary}"`,
    })

    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean) as TestCaseGenerationResult
  } catch (error) {
    console.error("[AI] Test case generation failed, using fallback:", error)
    return generateFallbackTestCase(summary)
  }
}

// ─── Bug Report ───────────────────────────────────────────────────────────────

export async function generateBugReportWithAI(
  summary: string
): Promise<BugReportGenerationResult> {
  if (!isAIAvailable()) {
    return generateFallbackBugReport(summary)
  }

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-pro"),
      system: `You are a senior QA engineer. Generate a detailed bug report as a JSON object.
Schema:
{
  "description": string,
  "steps": string (numbered list),
  "expected": string,
  "actual": string,
  "priority": "Low" | "Medium" | "High" | "Critical",
  "severity": "Minor" | "Major" | "Critical" | "Blocker",
  "category": string,
  "environment": string
}
Return only valid JSON. No markdown, no explanation.`,
      prompt: `Generate a comprehensive bug report for: "${summary}"`,
    })

    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean) as BugReportGenerationResult
  } catch (error) {
    console.error("[AI] Bug report generation failed, using fallback:", error)
    return generateFallbackBugReport(summary)
  }
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

type Priority = TestCaseGenerationResult["priority"]

interface DomainRule {
  keywords: string[]
  category: string
  priority: Priority
}

const DOMAIN_RULES: DomainRule[] = [
  { keywords: ["login", "password", "auth", "sign in", "credential"], category: "Authentication", priority: "High" },
  { keywords: ["cash", "dispenser", "cassette", "bills", "cdu"], category: "Cash Dispenser", priority: "Critical" },
  { keywords: ["payment", "charge", "billing", "invoice", "transaction"], category: "Payment", priority: "Critical" },
  { keywords: ["dashboard", "home", "main", "overview"], category: "Dashboard", priority: "Medium" },
  { keywords: ["ticket", "scan", "qr", "barcode"], category: "Tickets", priority: "Medium" },
  { keywords: ["settings", "config", "configuration", "terminal"], category: "Settings", priority: "Medium" },
  { keywords: ["report", "daily", "email", "export"], category: "Daily Report", priority: "Low" },
  { keywords: ["hardware", "printer", "camera", "sensor", "device"], category: "Hardware", priority: "High" },
  { keywords: ["security", "account", "user", "permission", "role"], category: "Security", priority: "High" },
  { keywords: ["crash", "freeze", "hang", "unresponsive", "not responding"], category: "Crash", priority: "Critical" },
  { keywords: ["performance", "slow", "timeout", "latency", "speed"], category: "Performance", priority: "High" },
  { keywords: ["network", "api", "connection", "offline", "sync"], category: "Network", priority: "High" },
  { keywords: ["ui", "display", "button", "screen", "layout", "visual"], category: "UI", priority: "Medium" },
]

function detectDomain(summary: string): { category: string; priority: Priority } {
  const lower = summary.toLowerCase()
  for (const rule of DOMAIN_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { category: rule.category, priority: rule.priority }
    }
  }
  return { category: "Functional", priority: "Medium" }
}

function generateFallbackTestCase(summary: string): TestCaseGenerationResult {
  const { category, priority } = detectDomain(summary)

  return {
    scenario: `Verify that ${summary} works correctly`,
    steps: [
      "1. Set up the required preconditions and test environment",
      "2. Navigate to the relevant section of the application",
      `3. Perform the action: ${summary}`,
      "4. Observe the system response and any UI changes",
      "5. Verify data integrity and state changes",
      "6. Test edge cases and boundary conditions",
      "7. Confirm error handling behaves as expected",
      "8. Verify the action can be undone or repeated successfully",
    ].join("\n"),
    expected: `The system should handle "${summary}" correctly, providing appropriate feedback, maintaining data integrity, and not producing any errors or unexpected behaviour.`,
    priority,
    category,
  }
}

function generateFallbackBugReport(summary: string): BugReportGenerationResult {
  const { category, priority } = detectDomain(summary)
  const severity =
    priority === "Critical" ? "Blocker" : priority === "High" ? "Critical" : priority === "Medium" ? "Major" : "Minor"

  return {
    description: `A defect has been identified where ${summary}. This issue impacts normal system operation and may affect user workflows, data integrity, or system stability.`,
    steps: [
      "1. Set up the required preconditions",
      "2. Navigate to the affected area of the application",
      `3. Attempt to perform: ${summary}`,
      "4. Observe the unexpected behaviour",
      "5. Note any error messages or system responses",
      "6. Attempt to reproduce the issue",
      "7. Record any patterns in reproduction",
    ].join("\n"),
    expected: "The system should function correctly without errors, providing appropriate feedback and maintaining expected behaviour.",
    actual: `The system exhibits unexpected behaviour: ${summary}. This deviates from the expected functionality and may impact users.`,
    priority,
    severity: severity as BugReportGenerationResult["severity"],
    category,
    environment: "Production — please specify OS, browser/app version, and user role when filing",
  }
}
