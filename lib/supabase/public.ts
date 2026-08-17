import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la anon key. Solo puede leer lo que las policies de RLS permiten:
 * categorías y noticias con status = 'published'.
 *
 * Se crea perezosamente para que un `next build` no truene al importar este
 * módulo desde una ruta que ni siquiera consulta la base.
 */
let client: SupabaseClient | null = null;

export function supabasePublic(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.local.example a .env.local.",
    );
  }

  // No usamos Supabase Auth (la sesión de admin es nuestro propio JWT), así que
  // no hay nada que persistir ni que refrescar.
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
