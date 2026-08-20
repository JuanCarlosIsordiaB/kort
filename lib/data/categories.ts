import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";
import { slugify } from "@/lib/slug";
import type { Category, CategoryKind } from "@/lib/types";

/**
 * Único lugar donde se consultan las categorías. Las páginas públicas y los
 * route handlers llaman a estas funciones — nadie más arma queries por su lado.
 *
 * Las lecturas públicas usan la anon key: si alguna query se equivoca de filtro,
 * RLS la detiene. Las escrituras usan el service role.
 */

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabasePublic()
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw new Error(`No se pudieron listar las categorías: ${error.message}`);
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabasePublic()
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la categoría: ${error.message}`);
  return (data as Category) ?? null;
}

/**
 * La sección de Opinión, o `null` si todavía no se ha marcado ninguna.
 *
 * `maybeSingle` y no `single` porque no tenerla es un estado válido: el sitio
 * arranca sin ella y `/opinion` responde 404 hasta que alguien la marque.
 * El índice parcial de 0010_opinion.sql impide que haya dos.
 */
export async function getOpinionCategory(): Promise<Category | null> {
  const { data, error } = await supabasePublic()
    .from("categories")
    .select("*")
    .eq("kind", "opinion")
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la sección de Opinión: ${error.message}`);
  return (data as Category) ?? null;
}

export async function createCategory(
  name: string,
  kind: CategoryKind = "noticia",
): Promise<Category> {
  const { data, error } = await supabaseAdmin()
    .from("categories")
    .insert({ name: name.trim(), slug: slugify(name), kind })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(
  id: string,
  name: string,
  kind: CategoryKind = "noticia",
): Promise<Category> {
  const { data, error } = await supabaseAdmin()
    .from("categories")
    .update({ name: name.trim(), slug: slugify(name), kind })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

/**
 * Postgres avisa con 23505 cuando ya hay otra sección marcada como Opinión: el
 * índice `categories_single_opinion_idx` es único. Se traduce arriba, en el
 * route handler, a un 409 con un mensaje que el editor entienda.
 */
export function isDuplicateOpinionError(message: string): boolean {
  return message.includes("categories_single_opinion_idx");
}

/** Cuántas noticias apuntan a esta categoría. Decide si se puede borrar. */
export async function countNewsInCategory(categoryId: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("news")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function categorySlugExists(slug: string, exceptId?: string): Promise<boolean> {
  let query = supabaseAdmin().from("categories").select("id").eq("slug", slug);
  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
