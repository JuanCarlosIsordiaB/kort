import type { Category } from "@/lib/types";

/**
 * El enlace público de una sección. Opinión tiene página propia.
 *
 * Vive aquí y no en `lib/data/categories.ts` porque lo usa `MobileNav`, que es
 * un componente de cliente: ese módulo importa el cliente de Supabase con el
 * service role —marcado `server-only`— y arrastrarlo al navegador rompe el
 * build, además de ser exactamente lo que ese marcado existe para impedir.
 *
 * Es la única forma de armar el enlace de una sección: `/categoria/opinion`
 * existe pero solo redirige, y mandar al lector por un salto de más es peor
 * para él y para el rastreador.
 */
export function categoryPath(category: Pick<Category, "slug" | "kind">): string {
  return category.kind === "opinion" ? "/opinion" : `/categoria/${category.slug}`;
}
