// lib/prisma.ts
import { neon } from "@neondatabase/serverless";

export function getDb() {
  const connectionString = process.env.DATABASE_URL!;
  return neon(connectionString);
}