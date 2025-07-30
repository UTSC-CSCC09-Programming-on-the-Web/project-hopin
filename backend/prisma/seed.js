import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { prisma } from "../lib/prisma.js";

async function seedPlan() {
  if (!process.env.STRIPE_PRICE_STANDARD) {
    throw new Error("Missing STRIPE_PRICE_STANDARD");
  }

  await prisma.plan.createMany({
    data: [
      {
        name: "standard",
        planId: process.env.STRIPE_PRICE_STANDARD,
      },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  await seedPlan();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
