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

// Check if Google Gemini API key is available
const isAIAvailable = () => {
  const hasKey = typeof process !== "undefined" && process.env?.GOOGLE_GENERATIVE_AI_API_KEY
  console.log("🔍 Debug - API Key available:", !!hasKey)
  console.log("🔍 Debug - API Key length:", process.env?.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0)
  return hasKey
}

export async function generateTestCaseWithAI(summary: string): Promise<TestCaseGenerationResult> {
  // If no API key, use enhanced fallback
  if (!isAIAvailable()) {
    console.log("Google Gemini API key not found, using enhanced fallback generation")
    return generateEnhancedTestCase(summary)
  }

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-pro"),
      system: `You are an expert QA engineer specializing in kiosk admin systems. Generate detailed test case information based on the provided summary.

Return your response as a JSON object with the following structure:
{
  "scenario": "Clear test scenario description for kiosk admin system",
  "steps": "Detailed step-by-step testing instructions (numbered list)",
  "expected": "Expected result description",
  "priority": "Low|Medium|High|Critical",
  "category": "Login|Dashboard|Cash Dispenser|Tickets|Settings|Machine Register|Daily Report|Hardware|Security|Functional"
}

Guidelines for Kiosk Admin System:
- Focus on cash handling, hardware status, admin authentication
- Include specific kiosk terminology (cassettes, CDU, sentry, terminals)
- Make steps actionable for kiosk operators
- Consider hardware integration and cash management
- Set appropriate priority (cash-related = High/Critical)
- Use professional QA language for kiosk systems`,
      prompt: `Generate a comprehensive test case for kiosk admin system: "${summary}"

Consider this is for a cash dispensing kiosk with admin interface. Include hardware checks, cash management, and system administration aspects.`,
    })

    const result = JSON.parse(text) as TestCaseGenerationResult
    return result
  } catch (error) {
    console.error("Gemini AI generation failed:", error)
    // Fallback to enhanced generation
    return generateEnhancedTestCase(summary)
  }
}

export async function generateBugReportWithAI(summary: string): Promise<BugReportGenerationResult> {
  // If no API key, use enhanced fallback
  if (!isAIAvailable()) {
    console.log("Google Gemini API key not found, using enhanced fallback generation")
    return generateEnhancedBugReport(summary)
  }

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-pro"),
      system: `You are an expert QA engineer specializing in kiosk admin systems. Generate comprehensive bug report information based on the provided summary.

Return your response as a JSON object with the following structure:
{
  "description": "Detailed bug description with impact analysis for kiosk operations",
  "steps": "Step-by-step reproduction instructions (numbered list)",
  "expected": "What should happen (expected behavior)",
  "actual": "What actually happens (observed behavior)",
  "priority": "Low|Medium|High|Critical",
  "severity": "Minor|Major|Critical|Blocker",
  "category": "Cash Handling|Authentication|Hardware|UI|Data|Configuration|Crash|Network|Security",
  "environment": "Kiosk Admin System Environment"
}

Guidelines for Kiosk Admin System:
- Prioritize cash handling and hardware issues as Critical
- Include impact on kiosk operations and customer service
- Focus on admin interface, hardware communication, cash management
- Consider financial implications and operational disruption
- Use kiosk-specific terminology and scenarios
- Write clear reproduction steps for kiosk operators`,
      prompt: `Generate a comprehensive bug report for kiosk admin system: "${summary}"

Consider this affects a cash dispensing kiosk with admin interface. Analyze impact on cash operations, hardware functionality, and system administration.`,
    })

    const result = JSON.parse(text) as BugReportGenerationResult
    return result
  } catch (error) {
    console.error("Gemini AI generation failed:", error)
    // Fallback to enhanced generation
    return generateEnhancedBugReport(summary)
  }
}

// Enhanced fallback functions with kiosk-specific logic
function generateEnhancedTestCase(summary: string): TestCaseGenerationResult {
  const lowerSummary = summary.toLowerCase()

  // Determine category and priority based on your kiosk system keywords
  let category = "Functional"
  let priority: TestCaseGenerationResult["priority"] = "Medium"

  // Login related tests
  if (lowerSummary.includes("login") || lowerSummary.includes("password") || lowerSummary.includes("authentication")) {
    category = "Login"
    priority = "High"
  }
  // Dashboard related tests
  else if (
    lowerSummary.includes("dashboard") ||
    lowerSummary.includes("main screen") ||
    lowerSummary.includes("home")
  ) {
    category = "Dashboard"
    priority = "Medium"
  }
  // Cash Dispenser related tests
  else if (
    lowerSummary.includes("cash") ||
    lowerSummary.includes("dispenser") ||
    lowerSummary.includes("cassette") ||
    lowerSummary.includes("bills")
  ) {
    category = "Cash Dispenser"
    priority = "High"
  }
  // Tickets related tests
  else if (lowerSummary.includes("ticket") || lowerSummary.includes("scan") || lowerSummary.includes("qr")) {
    category = "Tickets"
    priority = "Medium"
  }
  // Settings related tests
  else if (
    lowerSummary.includes("settings") ||
    lowerSummary.includes("configuration") ||
    lowerSummary.includes("terminal")
  ) {
    category = "Settings"
    priority = "Medium"
  }
  // Machine Register related tests
  else if (lowerSummary.includes("machine") || lowerSummary.includes("register") || lowerSummary.includes("sentry")) {
    category = "Machine Register"
    priority = "Medium"
  }
  // Daily Report related tests
  else if (lowerSummary.includes("report") || lowerSummary.includes("daily") || lowerSummary.includes("email")) {
    category = "Daily Report"
    priority = "Low"
  }
  // Hardware related tests
  else if (
    lowerSummary.includes("hardware") ||
    lowerSummary.includes("printer") ||
    lowerSummary.includes("camera") ||
    lowerSummary.includes("cdu")
  ) {
    category = "Hardware"
    priority = "High"
  }
  // Security related tests
  else if (lowerSummary.includes("security") || lowerSummary.includes("account") || lowerSummary.includes("user")) {
    category = "Security"
    priority = "High"
  }

  // Generate detailed steps based on category and your kiosk system patterns
  let steps = ""
  let expected = ""

  if (category === "Login") {
    steps = `1. Launch the kiosk application
2. Verify login page is displayed with all options (Password Login, Scan Login, Support)
3. Test the specific login scenario: ${summary}
4. Enter credentials as required
5. Click "Login" button
6. Observe system response and redirection
7. Verify session management and user permissions
8. Check error handling for invalid credentials`
    expected = `Login functionality should work correctly for ${summary} with proper authentication, appropriate error messages, and successful redirection to Dashboard page`
  } else if (category === "Dashboard") {
    steps = `1. Login to the admin system successfully
2. Navigate to the Dashboard page
3. Verify all dashboard elements are loaded (denominations, hardware status, batch info)
4. Test the specific dashboard feature: ${summary}
5. Check ADD BILLS button visibility based on cassette status
6. Verify TOTAL AMOUNT calculation accuracy
7. Test navigation buttons (Ticket, Daily Report, Machine Register, Settings, Cash Dispenser)
8. Verify hardware status indicators (CDU, Camera, Printer, Sentry)`
    expected = `Dashboard should display correctly for ${summary} with accurate data, functional navigation buttons, proper hardware status indicators, and correct bill management features`
  } else if (category === "Cash Dispenser") {
    steps = `1. Login to admin system
2. Navigate to Cash Dispenser module
3. Verify cassette list display (active/inactive status)
4. Test the cash dispenser functionality: ${summary}
5. Check cassette limits, low counters, and bill present indicators
6. Verify reject bin list and amounts
7. Test deposit report functionality and date filtering
8. Check CDU hardware communication and status`
    expected = `Cash dispenser functionality should work correctly for ${summary} with proper cassette management, accurate bill counting, reliable hardware communication, and correct deposit reporting`
  } else if (category === "Tickets") {
    steps = `1. Access the admin system
2. Navigate to Tickets module
3. Verify ticket list display (blank or with scanned tickets)
4. Test the ticket feature: ${summary}
5. Check ticket validation and processing
6. Verify Terminal ID dropdown filtering
7. Test date range filtering functionality
8. Check ticket status updates and details display`
    expected = `Ticket functionality should work properly for ${summary} with accurate scanning, proper validation, correct filtering by Terminal ID and date range, and detailed ticket information display`
  } else if (category === "Settings") {
    steps = `1. Login to admin system
2. Navigate to Settings module
3. Access the relevant settings tab (Terminal, Cassettes, Notification, Security, Accounts, Diagnose, Advance)
4. Test the settings functionality: ${summary}
5. Modify configuration values as needed
6. Save changes and verify persistence
7. Test validation rules and error handling
8. Verify system behavior changes take effect immediately`
    expected = `Settings functionality should work correctly for ${summary} with proper validation, data persistence, immediate system updates, and appropriate access controls`
  } else if (category === "Machine Register") {
    steps = `1. Access admin system
2. Navigate to Machine Register module
3. Test machine registration functionality: ${summary}
4. Verify sentry integration options (Yes/No prompt)
5. Test QR code scanning for machine registration
6. Check terminal name assignment and display
7. Verify machine list updates and Clear All Sentry functionality
8. Test both sentry and non-sentry registration paths`
    expected = `Machine registration should work properly for ${summary} with accurate QR scanning, proper sentry integration options, correct terminal name handling, and reliable machine list management`
  } else if (category === "Daily Report") {
    steps = `1. Login to admin system
2. Navigate to Daily Report module
3. Verify daily report data display with today's summary
4. Test the report functionality: ${summary}
5. Check data accuracy and completeness
6. Test Email Report functionality and delivery
7. Verify report formatting and content
8. Check recipient email configuration`
    expected = `Daily report functionality should work correctly for ${summary} with accurate data display, successful email delivery to configured recipients, and proper report formatting`
  } else if (category === "Hardware") {
    steps = `1. Access admin system
2. Check hardware status section on Dashboard
3. Test the hardware functionality: ${summary}
4. Verify device communication and status indicators
5. Check CDU, Camera, Printer, and Sentry device status (green/red)
6. Test device responses and diagnostic functions
7. Verify error reporting and troubleshooting options
8. Test hardware reset functionality if available`
    expected = `Hardware functionality should work properly for ${summary} with accurate status indicators (green for working, red for not working), reliable device communication, and proper diagnostic information`
  } else if (category === "Security") {
    steps = `1. Access admin system
2. Navigate to Security/Accounts settings
3. Test the security feature: ${summary}
4. Verify password change functionality and validation
5. Test user account management (add, edit, delete operators)
6. Check role-based access controls
7. Verify password visibility toggles and validation rules
8. Test CRM TID and QR code display`
    expected = `Security functionality should work correctly for ${summary} with proper password validation, secure user management, appropriate access controls, and reliable authentication mechanisms`
  } else {
    // Default functional test for kiosk system
    steps = `1. Login to the kiosk admin system
2. Navigate to the relevant module
3. Verify initial state and prerequisites
4. Execute the main functionality: ${summary}
5. Test normal operation scenarios
6. Verify data accuracy and system responses
7. Test error handling and edge cases
8. Check integration with hardware components and other system modules`
    expected = `System should function correctly for ${summary} with proper data handling, accurate responses, reliable hardware integration, and seamless operation within the kiosk admin environment`
  }

  return {
    scenario: `Verify that ${summary} works correctly in the kiosk admin system`,
    steps,
    expected,
    priority,
    category,
  }
}

function generateEnhancedBugReport(summary: string): BugReportGenerationResult {
  const lowerSummary = summary.toLowerCase()

  // Determine category, priority, and severity based on your kiosk system
  let category = "Functional"
  let priority: BugReportGenerationResult["priority"] = "Medium"
  let severity: BugReportGenerationResult["severity"] = "Major"
  const environment = "Kiosk Admin System - Production Environment"

  // Critical kiosk issues
  if (lowerSummary.includes("crash") || lowerSummary.includes("freeze") || lowerSummary.includes("hang")) {
    category = "Crash"
    priority = "Critical"
    severity = "Blocker"
  }
  // Cash handling issues (highest priority for kiosk)
  else if (
    lowerSummary.includes("cash") ||
    lowerSummary.includes("dispenser") ||
    lowerSummary.includes("bills") ||
    lowerSummary.includes("cassette")
  ) {
    category = "Cash Handling"
    priority = "Critical"
    severity = "Critical"
  }
  // Login/Authentication issues
  else if (
    lowerSummary.includes("login") ||
    lowerSummary.includes("password") ||
    lowerSummary.includes("authentication")
  ) {
    category = "Authentication"
    priority = "High"
    severity = "Major"
  }
  // Hardware communication issues
  else if (
    lowerSummary.includes("hardware") ||
    lowerSummary.includes("printer") ||
    lowerSummary.includes("camera") ||
    lowerSummary.includes("cdu")
  ) {
    category = "Hardware"
    priority = "High"
    severity = "Major"
  }
  // UI/Display issues
  else if (
    lowerSummary.includes("display") ||
    lowerSummary.includes("screen") ||
    lowerSummary.includes("button") ||
    lowerSummary.includes("ui")
  ) {
    category = "UI"
    priority = "Medium"
    severity = "Major"
  }
  // Data/Report issues
  else if (lowerSummary.includes("data") || lowerSummary.includes("report") || lowerSummary.includes("calculation")) {
    category = "Data"
    priority = "High"
    severity = "Major"
  }
  // Settings/Configuration issues
  else if (
    lowerSummary.includes("settings") ||
    lowerSummary.includes("configuration") ||
    lowerSummary.includes("save")
  ) {
    category = "Configuration"
    priority = "Medium"
    severity = "Major"
  }

  // Generate detailed description and steps based on your kiosk system
  let description = ""
  let steps = ""
  let expected = ""
  let actual = ""

  if (category === "Cash Handling") {
    description = `Critical cash handling malfunction when ${summary}. This directly impacts the core kiosk functionality, potentially causing financial discrepancies, customer dissatisfaction, and operational disruption. The issue affects cash dispensing accuracy, cassette management, and system reliability.`
    steps = `1. Login to the kiosk admin system
2. Navigate to Cash Dispenser module
3. Verify cassette status and configuration
4. Attempt the cash operation: ${summary}
5. Monitor cassette behavior, bill counting, and limits
6. Check reject bin status and error logs
7. Verify deposit report accuracy and CDU communication
8. Test ADD BILLS functionality and total amount calculation`
    expected =
      "Cash dispensing should work accurately with proper bill counting, correct cassette management, reliable CDU communication, and accurate total amount calculations"
    actual =
      "Cash handling fails, causing incorrect bill counts, cassette errors, CDU communication failures, or complete dispensing system malfunction"
  } else if (category === "Authentication") {
    description = `Authentication system failure when ${summary}. This prevents authorized access to the admin system, blocking critical kiosk management operations and potentially causing security vulnerabilities or operational downtime.`
    steps = `1. Launch the kiosk admin application
2. Verify login page displays with all options (Password Login, Scan Login, Support)
3. Try the authentication scenario: ${summary}
4. Enter credentials as required
5. Click login and observe response
6. Check error messages and system behavior
7. Verify session management and user redirection
8. Test different authentication methods (password, QR scan, support login)`
    expected =
      "Authentication should work correctly with proper credential validation, secure session management, appropriate error handling, and successful redirection to Dashboard"
    actual =
      "Authentication fails, preventing access to admin system, showing incorrect error messages, or causing login system malfunction"
  } else if (category === "Hardware") {
    description = `Hardware communication failure when ${summary}. This affects kiosk operation reliability, potentially causing service interruptions, preventing proper device monitoring, and impacting cash dispensing operations.`
    steps = `1. Access kiosk admin system
2. Navigate to Dashboard and check hardware status section
3. Check device communication: ${summary}
4. Monitor status indicators for CDU, Camera, Printer, and Sentry (green/red lights)
5. Test device responses and diagnostic functions
6. Check hardware communication logs and error messages
7. Verify device reset functionality
8. Test integration with cash dispensing operations`
    expected =
      "Hardware should communicate properly with accurate status indicators (green for working, red for not working), reliable device responses, and proper integration with kiosk operations"
    actual =
      "Hardware communication fails, showing incorrect status indicators, unresponsive devices, missing diagnostic information, or preventing cash dispensing operations"
  } else if (category === "UI") {
    description = `User interface malfunction when ${summary}. This affects admin usability, potentially preventing efficient kiosk management, causing operator confusion, and impacting operational efficiency.`
    steps = `1. Login to kiosk admin system
2. Navigate to the affected screen/module
3. Perform the UI action: ${summary}
4. Observe visual elements, button responses, and navigation
5. Test dashboard components (denominations display, hardware status, batch info)
6. Check data display accuracy and real-time updates
7. Verify responsive behavior and visual consistency
8. Test navigation between modules (Dashboard, Tickets, Settings, etc.)`
    expected =
      "UI elements should display correctly, respond appropriately to user interactions, show accurate data, and provide clear visual feedback with proper navigation"
    actual =
      "UI elements are misaligned, unresponsive, displaying incorrect information, or preventing proper navigation and kiosk management"
  } else {
    // Default kiosk system bug
    description = `Functional issue occurs when ${summary}. This affects kiosk admin system operation, potentially disrupting management workflows, impacting service quality, and affecting overall kiosk performance.`
    steps = `1. Login to kiosk admin system
2. Navigate to the relevant module
3. Set up necessary preconditions
4. Attempt to perform: ${summary}
5. Observe system behavior and responses
6. Check for error messages or unexpected results
7. Test related functionality for side effects
8. Verify data integrity, hardware integration, and system state`
    expected =
      "System should function correctly according to kiosk admin specifications, operational requirements, and business processes"
    actual =
      "System does not work as expected, preventing proper kiosk management operations, causing data inconsistencies, or disrupting service delivery"
  }

  return {
    description,
    steps,
    expected,
    actual,
    priority,
    severity,
    category,
    environment,
  }
}
