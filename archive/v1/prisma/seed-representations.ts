import "dotenv/config";
import { PrismaClient, AssertionLevel } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STANDARD_ASSERTION_TEXT = `I have applied the correct badge to the content to the best of my knowledge.`;

const PERJURY_ASSERTION_TEXT = `I have applied the correct badge to the content to the best of my knowledge.

I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct.`;

const STANDARD_FULL_LEGAL_TEXT = `LEGAL REPRESENTATION - STANDARD ASSERTION

By selecting this representation and submitting this declaration, you ("Declarant") agree to the following terms:

1. ASSERTION
You assert that you have applied the correct content origin badge to the content identified in this declaration to the best of your knowledge at the time of declaration.

2. NATURE OF ASSERTION
This is a good-faith assertion based on your current knowledge and understanding. It does not constitute a legal guarantee or warranty of accuracy.

3. NO WARRANTIES
MadeBy.fyi makes no representations about the accuracy or truthfulness of any declarations. MadeBy.fyi only records that you created this badge and associated it with this legal representation.

4. MODIFICATION
You may update your declaration at any time if you discover that the original assertion was incorrect.

Assertion Text:
"${STANDARD_ASSERTION_TEXT}"`;

const PERJURY_FULL_LEGAL_TEXT = `LEGAL REPRESENTATION - PERJURY DECLARATION

By selecting this representation, typing your full legal name as a digital signature, and submitting this declaration, you ("Declarant") agree to the following terms:

1. DECLARATION UNDER PENALTY OF PERJURY
You declare under penalty of perjury under the laws of the United States of America that:
- You have applied the correct content origin badge to the content identified in this declaration
- The information provided in this declaration is true and correct to the best of your knowledge

2. LEGAL SIGNIFICANCE
A declaration under penalty of perjury has the same legal effect as a statement made under oath. Making a false declaration under penalty of perjury is a federal crime under 18 U.S.C. § 1621 and may be punishable by fines and/or imprisonment.

3. DIGITAL SIGNATURE
By typing your full legal name in the signature field, you acknowledge that:
- Your typed name constitutes your legally binding electronic signature
- You are the person whose name you have typed
- You have read and understand the legal implications of this declaration

4. NO WARRANTIES BY MADEBY.FYI
MadeBy.fyi makes no representations about the accuracy or truthfulness of any declarations. MadeBy.fyi only records that you created this badge and associated it with this legal representation.

5. RECORD RETENTION
MadeBy.fyi will retain a record of your declaration, including your digital signature and the date/time of signing, for legal and verification purposes.

Assertion Text:
"${PERJURY_ASSERTION_TEXT}"

+ Digital signature (typed full legal name)
+ Date signed`;

async function seedRepresentations() {
  console.log("Seeding legal representations...");

  // Upsert STANDARD representation
  const standardRep = await prisma.legalRepresentation.upsert({
    where: { code: "STANDARD" },
    update: {
      name: "Standard Assertion",
      shortDescription: "Best knowledge assertion",
      assertionText: STANDARD_ASSERTION_TEXT,
      fullLegalText: STANDARD_FULL_LEGAL_TEXT,
      assertionLevel: AssertionLevel.STANDARD,
      isActive: true,
    },
    create: {
      code: "STANDARD",
      name: "Standard Assertion",
      shortDescription: "Best knowledge assertion",
      assertionText: STANDARD_ASSERTION_TEXT,
      fullLegalText: STANDARD_FULL_LEGAL_TEXT,
      assertionLevel: AssertionLevel.STANDARD,
      isActive: true,
    },
  });
  console.log(`  Created/updated STANDARD representation: ${standardRep.id}`);

  // Upsert PERJURY representation (Gold Standard)
  const perjuryRep = await prisma.legalRepresentation.upsert({
    where: { code: "PERJURY" },
    update: {
      name: "Gold Standard Assertion",
      shortDescription: "Under penalty of perjury + signature",
      assertionText: PERJURY_ASSERTION_TEXT,
      fullLegalText: PERJURY_FULL_LEGAL_TEXT,
      assertionLevel: AssertionLevel.PERJURY,
      isActive: true,
    },
    create: {
      code: "PERJURY",
      name: "Gold Standard Assertion",
      shortDescription: "Under penalty of perjury + signature",
      assertionText: PERJURY_ASSERTION_TEXT,
      fullLegalText: PERJURY_FULL_LEGAL_TEXT,
      assertionLevel: AssertionLevel.PERJURY,
      isActive: true,
    },
  });
  console.log(`  Created/updated PERJURY representation: ${perjuryRep.id}`);

  console.log("Done seeding representations!");
}

seedRepresentations()
  .catch((e) => {
    console.error("Error seeding representations:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
