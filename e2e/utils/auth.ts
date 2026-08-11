import { type Page, type BrowserContext, type Browser } from "@playwright/test"

// Test user credentials (for Clerk test mode)
export const TEST_USERS = {
  coach: {
    email: "coach@test.gympro.com",
    password: "TestPassword123!",
    name: "Test Coach",
  },
  client: {
    email: "client@test.gympro.com",
    password: "TestPassword123!",
    name: "Test Client",
  },
  admin: {
    email: "admin@test.gympro.com",
    password: "TestPassword123!",
    name: "Test Admin",
  },
}

/**
 * Sign in a user via Clerk's test UI
 */
export async function signInUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/sign-in")

  // Wait for Clerk's sign-in form to load
  await page.waitForSelector('[data-clerk-id="emailAddress"]', { timeout: 10000 })

  // Fill in email
  await page.fill('[data-clerk-id="emailAddress"]', email)

  // Click next/continue button
  await page.click('button[data-clerk-id="formButtonSubmit"]')

  // Wait for password field
  await page.waitForSelector('[data-clerk-id="password"]', { timeout: 5000 })

  // Fill in password
  await page.fill('[data-clerk-id="password"]', password)

  // Click sign in button
  await page.click('button[data-clerk-id="formButtonSubmit"]')

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 15000 })
}

/**
 * Sign out the current user
 */
export async function signOutUser(page: Page): Promise<void> {
  // Click user avatar/menu
  const userButton = page.locator('[data-clerk-id="userButton"]')
  if (await userButton.isVisible()) {
    await userButton.click()
    // Click sign out option
    await page.click('button[data-clerk-id="signOut"]')
    await page.waitForURL("/", { timeout: 10000 })
  }
}

/**
 * Create a new browser context with authenticated user
 */
export async function createAuthenticatedContext(
  browser: Browser,
  email: string,
  password: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signInUser(page, email, password)
  return { context, page }
}

/**
 * Wait for Convex real-time update
 */
export async function waitForConvexUpdate(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 10000
  await page.waitForSelector(selector, { state: "visible", timeout })
}

/**
 * Mock Clerk authentication for testing (bypasses real auth)
 */
export async function mockClerkAuth(
  context: BrowserContext,
  userId: string,
  role: string = "user"
): Promise<void> {
  // Set a mock session cookie
  await context.addCookies([
    {
      name: "__session",
      value: `mock_session_${userId}`,
      domain: "localhost",
      path: "/",
    },
    {
      name: "__client_uat",
      value: "1",
      domain: "localhost",
      path: "/",
    },
  ])

  // Intercept Clerk's auth check
  await context.route("**/api/auth/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId,
        sessionId: `session_${userId}`,
        session: {
          id: `session_${userId}`,
          userId,
          status: "active",
          role,
        },
      }),
    })
  })
}
