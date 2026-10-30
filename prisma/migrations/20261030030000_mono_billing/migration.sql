-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "monoCardToken" TEXT;

-- CreateTable
CREATE TABLE "MonoInvoice" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "periodKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "modifiedDate" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonoInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonoInvoice_invoiceId_key" ON "MonoInvoice"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "MonoInvoice_periodKey_key" ON "MonoInvoice"("periodKey");

-- CreateIndex
CREATE INDEX "MonoInvoice_workspaceId_createdAt_idx" ON "MonoInvoice"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "MonoInvoice" ADD CONSTRAINT "MonoInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
