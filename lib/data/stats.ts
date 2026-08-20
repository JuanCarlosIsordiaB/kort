import { adStatus } from "@/lib/ad-status";
import { dayBoundaryInstant } from "@/lib/news-filters";
import { addDays, todayInSiteZone } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Ad, SiteViewDay } from "@/lib/types";

/**
 * Único lugar donde se leen y se escriben los números de audiencia.
 *
 * Todo va por service role: las tablas de 0009_estadisticas.sql no tienen
 * ninguna policy, así que la anon key no las ve ni para leer ni para escribir.
 * El conteo entra por POST /api/vistas —el servidor— y nunca desde el navegador
 * directo contra Supabase; si no fuera así, cualquiera con la anon key podría
 * inflar el contador de la nota que quisiera.
 */

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Suma una página vista. `newSession` marca la primera de un navegador en su
 * sesión, que es lo que se cuenta como "visita".
 *
 * La función de la base resuelve sola si la ruta es una nota y le suma también
 * a ella: un solo viaje por lector. Ver `track_view` en la migración.
 */
export async function trackView(path: string, newSession: boolean): Promise<void> {
  const { error } = await supabaseAdmin().rpc("track_view", {
    p_path: path,
    p_new_session: newSession,
  });

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Lectura del panel
// ---------------------------------------------------------------------------

/** Los rangos que ofrece la página, en días. El primero es el default. */
export const STATS_RANGES = [7, 30, 90] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export const RANGE_LABELS: Record<StatsRange, string> = {
  7: "7 días",
  30: "30 días",
  90: "90 días",
};

/** Cualquier cosa que no sea un rango conocido cae en 30 días. */
export function parseRange(value: string | string[] | undefined): StatsRange {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return (STATS_RANGES as readonly number[]).includes(raw) ? (raw as StatsRange) : 30;
}

export interface DayPoint {
  /** "YYYY-MM-DD" en la zona del sitio. */
  day: string;
  views: number;
  sessions: number;
}

export interface TopNewsRow {
  id: string;
  title: string;
  slug: string;
  categoryName: string | null;
  publishedAt: string | null;
  /** Lecturas dentro del rango elegido. */
  views: number;
  /** Lecturas desde que se publicó. */
  totalViews: number;
}

export interface CategoryStatsRow {
  name: string;
  notes: number;
  views: number;
}

export interface AudienceStats {
  range: StatsRange;
  /** Primer día del rango, "YYYY-MM-DD". */
  from: string;
  /** Un punto por día del rango, incluidos los días en cero. */
  series: DayPoint[];
  today: DayPoint;
  totals: { views: number; sessions: number };
  /** El rango inmediatamente anterior, del mismo largo, para poder comparar. */
  previous: { views: number; sessions: number };
  allTime: { views: number; sessions: number; days: number };
  /** El día más alto de toda la historia. `null` si todavía no hay ninguno. */
  best: DayPoint | null;
  topNews: TopNewsRow[];
  categories: CategoryStatsRow[];
}

/** Filas crudas de `stats_top_news`. */
interface TopNewsRpcRow {
  news_id: string;
  title: string;
  slug: string;
  category_name: string | null;
  published_at: string | null;
  views: number;
  total_views: number;
}

/** Filas crudas de `stats_by_category`. */
interface CategoryRpcRow {
  category_name: string;
  notes: number;
  views: number;
}

/** Cuántas notas más leídas se listan. */
const TOP_NEWS_LIMIT = 25;

/**
 * Todo lo que pinta la página de estadísticas, en tres consultas.
 *
 * `site_views` se trae completa a propósito: es una fila por día —un año son
 * 365— y tenerla entera es lo que permite calcular el histórico, el mejor día y
 * el rango anterior sin volver a preguntar. El día que eso deje de ser barato,
 * lo que toca es sumar por año en la base, no paginar aquí.
 */
export async function getAudienceStats(range: StatsRange): Promise<AudienceStats> {
  const today = todayInSiteZone();
  const from = addDays(today, -(range - 1));
  const previousFrom = addDays(from, -range);

  const supabase = supabaseAdmin();

  const [days, top, categories] = await Promise.all([
    supabase.from("site_views").select("day, views, sessions").order("day"),
    supabase.rpc("stats_top_news", { p_from: from, p_limit: TOP_NEWS_LIMIT }),
    supabase.rpc("stats_by_category", { p_from: from }),
  ]);

  if (days.error) throw new Error(days.error.message);
  if (top.error) throw new Error(top.error.message);
  if (categories.error) throw new Error(categories.error.message);

  const rows = (days.data ?? []) as SiteViewDay[];
  const byDay = new Map(rows.map((row) => [row.day, row]));

  // La serie se arma desde el calendario y no desde las filas: un día sin
  // visitas no tiene fila, y si se dibujara solo lo que existe el hueco
  // desaparecería y la gráfica mentiría — dos días flojos se verían pegados
  // como si fueran consecutivos.
  const series: DayPoint[] = Array.from({ length: range }, (_, index) => {
    const day = addDays(from, index);
    const row = byDay.get(day);
    return { day, views: row?.views ?? 0, sessions: row?.sessions ?? 0 };
  });

  const sum = (list: { views: number; sessions: number }[]) =>
    list.reduce(
      (acc, row) => ({ views: acc.views + row.views, sessions: acc.sessions + row.sessions }),
      { views: 0, sessions: 0 },
    );

  const best = rows.reduce<DayPoint | null>(
    (top, row) => (!top || row.views > top.views ? row : top),
    null,
  );

  return {
    range,
    from,
    series,
    today: byDay.get(today) ?? { day: today, views: 0, sessions: 0 },
    totals: sum(series),
    previous: sum(rows.filter((row) => row.day >= previousFrom && row.day < from)),
    allTime: { ...sum(rows), days: rows.length },
    best,
    topNews: ((top.data ?? []) as TopNewsRpcRow[]).map((row) => ({
      id: row.news_id,
      title: row.title,
      slug: row.slug,
      categoryName: row.category_name,
      publishedAt: row.published_at,
      views: Number(row.views),
      totalViews: Number(row.total_views),
    })),
    categories: ((categories.data ?? []) as CategoryRpcRow[]).map((row) => ({
      name: row.category_name,
      notes: Number(row.notes),
      views: Number(row.views),
    })),
  };
}

export interface NewsroomStats {
  published: number;
  drafts: number;
  /** Notas publicadas dentro del rango. */
  publishedInRange: number;
  categories: number;
  activeAds: number;
  /** Clics acumulados de toda la publicidad, vigente o no. */
  adClicks: number;
}

/**
 * Los números que no son de audiencia: cuánto hay publicado y cómo va la
 * publicidad. Salen aquí porque la página de estadísticas es donde alguien va a
 * buscarlos, no porque tengan que ver con las visitas.
 */
export async function getNewsroomStats(range: StatsRange): Promise<NewsroomStats> {
  const supabase = supabaseAdmin();
  const today = todayInSiteZone();
  const from = addDays(today, -(range - 1));

  const [published, drafts, inRange, categories, ads] = await Promise.all([
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      // `published_at` es un instante: hay que comparar contra el momento en
      // que ese día empezó en la zona de la redacción, no contra medianoche UTC
      // —que en México son las 18:00 del día anterior.
      .gte("published_at", dayBoundaryInstant(from, "start")),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("ads").select("starts_on, ends_on, active, click_count"),
  ]);

  const adRows = (ads.data ?? []) as Pick<
    Ad,
    "starts_on" | "ends_on" | "active" | "click_count"
  >[];

  return {
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    publishedInRange: inRange.count ?? 0,
    categories: categories.count ?? 0,
    activeAds: adRows.filter((ad) => adStatus(ad, today) === "vigente").length,
    adClicks: adRows.reduce((total, ad) => total + ad.click_count, 0),
  };
}
