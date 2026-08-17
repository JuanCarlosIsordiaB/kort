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
  "id, title, slug, excerpt, cover_image_url, author_name, author_avatar_url, read_minutes, view_count, published_at, category:categories(id, name, slug)";

// El detalle sí trae la galería completa; los listados no la necesitan y sería
// traer decenas de filas de más por página.
const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_COLUMNS}, content_html, images:news_images(id, news_id, url, alt, position, visible)`;

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
}

/** La portada dejó de escribirse a mano: es la primera imagen visible. */
function coverFrom(images: NewsImageInput[] | undefined): string | null {
  return images?.find((image) => image.visible)?.url ?? null;
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
  }));

  const { error } = await supabase.from("news_images").insert(rows);
  if (error) throw new Error(error.message);
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
      cover_image_url: coverFrom(input.images),
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
      cover_image_url: coverFrom(input.images),
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
  return data as News;
}

export async function deleteNews(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("news").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
