import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";
import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";

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

export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await supabaseAdmin()
    .from("categories")
    .insert({ name: name.trim(), slug: slugify(name) })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const { data, error } = await supabaseAdmin()
    .from("categories")
    .update({ name: name.trim(), slug: slugify(name) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
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
