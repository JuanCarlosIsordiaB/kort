import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { getHomeSlots, getSiteSettings, type HomeSlot } from "@/lib/data/home";
import { MAX_RECOMMENDATIONS } from "@/lib/news-input";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SLOTS: HomeSlot[] = ["lead", "breaking", "featured", "opinion"];
const MAX_PER_SLOT: Record<HomeSlot, number> = {
  lead: 1,
  breaking: 3,
  featured: 3,
  opinion: 2,
};

/** 0, 1 o 2 tarjetas dentro del texto; cualquier otra cosa deja lo que había. */
function clampCount(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 0), MAX_RECOMMENDATIONS);
}

export async function GET() {
  const admin = await requirePermission("portada");
  if (admin instanceof Response) return admin;

  const [slots, settings] = await Promise.all([getHomeSlots(), getSiteSettings()]);
  return Response.json({ slots, settings });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("portada");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // --- huecos ---------------------------------------------------------------
  const incoming = (body as { slots?: Record<string, unknown> }).slots;
  if (incoming) {
    const rows: { slot: HomeSlot; position: number; news_id: string }[] = [];

    for (const slot of SLOTS) {
      const ids = incoming[slot];
      if (!Array.isArray(ids)) continue;

      const clean = ids
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        // Sin repetidos dentro del mismo hueco: la restricción única es
        // (slot, position), así que un duplicado pasaría y saldría dos veces.
        .filter((id, i, all) => all.indexOf(id) === i)
        .slice(0, MAX_PER_SLOT[slot]);

      clean.forEach((news_id, i) => rows.push({ slot, position: i + 1, news_id }));
    }

    // Reemplazo completo: es una tabla de a lo más 9 renglones, y así el orden
    // guardado es exactamente el que mandó el panel.
    const { error: deleteError } = await supabase
      .from("home_slots")
      .delete()
      .in("slot", SLOTS);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    if (rows.length) {
      const { error } = await supabase.from("home_slots").insert(rows);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // --- textos ---------------------------------------------------------------
  const s = (body as { settings?: Record<string, unknown> }).settings;
  if (s) {
    const text = (value: unknown, fallback: string) =>
      typeof value === "string" && value.trim() ? value.trim() : fallback;

    const current = await getSiteSettings();

    const { error } = await supabase
      .from("site_settings")
      .update({
        // Titular vacío = usar el título de la nota lead.
        hero_headline_html:
          typeof s.hero_headline_html === "string" && s.hero_headline_html.trim()
            ? s.hero_headline_html
            : null,
        hero_headline_json: s.hero_headline_json ?? null,
        newsletter_title: text(s.newsletter_title, current.newsletter_title),
        newsletter_label: text(s.newsletter_label, current.newsletter_label),
        footer_tagline: text(s.footer_tagline, current.footer_tagline),
        punctuation_accent:
          typeof s.punctuation_accent === "boolean"
            ? s.punctuation_accent
            : current.punctuation_accent,
        // Las columnas llevan CHECK, así que un valor fuera de rango sería un
        // 500 en vez de un guardado silenciosamente raro. Se recorta aquí.
        inline_recos_count: clampCount(s.inline_recos_count, current.inline_recos_count),
        inline_recos_source:
          s.inline_recos_source === "category" || s.inline_recos_source === "latest"
            ? s.inline_recos_source
            : current.inline_recos_source,
        inline_recos_label: text(s.inline_recos_label, current.inline_recos_label),
      })
      .eq("id", true);

    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // La portada es una ruta con ISR: sin esto el cambio no se vería hasta que
  // venciera la ventana de revalidación.
  //
  // Con `"layout"` en vez de la ruta sola porque el layout raíz también lee
  // `site_settings` (la puntuación en naranja), y esa bandera se ve en todo el
  // sitio: revalidar solo "/" dejaría las notas y el archivo con el ajuste
  // anterior hasta que a cada una le tocara regenerarse.
  revalidatePath("/", "layout");

  return Response.json({ ok: true });
}
