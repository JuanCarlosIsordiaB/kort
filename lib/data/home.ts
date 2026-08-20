import { listCategories } from "@/lib/data/categories";
import { PUBLIC_COLUMNS } from "@/lib/data/news";
import { supabasePublic } from "@/lib/supabase/public";
import type { Category, NewsImage, NewsWithCategory } from "@/lib/types";

/**
 * Arma la portada.
 *
 * Cada hueco puede estar curado desde el panel o quedar vacío. Si está vacío se
 * llena solo con lo más reciente publicado: la portada nunca debe verse rota
 * porque nadie entró a curarla, y el sitio tiene que funcionar desde la primera
 * nota publicada sin configurar nada.
 */

export type HomeSlot = "lead" | "breaking" | "featured" | "opinion";

/** De dónde salen las recomendaciones cuando la nota no trae picks manuales. */
export type RecoSource = "latest" | "category";

export interface SiteSettings {
  hero_headline_html: string | null;
  hero_headline_json: unknown | null;
  newsletter_title: string;
  newsletter_label: string;
  footer_tagline: string;
  /**
   * Signos y acentos en naranja. Lo aplica `app/layout.tsx` como atributo del
   * <html>; ver `lib/punctuation.tsx`.
   */
  punctuation_accent: boolean;
  /**
   * Cuántas tarjetas de "te recomendamos" se intercalan en el cuerpo de una
   * nota: 0, 1 o 2. Es un máximo, no una cuota — un texto corto lleva menos.
   */
  inline_recos_count: number;
  inline_recos_source: RecoSource;
  inline_recos_label: string;
}

/**
 * Un renglón de la portada: la sección y sus últimas notas.
 *
 * Reemplaza a la fila de chips sueltos. La sección sigue siendo un enlace, pero
 * ahora arrastra su contenido en vez de obligar al lector a entrar para
 * descubrir qué hay dentro.
 */
export interface CategoryRow {
  category: Category;
  items: NewsWithCategory[];
}

export interface HomeData {
  settings: SiteSettings;
  lead: NewsWithCategory | null;
  /**
   * La galería visible del lead, en orden. Es lo único que la portada trae de
   * `news_images`: es la única foto grande de la página, y pedir la galería de
   * las cuarenta notas del pool para enseñar miniaturas de 56px no se paga.
   */
  leadImages: NewsImage[];
  breaking: NewsWithCategory[];
  featured: NewsWithCategory[];
  opinion: NewsWithCategory[];
  grid: NewsWithCategory[];
  categoryRows: CategoryRow[];
  /** Qué huecos vienen del panel; el resto es relleno automático. */
  curated: Record<HomeSlot, boolean>;
}

// Se reusa la lista de `lib/data/news.ts` en vez de repetirla: tenerla dos
// veces ya causó que la portada se quedara sin el avatar del autor al agregar
// esa columna en un solo lado.
const COLUMNS = PUBLIC_COLUMNS;

const SIDEBAR_SIZE = 3;
const OPINION_SIZE = 2;
const GRID_SIZE = 4;
/**
 * Cuántas notas cuelgan de cada sección en los renglones de abajo.
 *
 * Va de la mano con las columnas del renglón en `CategoryRows`: cambiar este
 * número sin cambiar la rejilla deja la fila coja o con un hueco al final.
 */
const CATEGORY_ROW_SIZE = 3;

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await supabasePublic()
    .from("site_settings")
    .select(
      "hero_headline_html, hero_headline_json, newsletter_title, newsletter_label, footer_tagline, punctuation_accent, inline_recos_count, inline_recos_source, inline_recos_label",
    )
    .maybeSingle();

  return (
    (data as SiteSettings) ?? {
      hero_headline_html: null,
      hero_headline_json: null,
      newsletter_title: "Lo esencial del día, en cinco minutos.",
      newsletter_label: "BOLETÍN DIARIO",
      footer_tagline: "NOTICIAS PARA GENTE QUE NO TIENE TODO EL DÍA",
      punctuation_accent: false,
      inline_recos_count: 2,
      inline_recos_source: "latest",
      inline_recos_label: "Te recomendamos",
    }
  );
}

export async function getHomeData(): Promise<HomeData> {
  const supabase = supabasePublic();

  const [settings, categories, slotsResult, poolResult] = await Promise.all([
    getSiteSettings(),
    listCategories(),
    supabase.from("home_slots").select("slot, position, news_id").order("position"),
    // Un solo tirón para todo lo que la portada puede necesitar: el lead, los
    // dos sidebars, la fila de opinión y la rejilla, con margen de sobra.
    supabase
      .from("news")
      .select(COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(40),
  ]);

  const pool = (poolResult.data ?? []) as unknown as NewsWithCategory[];
  const byId = new Map(pool.map((n) => [n.id, n]));
  const slots = slotsResult.data ?? [];

  /** Las notas curadas de un hueco, en orden y sin las que ya no existen. */
  function curatedFor(slot: HomeSlot): NewsWithCategory[] {
    return slots
      .filter((s) => s.slot === slot)
      .map((s) => byId.get(s.news_id))
      .filter((n): n is NewsWithCategory => Boolean(n));
  }

  // `used` evita que la misma nota salga en dos bloques cuando el relleno
  // automático entra en acción.
  const used = new Set<string>();
  const take = (n: number, from: NewsWithCategory[] = pool) => {
    const out: NewsWithCategory[] = [];
    for (const item of from) {
      if (out.length >= n) break;
      if (used.has(item.id)) continue;
      used.add(item.id);
      out.push(item);
    }
    return out;
  };

  /** Curado primero; lo que falte se completa con lo más reciente sin usar. */
  function fill(slot: HomeSlot, size: number): [NewsWithCategory[], boolean] {
    const picked = curatedFor(slot).filter((n) => !used.has(n.id)).slice(0, size);
    picked.forEach((n) => used.add(n.id));
    const isCurated = picked.length > 0;
    return [[...picked, ...take(size - picked.length)], isCurated];
  }

  const [leadList, leadCurated] = fill("lead", 1);
  const [breaking, breakingCurated] = fill("breaking", SIDEBAR_SIZE);
  const [featured, featuredCurated] = fill("featured", SIDEBAR_SIZE);
  const [opinion, opinionCurated] = fill("opinion", OPINION_SIZE);
  const grid = take(GRID_SIZE);

  // Va al final y no dentro del `Promise.all` de arriba porque necesita saber
  // qué se pintó arriba. Solo se descartan el lead y la rejilla: son los dos
  // bloques grandes, los que el lector no puede no haber visto. Las del sidebar
  // sí se repiten aquí a propósito — es una lista lateral y chica, y excluirla
  // vaciaba los renglones justo cuando el sitio tiene pocas notas, que es
  // cuando más falta hace llenar la portada.
  const aboveIds = new Set([...leadList, ...grid].map((news) => news.id));
  const lead = leadList[0] ?? null;

  const [categoryRows, leadImages] = await Promise.all([
    categoryRowsFor(supabase, categories, aboveIds),
    lead ? galleryFor(supabase, lead.id) : Promise.resolve([]),
  ]);

  return {
    settings,
    lead,
    leadImages,
    breaking,
    featured,
    opinion,
    grid,
    categoryRows,
    curated: {
      lead: leadCurated,
      breaking: breakingCurated,
      featured: featuredCurated,
      opinion: opinionCurated,
    },
  };
}

/**
 * Las fotos visibles de una nota, en el orden que fijó el panel.
 *
 * Se ordena y se filtra en la consulta, no en memoria: aquí solo se pide una
 * nota, así que el filtro puede vivir en la base en vez de traer las ocultas
 * para tirarlas después.
 */
async function galleryFor(
  supabase: ReturnType<typeof supabasePublic>,
  newsId: string,
): Promise<NewsImage[]> {
  const { data } = await supabase
    .from("news_images")
    .select("id, news_id, url, alt, position, visible, focus_x, focus_y")
    .eq("news_id", newsId)
    .eq("visible", true)
    .order("position");

  return (data ?? []) as NewsImage[];
}

/**
 * Las últimas notas de cada sección, saltándose las que ya salieron arriba.
 *
 * Una consulta por sección en vez de agrupar el pool: el pool son las 40 más
 * recientes del sitio y una sección que publica poco no aparecería ahí, así que
 * agrupar dejaría renglones vacíos justo en las secciones que más necesitan que
 * se les vea. Se piden `exclude.size` de más para que descartar las repetidas
 * no deje el renglón corto.
 */
async function categoryRowsFor(
  supabase: ReturnType<typeof supabasePublic>,
  categories: Category[],
  exclude: Set<string>,
): Promise<CategoryRow[]> {
  const rows = await Promise.all(
    categories.map(async (category) => {
      const { data } = await supabase
        .from("news")
        .select(COLUMNS)
        .eq("status", "published")
        .eq("category_id", category.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(CATEGORY_ROW_SIZE + exclude.size);

      const items = ((data ?? []) as unknown as NewsWithCategory[])
        .filter((news) => !exclude.has(news.id))
        .slice(0, CATEGORY_ROW_SIZE);

      return { category, items };
    }),
  );

  // Una sección recién creada, o cuya única nota ya salió arriba, no pinta un
  // renglón vacío: desaparece hasta que tenga algo que mostrar.
  return rows.filter((row) => row.items.length > 0);
}

/** Lo que ve el panel: los huecos tal cual están guardados. */
export async function getHomeSlots(): Promise<Record<HomeSlot, string[]>> {
  const { data } = await supabasePublic()
    .from("home_slots")
    .select("slot, position, news_id")
    .order("position");

  const out: Record<HomeSlot, string[]> = {
    lead: [],
    breaking: [],
    featured: [],
    opinion: [],
  };

  for (const row of data ?? []) {
    out[row.slot as HomeSlot].push(row.news_id);
  }

  return out;
}
