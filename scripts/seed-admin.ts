/**
 * Crea (o actualiza) un admin. No hay registro público: esta es la única forma
 * de dar de alta a alguien en el panel.
 *
 *   npm run seed:admin -- --email=juan@kort.mx --password=... --name="Juan Carlos"
 *
 * Si el email ya existe, actualiza la contraseña y el nombre — así también sirve
 * para resetear una contraseña olvidada.
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");
  const displayName = arg("name")?.trim();

  if (!email || !password || !displayName) {
    console.error(
      'Uso: npm run seed:admin -- --email=... --password=... --name="Nombre Apellido"',
    );
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
      { email, password_hash, display_name: displayName },
      { onConflict: "email" },
    )
    .select("id, email, display_name")
    .single();

  if (error) {
    console.error("No se pudo crear el admin:", error.message);
    process.exit(1);
  }

  console.log(`Admin listo: ${data.display_name} <${data.email}> (${data.id})`);
}

main();
