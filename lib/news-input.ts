import type { NewsInput } from "@/lib/data/news";
import { clampFocus } from "@/lib/image-focus";
import type { NewsImageInput } from "@/lib/types";

/**
 * Valida el cuerpo que manda el formulario del panel. Compartido por POST y PUT
 * para que crear y editar apliquen exactamente las mismas reglas.
 */
export function parseNewsInput(body: unknown): NewsInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Cuerpo inválido" };
  }

  const b = body as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "El título es obligatorio" };
  if (title.length > 300) return { error: "El título es demasiado largo" };

  const status = b.status === "published" ? "published" : "draft";

  const categoryId =
    typeof b.category_id === "string" && b.category_id ? b.category_id : null;

  if (status === "published" && !b.content_html) {
    return { error: "No se puede publicar una noticia sin contenido" };
  }

  const images = parseImages(b.images);
  if ("error" in images) return images;

  return {
    title,
    status,
    excerpt: typeof b.excerpt === "string" && b.excerpt.trim() ? b.excerpt.trim() : null,
    content: b.content ?? null,
    content_html: typeof b.content_html === "string" ? b.content_html : null,
    category_id: categoryId,
    extra_category_ids: parseExtraCategories(b.extra_category_ids, categoryId),
    images: images.images,
    recommendations: parseRecommendations(b.recommendations),
  };
}

/**
 * Ids de las notas recomendadas dentro del texto.
 *
 * Solo se limpia la forma (cadenas, sin repetidos, a lo más dos): que el id
 * exista y esté publicado no se valida aquí a propósito. Una nota se puede
 * despublicar después de haberla elegido, así que el momento de comprobarlo es
 * al leer —`getInlineRecommendations` la salta y rellena el hueco— y no al
 * guardar, donde solo lograría bloquear un guardado por algo ajeno.
 */
function parseRecommendations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, MAX_RECOMMENDATIONS);
}

/**
 * Las secciones en las que se lista la nota además de la principal.
 *
 * Solo se limpia la forma —cadenas, sin repetidos, sin la principal—: que la
 * sección exista no se valida aquí porque la llave foránea de la tabla puente
 * ya lo hace, y un id inventado a mano merece el error crudo que da, no un
 * mensaje de formulario que nadie va a leer.
 */
function parseExtraCategories(value: unknown, primary: string | null): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .filter((id) => id !== primary)
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, MAX_EXTRA_CATEGORIES);
}

const MAX_IMAGES = 12;

/**
 * Cuántas notas puede recomendar una nota dentro de su propio texto.
 *
 * Vive aquí y no en `lib/data/news.ts` porque el formulario del panel también
 * la necesita, y ese módulo arrastra el cliente de service role marcado con
 * `server-only`: importarlo desde un Client Component revienta el build.
 */
export const MAX_RECOMMENDATIONS = 2;

/**
 * Cuántas secciones extra admite una nota. Vive aquí por lo mismo que
 * `MAX_RECOMMENDATIONS`: el formulario del panel también lo necesita.
 *
 * Hay tope porque el cuerpo lo manda el navegador y sin él un arreglo de mil
 * ids serían mil inserciones. Cuatro sobra para lo que significa la función —una
 * nota que es de dos o tres cosas a la vez—: una nota en todas las secciones no
 * estaría en ninguna.
 */
export const MAX_EXTRA_CATEGORIES = 4;

function parseImages(value: unknown): { images: NewsImageInput[] } | { error: string } {
  if (value === undefined || value === null) return { images: [] };
  if (!Array.isArray(value)) return { error: "La galería debe ser una lista" };
  if (value.length > MAX_IMAGES) {
    return { error: `Máximo ${MAX_IMAGES} imágenes por nota` };
  }

  const images: NewsImageInput[] = [];

  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const image = raw as Record<string, unknown>;

    const url = typeof image.url === "string" ? image.url.trim() : "";
    if (!url) continue;

    // Sin duplicados: la misma foto dos veces solo confunde el slider.
    if (images.some((existing) => existing.url === url)) continue;

    images.push({
      url,
      alt: typeof image.alt === "string" && image.alt.trim() ? image.alt.trim() : null,
      // `visible` por omisión es true: subir una foto y que no aparezca sería
      // lo contrario de lo que espera quien la acaba de subir.
      visible: image.visible !== false,
      // Un encuadre ausente o absurdo cae al centro, que es lo que hacía el
      // sitio antes de que existiera este campo.
      focus_x: clampFocus(image.focus_x),
      focus_y: clampFocus(image.focus_y),
    });
  }

  return { images };
}
