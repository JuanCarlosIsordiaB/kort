import type { RecoSource } from "@/lib/data/home";
// Constante compartida con el panel; ver el comentario en su definición.
import { MAX_RECOMMENDATIONS } from "@/lib/news-input";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";
import { dayBoundaryInstant, NO_CATEGORY, type DateField } from "@/lib/news-filters";
import { readMinutes, uniqueSlug } from "@/lib/slug";
import type {
  News,
  NewsImage,
  NewsImageInput,
  NewsStatus,
  NewsWithCategory,
  NewsWithImages,
  Paginated,
} from "@/lib/types";

/** Noticias por página en el listado público. */
export const PAGE_SIZE = 12;

/**
 * Columnas que se mandan al público. Nunca se hace `select("*")` aquí: el
 * listado público no tiene por qué cargar el JSON de Tiptap ni el `status`.
 */
export const PUBLIC_COLUMNS =
  "id, title, slug, excerpt, cover_image_url, cover_focus_x, cover_focus_y, author_name, author_avatar_url, read_minutes, view_count, published_at, category:categories(id, name, slug)";

// El detalle sí trae la galería completa; los listados no la necesitan y sería
// traer decenas de filas de más por página.
// `created_at` y `updated_at` solo aquí: el detalle los publica como
// `datePublished`/`dateModified` en los datos estructurados, y sin ellos Google
// no sabe que una nota se corrigió. Los listados no los necesitan.
const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_COLUMNS}, content_html, created_at, updated_at, images:news_images(id, news_id, url, alt, position, visible, focus_x, focus_y)`;

// ---------------------------------------------------------------------------
// Lecturas públicas (anon key: RLS solo deja pasar status = 'published')
// ---------------------------------------------------------------------------

/**
 * Se filtra por `categoryId` y no por slug a propósito: filtrar sobre una
 * columna de un recurso embebido en PostgREST solo vacía el embed, no descarta
 * la fila padre, salvo que el join sea `!inner`. Resolver el slug a id antes
 * (la página ya lo hace para pintar el banner) evita esa trampa por completo.
 */
export async function listPublished(options: {
  page?: number;
  categoryId?: string;
} = {}): Promise<Paginated<NewsWithCategory>> {
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabasePublic()
    .from("news")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`No se pudieron listar las noticias: ${error.message}`);

  const total = count ?? 0;
  return {
    items: (data ?? []) as unknown as NewsWithCategory[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPublishedBySlug(slug: string): Promise<NewsWithImages | null> {
  const { data, error } = await supabasePublic()
    .from("news")
    .select(PUBLIC_DETAIL_COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la noticia: ${error.message}`);
  if (!data) return null;

  const news = data as unknown as NewsWithImages;

  // PostgREST no garantiza el orden de un recurso embebido, y aquí el orden es
  // justo lo que el admin configuró. Se ordena y se filtra a lo visible.
  return {
    ...news,
    images: (news.images ?? [])
      .filter((image) => image.visible)
      .sort((a, b) => a.position - b.position),
  };
}

/** Lo mínimo que el sitemap necesita de cada nota. */
export interface SitemapEntry {
  slug: string;
  published_at: string | null;
  updated_at: string;
}

/**
 * Todas las notas publicadas, para `app/sitemap.ts`.
 *
 * No reusa `listPublished` porque el sitemap las quiere todas y esa está
 * paginada de 12 en 12; y trae tres columnas en vez de las quince de
 * `PUBLIC_COLUMNS` — el sitemap solo necesita la URL y su fecha.
 *
 * El tope de 5,000 es defensivo: el formato admite 50,000 URLs por archivo y
 * hoy el archivo entero no llega ni cerca, pero sin `range` PostgREST corta en
 * 1,000 en silencio y el sitemap se quedaría incompleto sin que nadie se entere.
 */
export async function listPublishedForSitemap(): Promise<SitemapEntry[]> {
  const { data, error } = await supabasePublic()
    .from("news")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(0, 4999);

  if (error) throw new Error(`No se pudo armar el sitemap: ${error.message}`);
  return (data ?? []) as SitemapEntry[];
}

/**
 * Las notas que se pintan intercaladas en el cuerpo de esta.
 *
 * Manda lo que el admin haya elegido a mano; lo que falte se completa solo con
 * lo más reciente publicado. Es el mismo trato que la portada: curar es
 * opcional y una nota sin curar nunca se ve rota.
 *
 * Se descarta la nota misma y no se repite ninguna, incluso si el pick manual
 * coincide con lo que habría salido por relleno.
 */
export async function getInlineRecommendations(
  article: { id: string; categoryId: string | null },
  options: { count: number; source: RecoSource },
): Promise<NewsWithCategory[]> {
  const count = Math.min(Math.max(options.count, 0), MAX_RECOMMENDATIONS);
  if (count === 0) return [];

  const supabase = supabasePublic();
  const picked: NewsWithCategory[] = [];
  // La nota entra ya "usada": nunca se recomienda a sí misma.
  const seen = new Set<string>([article.id]);

  const { data: manual } = await supabase
    .from("news_recommendations")
    .select("position, target_news_id")
    .eq("news_id", article.id)
    .order("position");

  const manualIds = (manual ?? []).map((row) => row.target_news_id as string);

  if (manualIds.length) {
    const { data } = await supabase
      .from("news")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .in("id", manualIds);

    // Se reordena contra `manualIds` porque `in()` no conserva el orden pedido,
    // y aquí el orden es justo lo que eligió el admin. Un pick que ya no exista
    // o que se haya despublicado simplemente no aparece: el hueco lo toma el
    // relleno de abajo.
    const byId = new Map(
      ((data ?? []) as unknown as NewsWithCategory[]).map((n) => [n.id, n]),
    );

    for (const id of manualIds) {
      if (picked.length >= count) break;
      const news = byId.get(id);
      if (!news || seen.has(id)) continue;
      seen.add(id);
      picked.push(news);
    }
  }

  if (picked.length >= count) return picked;

  /**
   * Con `source: "category"` se intenta primero la misma sección y luego el
   * resto del sitio. Dos consultas en el peor caso, y solo cuando de verdad
   * faltan tarjetas: una nota con sus dos picks a mano no lanza ninguna.
   */
  const attempts: (string | undefined)[] =
    options.source === "category" && article.categoryId
      ? [article.categoryId, undefined]
      : [undefined];

  for (const categoryId of attempts) {
    if (picked.length >= count) break;

    let query = supabase
      .from("news")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      // Margen para descartar la nota misma y lo que ya se eligió a mano.
      .limit(count + seen.size);

    if (categoryId) query = query.eq("category_id", categoryId);

    const { data } = await query;

    for (const news of (data ?? []) as unknown as NewsWithCategory[]) {
      if (picked.length >= count) break;
      if (seen.has(news.id)) continue;
      seen.add(news.id);
      picked.push(news);
    }
  }

  return picked;
}

// ---------------------------------------------------------------------------
// Lecturas del panel (service role: ve borradores)
// ---------------------------------------------------------------------------

export interface AdminNewsFilters {
  /** Texto libre; se busca en título y extracto. */
  q?: string;
  status?: NewsStatus;
  /** Id de categoría, o `NO_CATEGORY` para las notas sin sección. */
  categoryId?: string;
  /** Sobre qué columna aplican `from`/`to`. */
  dateField?: DateField;
  /** Días "YYYY-MM-DD" en la zona del sitio, ambos inclusive. */
  from?: string;
  to?: string;
}

/**
 * PostgREST separa los filtros de `or()` por comas y delimita los valores con
 * comillas dobles. Un término con una coma o un paréntesis rompería la
 * expresión — o peor, colaría otro filtro — así que se cita siempre y se
 * escapan las comillas y las barras.
 *
 * `%` y `_` se dejan pasar: en `ilike` son comodines, y en una caja de búsqueda
 * eso es una función, no un agujero.
 */
function likeValue(term: string): string {
  const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export async function listAllForAdmin(
  filters: AdminNewsFilters = {},
): Promise<NewsWithCategory[]> {
  let query = supabaseAdmin()
    .from("news")
    .select(`${PUBLIC_COLUMNS}, status, created_at, updated_at`)
    .order("updated_at", { ascending: false });

  const term = filters.q?.trim();
  if (term) {
    query = query.or(`title.ilike.${likeValue(term)},excerpt.ilike.${likeValue(term)}`);
  }

  if (filters.status) query = query.eq("status", filters.status);

  if (filters.categoryId === NO_CATEGORY) query = query.is("category_id", null);
  else if (filters.categoryId) query = query.eq("category_id", filters.categoryId);

  // Filtrar por `published_at` descarta solo los borradores, que es justo lo que
  // significa preguntar por lo publicado en unas fechas: un NULL nunca cae en un
  // rango.
  const column = filters.dateField ?? "updated_at";
  if (filters.from) query = query.gte(column, dayBoundaryInstant(filters.from, "start"));
  if (filters.to) query = query.lte(column, dayBoundaryInstant(filters.to, "end"));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as NewsWithCategory[];
}

/** Cuántas noticias hay en total, para poder decir "6 de 40" al filtrar. */
export async function countAllForAdmin(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("news")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getNewsById(id: string): Promise<News | null> {
  const { data, error } = await supabaseAdmin()
    .from("news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as News) ?? null;
}

async function newsSlugExists(slug: string, exceptId?: string): Promise<boolean> {
  let query = supabaseAdmin().from("news").select("id").eq("slug", slug);
  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Escrituras (service role)
// ---------------------------------------------------------------------------

export interface NewsInput {
  title: string;
  excerpt?: string | null;
  content?: unknown | null;
  content_html?: string | null;
  category_id?: string | null;
  status: NewsStatus;
  /** Galería completa. Reemplaza lo que hubiera; el orden del arreglo manda. */
  images?: NewsImageInput[];
  /**
   * Ids de las notas recomendadas dentro del texto, en orden. Vacío no es un
   * error: significa "elige tú", y el relleno automático hace el resto.
   */
  recommendations?: string[];
}

/**
 * La portada dejó de escribirse a mano: es la primera imagen visible. Se
 * resuelve una sola vez y de ella salen tanto la URL como el encuadre, para que
 * no puedan quedar apuntando a fotos distintas.
 */
function coverImage(images: NewsImageInput[] | undefined): NewsImageInput | null {
  return images?.find((image) => image.visible) ?? null;
}

/** Columnas de portada desnormalizadas en `news`. Ver 0007_encuadre.sql. */
function coverColumns(images: NewsImageInput[] | undefined) {
  const cover = coverImage(images);
  return {
    cover_image_url: cover?.url ?? null,
    cover_focus_x: cover?.focus_x ?? 50,
    cover_focus_y: cover?.focus_y ?? 50,
  };
}

/**
 * Reemplaza la galería completa. Borrar e insertar (en vez de reconciliar) es
 * lo correcto aquí: la tabla tiene un puñado de filas por nota y así el orden
 * guardado es exactamente el que mandó el panel, sin posiciones huérfanas.
 */
async function replaceImages(newsId: string, images: NewsImageInput[] = []): Promise<void> {
  const supabase = supabaseAdmin();

  const { error: deleteError } = await supabase
    .from("news_images")
    .delete()
    .eq("news_id", newsId);
  if (deleteError) throw new Error(deleteError.message);

  if (!images.length) return;

  const rows = images.map((image, i) => ({
    news_id: newsId,
    url: image.url,
    alt: image.alt?.trim() || null,
    position: i + 1,
    visible: image.visible,
    focus_x: image.focus_x,
    focus_y: image.focus_y,
  }));

  const { error } = await supabase.from("news_images").insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Reemplaza los picks manuales de una nota. Mismo criterio que la galería y que
 * la portada: borrar e insertar, porque son a lo más dos renglones y así el
 * orden guardado es exactamente el que mandó el panel.
 */
async function replaceRecommendations(
  newsId: string,
  ids: string[] = [],
): Promise<void> {
  const supabase = supabaseAdmin();

  const { error: deleteError } = await supabase
    .from("news_recommendations")
    .delete()
    .eq("news_id", newsId);
  if (deleteError) throw new Error(deleteError.message);

  const clean = ids
    .filter((id) => id && id !== newsId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, MAX_RECOMMENDATIONS);

  if (!clean.length) return;

  const { error } = await supabase.from("news_recommendations").insert(
    clean.map((target_news_id, i) => ({
      news_id: newsId,
      position: i + 1,
      target_news_id,
    })),
  );
  if (error) throw new Error(error.message);
}

/** Los picks manuales tal cual están guardados, para el formulario del panel. */
export async function getRecommendationIdsFor(newsId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("news_recommendations")
    .select("position, target_news_id")
    .eq("news_id", newsId)
    .order("position");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.target_news_id as string);
}

export async function getImagesFor(newsId: string): Promise<NewsImage[]> {
  const { data, error } = await supabaseAdmin()
    .from("news_images")
    .select("*")
    .eq("news_id", newsId)
    .order("position");

  if (error) throw new Error(error.message);
  return (data ?? []) as NewsImage[];
}

export async function createNews(
  input: NewsInput,
  author: { id: string; display_name: string; avatar_url: string | null },
): Promise<News> {
  const slug = await uniqueSlug(input.title, (s) => newsSlugExists(s));

  const { data, error } = await supabaseAdmin()
    .from("news")
    .insert({
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt ?? null,
      content: input.content ?? null,
      content_html: input.content_html ?? null,
      ...coverColumns(input.images),
      category_id: input.category_id ?? null,
      status: input.status,
      author_id: author.id,
      author_name: author.display_name,
      author_avatar_url: author.avatar_url,
      read_minutes: readMinutes(input.content_html),
      // Solo se sella la fecha si nace publicada.
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const news = data as News;
  await replaceImages(news.id, input.images);
  await replaceRecommendations(news.id, input.recommendations);
  return news;
}

export async function updateNews(id: string, input: NewsInput): Promise<News> {
  const current = await getNewsById(id);
  if (!current) throw new Error("La noticia no existe");

  // El slug solo se regenera si cambió el título: reescribirlo en cada guardado
  // rompería los enlaces que ya se compartieron.
  const slug =
    input.title.trim() === current.title
      ? current.slug
      : await uniqueSlug(input.title, (s) => newsSlugExists(s, id), current.slug);

  // `published_at` se sella una sola vez, en la primera publicación. Volver a
  // guardar una noticia ya publicada no debe cambiar su fecha.
  const publishedAt =
    input.status === "published"
      ? (current.published_at ?? new Date().toISOString())
      : null;

  const { data, error } = await supabaseAdmin()
    .from("news")
    .update({
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt ?? null,
      content: input.content ?? null,
      content_html: input.content_html ?? null,
      ...coverColumns(input.images),
      category_id: input.category_id ?? null,
      status: input.status,
      read_minutes: readMinutes(input.content_html),
      published_at: publishedAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await replaceImages(id, input.images);
  await replaceRecommendations(id, input.recommendations);
  return data as News;
}

export async function deleteNews(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("news").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
