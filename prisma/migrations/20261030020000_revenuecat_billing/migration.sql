-- DropIndex
DROP INDEX "Workspace_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Workspace_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";
