-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('INPUT', 'RESOLVING', 'NEEDS_SELECTION', 'RESEARCHING_BRAND', 'NEEDS_CONFIRMATION', 'CONFIGURING', 'DISCOVERING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DataMode" AS ENUM ('LIVE', 'FIXTURE');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ThemeResolution" AS ENUM ('UNRESOLVED', 'RESOLVED', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('RESOLVE_ENTITY', 'BRAND_RESEARCH', 'DISCOVERY', 'DEEP_DIVE', 'REPORT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('WEB', 'USER', 'QLOO');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('VERIFIED', 'USER_PROVIDED', 'INFERRED', 'UNCERTAIN', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('PRODUCT_CATEGORY', 'PARTNERSHIP', 'COLLABORATION', 'LICENSING', 'AUDIENCE', 'GEOGRAPHIC', 'EXPERIENTIAL', 'ADJACENT_MARKET');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('CANDIDATE', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "EvidenceStrength" AS ENUM ('STRONG', 'MODERATE', 'LIMITED', 'INSUFFICIENT');

-- CreateEnum
CREATE TYPE "EvidenceRole" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'CONTEXT');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('PROJECT', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('ANTHROPIC', 'QLOO', 'WEB_SEARCH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL DEFAULT 'INPUT',
    "dataMode" "DataMode" NOT NULL DEFAULT 'LIVE',
    "isShowcase" BOOLEAN NOT NULL DEFAULT false,
    "userContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandCandidate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "parentName" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "entityKind" TEXT NOT NULL,
    "officialUrl" TEXT,
    "summary" TEXT NOT NULL,
    "industry" TEXT,
    "positioning" TEXT,
    "products" JSONB NOT NULL DEFAULT '[]',
    "audiences" JSONB NOT NULL DEFAULT '[]',
    "markets" JSONB NOT NULL DEFAULT '[]',
    "competitors" JSONB NOT NULL DEFAULT '[]',
    "collaborations" JSONB NOT NULL DEFAULT '[]',
    "culturalRefs" JSONB NOT NULL DEFAULT '[]',
    "qlooEntityId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandTheme" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "resolution" "ThemeResolution" NOT NULL DEFAULT 'UNRESOLVED',
    "tagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "constraintsId" TEXT,
    "opportunityId" TEXT,
    "inngestEventId" TEXT,
    "stage" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "cancelRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "level" "EventLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "excerpt" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "sourceId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QlooEntity" (
    "id" TEXT NOT NULL,
    "qlooId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT[],
    "subtype" TEXT,
    "popularity" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "properties" JSONB,
    "dataMode" "DataMode" NOT NULL DEFAULT 'LIVE',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QlooEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QlooTag" (
    "id" TEXT NOT NULL,
    "qlooId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagType" TEXT,
    "dataMode" "DataMode" NOT NULL DEFAULT 'LIVE',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QlooTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QlooQuery" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "status" INTEGER NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QlooQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CulturalRelationship" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "sourceTagId" TEXT,
    "targetEntityId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "affinity" DOUBLE PRECISION,
    "rank" INTEGER NOT NULL,
    "explainability" JSONB,
    "filters" JSONB,
    "queryId" TEXT NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CulturalRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CulturalInsight" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CulturalInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisConstraints" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "iteration" INTEGER NOT NULL,
    "focusCategories" TEXT[],
    "excludedCategories" TEXT[],
    "regions" TEXT[],
    "objectives" TEXT,
    "budgetRange" TEXT,
    "riskAppetite" TEXT,
    "notes" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisConstraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "constraintsId" TEXT,
    "title" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "nextAction" TEXT NOT NULL,
    "partners" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "unknowns" JSONB NOT NULL DEFAULT '[]',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'CANDIDATE',
    "evidenceStrength" "EvidenceStrength" NOT NULL DEFAULT 'LIMITED',
    "rank" INTEGER,
    "dedupeKey" TEXT NOT NULL,
    "deepDive" JSONB,
    "deepDiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityEvaluation" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "rankScore" DOUBLE PRECISION NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceReference" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "EvidenceRole" NOT NULL DEFAULT 'SUPPORTS',
    "note" TEXT,
    "opportunityId" TEXT,
    "insightId" TEXT,
    "relationshipId" TEXT,
    "sourceId" TEXT,
    "claimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shortlist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Shortlist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "shortlistId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("shortlistId","opportunityId")
);

-- CreateTable
CREATE TABLE "ComparisonSet" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparisonSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonItem" (
    "comparisonId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ComparisonItem_pkey" PRIMARY KEY ("comparisonId","opportunityId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kind" "ReportKind" NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "jobId" TEXT,
    "provider" "Provider" NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "webSearches" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION,
    "durationMs" INTEGER NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "BrandCandidate_projectId_idx" ON "BrandCandidate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_projectId_key" ON "BrandProfile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTheme_projectId_label_key" ON "BrandTheme"("projectId", "label");

-- CreateIndex
CREATE INDEX "ResearchJob_projectId_createdAt_idx" ON "ResearchJob"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchJob_status_idx" ON "ResearchJob"("status");

-- CreateIndex
CREATE INDEX "ResearchEvent_projectId_createdAt_idx" ON "ResearchEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchEvent_jobId_createdAt_idx" ON "ResearchEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchSource_projectId_idx" ON "ResearchSource"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSource_projectId_url_key" ON "ResearchSource"("projectId", "url");

-- CreateIndex
CREATE INDEX "Claim_projectId_topic_idx" ON "Claim"("projectId", "topic");

-- CreateIndex
CREATE INDEX "Claim_opportunityId_idx" ON "Claim"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "QlooEntity_qlooId_key" ON "QlooEntity"("qlooId");

-- CreateIndex
CREATE UNIQUE INDEX "QlooTag_qlooId_key" ON "QlooTag"("qlooId");

-- CreateIndex
CREATE UNIQUE INDEX "QlooQuery_cacheKey_key" ON "QlooQuery"("cacheKey");

-- CreateIndex
CREATE INDEX "CulturalRelationship_projectId_domain_idx" ON "CulturalRelationship"("projectId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "CulturalRelationship_projectId_queryId_targetEntityId_key" ON "CulturalRelationship"("projectId", "queryId", "targetEntityId");

-- CreateIndex
CREATE INDEX "CulturalInsight_projectId_idx" ON "CulturalInsight"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisConstraints_projectId_iteration_key" ON "AnalysisConstraints"("projectId", "iteration");

-- CreateIndex
CREATE INDEX "Opportunity_projectId_rank_idx" ON "Opportunity"("projectId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_projectId_dedupeKey_key" ON "Opportunity"("projectId", "dedupeKey");

-- CreateIndex
CREATE INDEX "OpportunityEvaluation_opportunityId_createdAt_idx" ON "OpportunityEvaluation"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceReference_opportunityId_idx" ON "EvidenceReference"("opportunityId");

-- CreateIndex
CREATE INDEX "EvidenceReference_insightId_idx" ON "EvidenceReference"("insightId");

-- CreateIndex
CREATE UNIQUE INDEX "Shortlist_projectId_name_key" ON "Shortlist"("projectId", "name");

-- CreateIndex
CREATE INDEX "Report_projectId_createdAt_idx" ON "Report"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_projectId_createdAt_idx" ON "UsageRecord"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_provider_createdAt_idx" ON "UsageRecord"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCandidate" ADD CONSTRAINT "BrandCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_qlooEntityId_fkey" FOREIGN KEY ("qlooEntityId") REFERENCES "QlooEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTheme" ADD CONSTRAINT "BrandTheme_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTheme" ADD CONSTRAINT "BrandTheme_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "QlooTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchJob" ADD CONSTRAINT "ResearchJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchJob" ADD CONSTRAINT "ResearchJob_constraintsId_fkey" FOREIGN KEY ("constraintsId") REFERENCES "AnalysisConstraints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchJob" ADD CONSTRAINT "ResearchJob_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvent" ADD CONSTRAINT "ResearchEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvent" ADD CONSTRAINT "ResearchEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalRelationship" ADD CONSTRAINT "CulturalRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalRelationship" ADD CONSTRAINT "CulturalRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "QlooEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalRelationship" ADD CONSTRAINT "CulturalRelationship_sourceTagId_fkey" FOREIGN KEY ("sourceTagId") REFERENCES "QlooTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalRelationship" ADD CONSTRAINT "CulturalRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "QlooEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalRelationship" ADD CONSTRAINT "CulturalRelationship_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "QlooQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CulturalInsight" ADD CONSTRAINT "CulturalInsight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisConstraints" ADD CONSTRAINT "AnalysisConstraints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_constraintsId_fkey" FOREIGN KEY ("constraintsId") REFERENCES "AnalysisConstraints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityEvaluation" ADD CONSTRAINT "OpportunityEvaluation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "CulturalInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "CulturalRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonSet" ADD CONSTRAINT "ComparisonSet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonItem" ADD CONSTRAINT "ComparisonItem_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "ComparisonSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonItem" ADD CONSTRAINT "ComparisonItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
