import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let dbUrl: string | undefined = undefined;

// If running in Vercel Serverless environment, use writable /tmp for SQLite
if (process.env.VERCEL) {
  try {
    const srcDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const destDbPath = '/tmp/dev.db';

    // Force Next.js trace analyzer to bundle the SQLite seed database
    if (fs.existsSync(srcDbPath)) {
      const stats = fs.statSync(srcDbPath);
      console.log(`📦 Seed DB found at ${srcDbPath} (${stats.size} bytes)`);
      
      // Copy to writable /tmp if not already present
      if (!fs.existsSync(destDbPath)) {
        fs.copyFileSync(srcDbPath, destDbPath);
        console.log(`✅ Seed DB copied to ${destDbPath}`);
      }
    } else {
      console.warn(`⚠️ Source DB not found at ${srcDbPath}`);
    }

    dbUrl = 'file:/tmp/dev.db';
  } catch (err) {
    console.error('Failed to configure Vercel SQLite:', err);
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;
