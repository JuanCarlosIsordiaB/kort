import { supabasePublic } from "@/lib/supabase/public";

/**
 * Chequeo de salud que **toca la base a propósito**.
 *
 * El plan free de Supabase pausa el proyecto tras 7 días sin actividad, y
 * despausarlo es manual desde el dashboard. El cron de
 * `.github/workflows/keep-alive.yml` llama aquí cada dos días para que ese
 * contador nunca llegue.
 *
 * Va con la anon key y contra `categories` porque RLS ya la deja leer a
 * cualquiera: el endpoint es público y no expone nada que la portada no
 * muestre. Un `head: true` no baja filas, solo el conteo.
 */
export async function GET() {
  const startedAt = Date.now();

  const { error, count } = await supabasePublic()
    .from("categories")
    .select("id", { head: true, count: "exact" });

  const body = {
    ok: !error,
    db: error ? error.message : "ok",
    categories: count ?? 0,
    ms: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };

  // `no-store` en la respuesta: si un CDN la cacheara, el cron dejaría de
  // llegar a Postgres y el keep-alive sería un placebo.
  return Response.json(body, {
    status: error ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
