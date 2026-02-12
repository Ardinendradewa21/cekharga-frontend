// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // Biar kelihatan query SQL-nya di terminal (keren buat debug)
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
