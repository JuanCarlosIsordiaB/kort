/**
 * Aplica los archivos .sql de supabase/migrations/ en orden alfabético contra
 * DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * Cada migración corre dentro de una transacción: si una falla a la mitad, no
 * deja la base con la mitad de los cambios aplicados.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main() {
  // DIRECT_URL primero: DATABASE_URL suele apuntar al pooler en modo
  // transacción, que no lleva bien el DDL de varias sentencias.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DIRECT_URL (o DATABASE_URL) en .env");
    process.exit(1);
  }

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  if (files.length === 0) {
    console.log("No hay migraciones que aplicar.");
    return;
  }

  const client = new Client({
    connectionString,
    // El pooler de Supabase exige TLS pero presenta un certificado que Node no
    // encadena a una CA raíz conocida.
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`→ ${file} … `);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
        console.log("ok");
      } catch (error) {
        await client.query("rollback");
        console.log("FALLÓ");
        throw error;
      }
    }
    console.log("\nMigraciones aplicadas.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\n${(error as Error).message}`);
  process.exit(1);
});
