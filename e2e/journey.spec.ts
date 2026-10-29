import { expect, test, type Page } from "@playwright/test"

const SEED = "Simulated Harbor & Pine"

async function signInAsGuest(page: Page, next = "/projects") {
  await page.goto(next)
  await expect(page).toHaveURL(/\/signin/)
  await page.getByRole("button", { name: /continue as guest/i }).click()
  await expect(page).toHaveURL(new RegExp(next.replace(/\//g, "\\/")))
}

async function openSeededStudy(page: Page) {
  await signInAsGuest(page)
  await page.getByRole("link", { name: new RegExp(SEED) }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: SEED })).toBeVisible()
}

test("landing page communicates the product and leads to research", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn cultural signals into what’s next.")
  // Below the hero, the demo starts once it scrolls into view: it types a company name, then lights up its growth paths.
  const demo = page.getByRole("group", { name: /Animated demo/ })
  await demo.scrollIntoViewIfNeeded()
  await expect(demo.getByText("4 growth paths found")).toBeVisible({ timeout: 20_000 })
  await expect(demo.getByRole("link", { name: /Strategic partners/ })).toBeVisible()
  await page.getByRole("link", { name: "Explore opportunities" }).first().click()
  await expect(page).toHaveURL(/\/signin\?next=%2Fprojects%2Fnew/)
})

test("a guest creates a project, cancels the running research and deletes the project", async ({ page }) => {
  await signInAsGuest(page, "/projects/new")
  await page.getByLabel("What should Outbranch research?").fill("Outbranch e2e test brand")
  await page.getByRole("button", { name: "Explore Opportunities" }).click()
  await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/)
  const cancel = page.getByRole("button", { name: "Cancel" })
  await expect(cancel.or(page.getByText(/not running|Research stopped/))).toBeVisible({ timeout: 20_000 })
  if (await cancel.isVisible()) {
    await cancel.click()
    await expect(page.getByText(/cancelled|not running|Research stopped/i).first()).toBeVisible({ timeout: 20_000 })
  }

  // The same project is removed from the list, so the suite starts one research run, not two.
  await page.goto("/projects")
  const remove = page.getByRole("button", { name: /^Delete Outbranch e2e test brand/ })
  await remove.click()
  await page.getByRole("button", { name: "Delete project" }).click()
  await expect(remove).toHaveCount(0)
})

test("someone signs up with email, signs out and signs back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  await page.goto("/signup?next=/projects")
  await page.getByLabel("Name").fill("E2E Tester")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill("a long test password")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/projects")

  await page.goto("/")
  await page.getByRole("button", { name: "Sign out" }).click()
  await page.goto("/signin?next=/projects")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill("wrong password!")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible()
  await page.getByLabel("Password").fill("a long test password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/projects")
})

test("explore a finished study: overview, opportunities, network, comparison, deep dive and report", async ({ page }) => {
  await openSeededStudy(page)

  // Overview + read-only banner + simulated-data labelling.
  await expect(page.getByText("Showcase project.")).toBeVisible()
  await expect(page.getByText("Simulated data").first()).toBeVisible()
  await expect(page.getByText("Top growth opportunities")).toBeVisible()

  // Opportunity portfolio.
  await page.getByRole("link", { name: "Opportunities", exact: true }).click()
  await expect(page.getByRole("heading", { name: /3 ranked opportunities/ })).toBeVisible()
  await expect(page.getByText("Simulated race-day fuel kits with trail organisers")).toBeVisible()

  // Cultural network: select an opportunity and inspect its evidence.
  await page.getByRole("link", { name: "Network", exact: true }).click()
  await expect(page.locator(".react-flow__node").first()).toBeVisible()
  await page.locator(".react-flow__node", { hasText: "Simulated tour-edition blends" }).click()
  await expect(page.getByRole("complementary").getByText("Opportunity (AI hypothesis)")).toBeVisible()
  await page.getByRole("radio", { name: "List" }).click()
  await expect(page.getByText("Qloo taste affinity").first()).toBeVisible()

  // Comparison with explicit gaps.
  await page.getByRole("link", { name: "Compare", exact: true }).click()
  await expect(page.getByText("Cultural intelligence").first()).toBeVisible()
  await expect(page.getByText("Not researched").first()).toBeVisible()

  // Deep dive.
  await page.getByRole("link", { name: "Opportunities", exact: true }).click()
  await page.getByRole("link", { name: "Simulated race-day fuel kits with trail organisers" }).click()
  for (const section of ["Executive summary", "Cultural evidence", "Potential partners", "Validation strategy", "Sources"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible()
  }

  // Showcases are read-only.
  await page.getByRole("button", { name: /Research deeper|Refresh deep research/ }).click()
  await expect(page.getByText("Showcase projects are read-only").first()).toBeVisible()
})

test("the opportunity network offers a list view on phones @mobile", async ({ page }) => {
  await openSeededStudy(page)
  await page.goto(page.url() + "/network")
  await expect(page.getByText("Qloo taste affinity").first()).toBeVisible()
  await expect(page.locator(".react-flow")).toHaveCount(0)
})
