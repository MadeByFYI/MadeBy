import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addDefaultEmails() {
  console.log("Finding identities without their user's login email...\n");

  // Get all identities with their users and emails
  const identities = await prisma.identity.findMany({
    include: {
      user: true,
      emails: true,
    },
  });

  let added = 0;
  let skipped = 0;

  for (const identity of identities) {
    const userEmail = identity.user.email?.toLowerCase();

    if (!userEmail) {
      console.log(`Skipping identity ${identity.id} - user has no email`);
      skipped++;
      continue;
    }

    // Check if this email already exists for this identity
    const existingEmail = identity.emails.find(
      (e) => e.email.toLowerCase() === userEmail
    );

    if (existingEmail) {
      console.log(`Skipping ${userEmail} - already exists for identity ${identity.id}`);
      skipped++;
      continue;
    }

    // Check if any email is currently primary
    const hasPrimary = identity.emails.some((e) => e.isPrimary);

    // Add the login email
    await prisma.identityEmail.create({
      data: {
        identityId: identity.id,
        email: userEmail,
        isPrimary: !hasPrimary, // Only set as primary if no other primary exists
        visibility: "PRIVATE",
        verified: "VERIFIED", // Trust the login email as verified
      },
    });

    console.log(`Added ${userEmail} for identity ${identity.id}${!hasPrimary ? " (set as primary)" : ""}`);
    added++;
  }

  console.log(`\nDone! Added ${added} emails, skipped ${skipped}`);
}

addDefaultEmails()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
