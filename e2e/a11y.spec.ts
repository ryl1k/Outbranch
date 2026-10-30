import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const SEED = "Simulated Harbor & Pine"

async function audit(page: Page, label: string) {
  // Let entrance animations and late requests finish so contrast is measured on the final state.
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.html.slice(0, 160)}`)
  expect(summary, `${label} accessibility violations`).toEqual([])
}

test("public pages meet WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/")
  await page.waitForTimeout(2500) // let the hero draw-in finish
  await audit(page, "landing")
  await page.goto("/signin")
  await audit(page, "sign-in")
})

test("research workspace meets WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/projects")
  await page.getByRole("button", { name: /continue as guest/i }).click()
  await audit(page, "projects")
  await page.getByRole("link", { name: new RegExp(SEED) }).first().click()
  await audit(page, "overview")
  await page.getByRole("link", { name: "Opportunities", exact: true }).click()
  // The overview lists the same opportunity twice, so wait until the portfolio has replaced it.
  await expect(page).toHaveURL(/\/opportunities$/)
  await audit(page, "opportunities")
  await page.getByRole("link", { name: "Simulated race-day fuel kits with trail organisers" }).click()
  await audit(page, "deep dive")
  await page.goto(page.url().replace(/\/opportunities\/.*/, "/compare"))
  await audit(page, "compare")
  await page.goto("/projects/new")
  await audit(page, "new research")
})
