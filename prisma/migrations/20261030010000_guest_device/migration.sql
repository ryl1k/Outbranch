CREATE TABLE "GuestDevice" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestDevice_deviceHash_key" ON "GuestDevice"("deviceHash");

CREATE UNIQUE INDEX "GuestDevice_userId_key" ON "GuestDevice"("userId");

CREATE INDEX "GuestDevice_ipHash_createdAt_idx" ON "GuestDevice"("ipHash", "createdAt");

ALTER TABLE "GuestDevice" ADD CONSTRAINT "GuestDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
