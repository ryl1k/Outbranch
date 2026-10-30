/**
 * Deterministic, clearly simulated showcase project for local development and
 * end-to-end tests. Every external-looking value is synthetic and labelled:
 * data mode FIXTURE, "Simulated" names, fixture: Qloo ids and example.com URLs.
 *
 * Usage: npm run db:seed
 */
import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const SEED_PROJECT = "Simulated Harbor & Pine"

const level = (l: string, basis = "MODEL_ASSESSED") => ({ level: l, basis, rationale: "Simulated assessment for the fixture showcase." })

async function main() {
  const existing = await db.project.findFirst({ where: { name: SEED_PROJECT } })
  if (existing) await db.project.delete({ where: { id: existing.id } })

  const user = await db.user.upsert({
    where: { email: "seed@outbranch.local" },
    update: {},
    create: { email: "seed@outbranch.local", name: "Seed data" },
  })
  const membership = await db.workspaceMember.findFirst({ where: { userId: user.id } })
  const workspaceId =
    membership?.workspaceId ??
    (await db.workspace.create({ data: { name: "Seed workspace", members: { create: { userId: user.id } } } })).id

  const brand = await db.qlooEntity.upsert({
    where: { qlooId: "fixture:harbor-pine" },
    update: {},
    create: { qlooId: "fixture:harbor-pine", name: "Simulated Harbor & Pine", types: ["urn:entity:brand"], dataMode: "FIXTURE" },
  })

  const project = await db.project.create({
    data: {
      workspaceId,
      createdById: user.id,
      name: SEED_PROJECT,
      identifier: "Harbor & Pine (simulated)",
      stage: "READY",
      dataMode: "FIXTURE",
      isShowcase: true,
      profile: {
        create: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          name: SEED_PROJECT,
          entityKind: "brand",
          officialUrl: "https://example.com/harbor-pine",
          summary: "A fictional outdoor coffee roaster used to demonstrate Outbranch without live research. All data is simulated.",
          industry: "Specialty coffee (simulated)",
          positioning: "Coffee for long days outside.",
          products: [{ name: "Trail blend", description: "Simulated product" }],
          audiences: ["Trail runners", "Weekend campers"],
          markets: ["United States"],
          competitors: ["Simulated Competitor Co"],
          collaborations: [],
          culturalRefs: [{ name: "Simulated Folk Artist", type: "artist", why: "Simulated association", qlooId: "fixture:folk", resolvedName: "Simulated Folk Artist" }],
          qlooEntityId: brand.id,
        },
      },
    },
  })

  const constraints = await db.analysisConstraints.create({
    data: { projectId: project.id, iteration: 1, focusCategories: [], excludedCategories: [], regions: [] },
  })
  const source = await db.researchSource.create({
    data: { projectId: project.id, kind: "WEB", url: "https://example.com/simulated-source", title: "Simulated source", publisher: "example.com" },
  })
  await db.claim.create({
    data: { projectId: project.id, topic: "identity", statement: "Simulated: founded in 2015.", status: "VERIFIED", sourceId: source.id },
  })

  const folk = await db.qlooEntity.upsert({
    where: { qlooId: "fixture:folk" },
    update: {},
    create: { qlooId: "fixture:folk", name: "Simulated Folk Artist", types: ["urn:entity:artist"], dataMode: "FIXTURE" },
  })
  const query = await db.qlooQuery.upsert({
    where: { cacheKey: "seed:fixture-query" },
    update: {},
    create: { cacheKey: "seed:fixture-query", endpoint: "/v2/insights", params: { seed: true }, response: { simulated: true }, status: 200, dataMode: "FIXTURE", durationMs: 0 },
  })

  const targets = [
    ["fixture:trail-podcast", "Simulated Trail Podcast", "urn:entity:podcast"],
    ["fixture:camp-brand", "Simulated Camp Outfitter", "urn:entity:brand"],
    ["fixture:park", "Simulated National Park", "urn:entity:destination"],
    ["fixture:folk-2", "Simulated Banjo Duo", "urn:entity:artist"],
  ] as const
  const rels: string[] = []
  for (const [i, [qlooId, name, domain]] of targets.entries()) {
    const entity = await db.qlooEntity.upsert({
      where: { qlooId },
      update: {},
      create: { qlooId, name, types: [domain], dataMode: "FIXTURE" },
    })
    const rel = await db.culturalRelationship.create({
      data: {
        projectId: project.id,
        sourceEntityId: i % 2 ? folk.id : brand.id,
        targetEntityId: entity.id,
        domain,
        rank: i + 1,
        affinity: 0.9 - i * 0.05,
        explainability: { contributors: [{ signal: "signal.interests.entities", entityId: i % 2 ? "fixture:folk" : "fixture:harbor-pine", score: 0.8 }] },
        queryId: query.id,
        dataMode: "FIXTURE",
      },
    })
    rels.push(rel.id)
  }

  await db.culturalInsight.create({
    data: {
      projectId: project.id,
      title: "Simulated: outdoor endurance taste cluster",
      summary: "Simulated insight connecting trail podcasts and camp outfitters.",
      domain: "mixed",
      evidence: { create: rels.slice(0, 2).map((relationshipId) => ({ projectId: project.id, relationshipId })) },
    },
  })

  const opportunities = [
    { title: "Simulated race-day fuel kits with trail organisers", category: "PARTNERSHIP", rels: [0, 2], strength: "LIMITED" },
    { title: "Simulated tour-edition blends with folk artists", category: "COLLABORATION", rels: [3], strength: "LIMITED" },
    { title: "Simulated camp-kit licensing with outfitters", category: "LICENSING", rels: [1], strength: "INSUFFICIENT" },
  ] as const
  for (const [i, o] of opportunities.entries()) {
    const opp = await db.opportunity.create({
      data: {
        projectId: project.id,
        constraintsId: constraints.id,
        title: o.title,
        category: o.category,
        summary: "Simulated opportunity for the fixture showcase.",
        hypothesis: "Simulated hypothesis: the audience overlap supports this direction.",
        mechanism: "Simulated mechanism: partner pays wholesale; brand earns margin.",
        nextAction: "Simulated next action: interview three partners.",
        partners: [{ name: "Simulated Partner", role: "Distribution", qlooEntityId: null, status: "proposed" }],
        risks: ["Simulated risk"],
        unknowns: ["Simulated unknown"],
        evidenceStrength: o.strength,
        rank: i + 1,
        dedupeKey: `${o.category}:seed-${i}`,
        evidence: { create: o.rels.map((r) => ({ projectId: project.id, relationshipId: rels[r] })) },
        evaluations: {
          create: {
            model: "fixture",
            rankScore: 60 - i * 10,
            criteria: {
              culturalRelevance: level("high", "MEASURED"),
              strategicFit: level("high"),
              businessModelClarity: level("medium"),
              commercialPotential: level("medium"),
              differentiation: level("medium"),
              feasibility: level("high"),
              risk: level("low"),
              uncertainty: level("medium"),
            },
          },
        },
      },
    })
    if (i === 0) {
      await db.shortlist.create({ data: { projectId: project.id, items: { create: { opportunityId: opp.id } } } })
    }
  }

  console.log(`Seeded ${SEED_PROJECT} (${project.id})`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
