import type { NewsInput } from "@/lib/data/news";
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
    category_id: typeof b.category_id === "string" && b.category_id ? b.category_id : null,
    images: images.images,
  };
}

const MAX_IMAGES = 12;

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
    });
  }

  return { images };
}
