-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityType" "IdentityType" NOT NULL DEFAULT 'INDIVIDUAL',
    "handle" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailingAddress" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "verified" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationCode" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityEmail" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "verified" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationToken" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityPhone" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "verified" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationCode" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityDomain" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "verified" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationToken" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Identity_userId_key" ON "Identity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_handle_key" ON "Identity"("handle");

-- CreateIndex
CREATE INDEX "Identity_handle_idx" ON "Identity"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "MailingAddress_identityId_key" ON "MailingAddress"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityEmail_verificationToken_key" ON "IdentityEmail"("verificationToken");

-- CreateIndex
CREATE INDEX "IdentityEmail_verificationToken_idx" ON "IdentityEmail"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityEmail_identityId_email_key" ON "IdentityEmail"("identityId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityPhone_identityId_phone_key" ON "IdentityPhone"("identityId", "phone");

-- CreateIndex
CREATE INDEX "IdentityDomain_domain_idx" ON "IdentityDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityDomain_identityId_domain_key" ON "IdentityDomain"("identityId", "domain");

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailingAddress" ADD CONSTRAINT "MailingAddress_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityEmail" ADD CONSTRAINT "IdentityEmail_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityPhone" ADD CONSTRAINT "IdentityPhone_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityDomain" ADD CONSTRAINT "IdentityDomain_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
