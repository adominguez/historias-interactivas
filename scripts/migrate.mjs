import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el entorno (usa: node --env-file=.env scripts/migrate.mjs).");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrations() {
  const result = await client.execute("SELECT name FROM schema_migrations;");
  return new Set(result.rows.map((row) => row.name));
}

async function main() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const file of pending) {
    console.log(`Aplicando ${file}...`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    await client.executeMultiple(sql);
    await client.execute({
      sql: "INSERT INTO schema_migrations (name) VALUES (?);",
      args: [file],
    });
    console.log(`${file} aplicada.`);
  }

  console.log("Migraciones completadas.");
}

main()
  .catch((error) => {
    console.error("Error aplicando migraciones:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
