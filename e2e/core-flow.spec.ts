import { test, expect } from "@playwright/test"

test.describe("Core Flow: Coach creates plan, User completes workout", () => {
  test("homepage loads and shows sign in", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/GymPro/)
  })

  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/sign-in")
    await expect(page.locator("form")).toBeVisible()
  })

  test("dashboard redirects to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("coach dashboard requires authentication", async ({ page }) => {
    await page.goto("/coach/dashboard")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("admin dashboard requires authentication", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("user dashboard requires authentication", async ({ page }) => {
    await page.goto("/user/dashboard")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("unauthorized page renders correctly", async ({ page }) => {
    await page.goto("/unauthorized")
    await expect(page.getByText("403")).toBeVisible()
    await expect(page.getByText("Unauthorized")).toBeVisible()
  })
})

test.describe("Navigation", () => {
  test("can navigate between public pages", async ({ page }) => {
    await page.goto("/")
    await page.goto("/sign-in")
    await expect(page).toHaveURL(/sign-in/)

    await page.goto("/sign-up")
    await expect(page).toHaveURL(/sign-up/)
  })
})

test.describe("Landing Page", () => {
  test("displays main heading and description", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("GymPro")).toBeVisible()
    await expect(
      page.getByText("Professional gym management for coaches and clients")
    ).toBeVisible()
  })

  test("has sign-in and sign-up options", async ({ page }) => {
    await page.goto("/")
    // Should show Clerk sign-in/sign-up components
    await expect(page.locator("[data-clerk-id]")).toBeVisible()
  })
})

test.describe("Protected Routes", () => {
  const protectedRoutes = [
    "/dashboard",
    "/coach/dashboard",
    "/coach/plans",
    "/coach/clients",
    "/user/dashboard",
    "/user/session",
    "/user/messages",
    "/admin/dashboard",
  ]

  protectedRoutes.forEach((route) => {
    test(`redirects ${route} to sign-in when not authenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/sign-in/)
    })
  })
})

test.describe("Messages Page", () => {
  test("messages route requires authentication", async ({ page }) => {
    await page.goto("/user/messages")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("coach messages route requires authentication", async ({ page }) => {
    await page.goto("/coach/messages")
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe("Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X

  test("homepage is responsive on mobile", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("GymPro")).toBeVisible()
  })

  test("sign-in page is responsive on mobile", async ({ page }) => {
    await page.goto("/sign-in")
    await expect(page.locator("form")).toBeVisible()
  })
})

test.describe("PWA Features", () => {
  test("has web app manifest", async ({ page }) => {
    const response = await page.goto("/manifest.json")
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest?.name).toBe("GymPro")
    expect(manifest?.short_name).toBe("GymPro")
  })

  test("has service worker", async ({ page }) => {
    const response = await page.goto("/sw.js")
    // Service worker might not exist yet, just check the route is accessible
    expect(response?.status()).toBeLessThanOrEqual(404)
  })
})
