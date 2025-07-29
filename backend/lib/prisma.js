import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  location: true,
  color: true,
  destination: {
    select: {
      id: true,
      name: true,
      address: true,
      location: true,
    },
  },
  isReady: true,
  createdAt: true,
  updatedAt: true,
  groupId: true,
};
