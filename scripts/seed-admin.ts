/**
 * Crea (o actualiza) una cuenta del panel. No hay registro público: esta es la
 * única forma de dar de alta a alguien.
 *
 *   npm run seed:admin -- --email=juan@kort.mx --password=... --name="Juan Carlos"
 *   npm run seed:admin -- --email=pepe@kort.mx --password=... --name="Pepe" --role=reportero
 *
 * `--role` acepta `admin` (todo el panel) o `reportero` (solo sus noticias).
 * Sin `--role` la cuenta queda como `admin`, que es como se comportaba este
 * script antes de que existieran los roles.
 *
 * Si el email ya existe, actualiza la contraseña, el nombre y el rol — así
 * también sirve para resetear una contraseña olvidada o para cambiarle el rol
 * a alguien.
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

import { ADMIN_ROLES, isAdminRole } from "../lib/auth/roles";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");
  const displayName = arg("name")?.trim();
  const role = arg("role")?.trim().toLowerCase() ?? "admin";

  if (!email || !password || !displayName) {
    console.error(
      'Uso: npm run seed:admin -- --email=... --password=... --name="Nombre Apellido" [--role=admin|reportero]',
    );
    process.exit(1);
  }

  if (!isAdminRole(role)) {
    console.error(`Rol inválido: "${role}". Usa uno de: ${ADMIN_ROLES.join(", ")}.`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("admins")
    .upsert(
      { email, password_hash, display_name: displayName, role },
      { onConflict: "email" },
    )
    .select("id, email, display_name, role")
    .single();

  if (error) {
    console.error("No se pudo crear la cuenta:", error.message);
    process.exit(1);
  }

  console.log(
    `Cuenta lista: ${data.display_name} <${data.email}> — ${data.role} (${data.id})`,
  );
}

main();
