import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let hasConnected = false;

export async function connectPrisma() {
  if (hasConnected) return prisma;
  await prisma.$connect();
  hasConnected = true;
  console.log('Prisma connected');
  return prisma;
}

export default prisma;
