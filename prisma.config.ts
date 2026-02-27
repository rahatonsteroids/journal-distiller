import "dotenv/config";
import { defineConfig } from "@prisma/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_DATABASE_URL,
  },
});