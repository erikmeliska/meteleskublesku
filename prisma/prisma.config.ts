import path from "node:path";
import { defineConfig } from "prisma/config";

const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL || `file:${path.join(rootDir, "data", "meteleskublesku.db")}`,
  },
});
