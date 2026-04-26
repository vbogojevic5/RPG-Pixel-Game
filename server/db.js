/**
 * Shared Prisma client. Importing this module anywhere in the server
 * guarantees a single, reused connection pool.
 */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});

export default prisma;
