import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { parseSocials, SITE_SOCIAL_IDS } from "@/lib/social";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Las cuentas del periódico.
 *
 * Endpoint propio y no una rama más de `/api/portada` porque aquel reescribe
 * la fila entera de `site_settings` en cada guardado: mandarle sólo las redes
 * dejaría el titular de portada en `null`. Aquí el `update` nombra únicamente
 * las seis columnas de 0013_redes_del_sitio.sql, así que guardar redes no puede
 * tocar nada más aunque el formulario mande de más.
 *
 * Sin GET: la página del panel ya llega con los valores renderizados en el
 * servidor y `router.refresh()` los vuelve a traer por la misma vía.
 */
export async function PUT(request: Request) {
  const admin = await requirePermission("redes");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  // El mismo validador que usan las redes de cada firma: acepta "@kortmx" o la
  // URL pegada, exige http/https y comprueba que el dominio sea el de esa red.
  // Acotado a `SITE_SOCIAL_IDS` porque `site_settings` no tiene `website_url`.
  //
  // Devuelve una entrada por cada red, con `null` en las vacías: una red que se
  // borró tiene que llegar como `null` a la base, y omitirla la dejaría con el
  // enlace viejo.
  const socials = parseSocials(body, SITE_SOCIAL_IDS);
  if ("error" in socials) {
    return Response.json({ error: socials.error }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("site_settings")
    .update(socials)
    .eq("id", true);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Las redes salen en el masthead y en el pie, o sea en el layout raíz y en
  // las siete páginas públicas, todas con ISR. Revalidar sólo "/" dejaría el
  // resto con la fila anterior hasta que a cada una le tocara regenerarse.
  revalidatePath("/", "layout");

  return Response.json({ ok: true });
}
