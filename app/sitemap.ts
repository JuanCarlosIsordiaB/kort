import type { MetadataRoute } from "next";

import { listCategories } from "@/lib/data/categories";
import { listPublishedForSitemap } from "@/lib/data/news";
import { absoluteUrl } from "@/lib/site";

/**
 * El sitemap es una ruta cacheada como cualquier otra: sin esto se congelaría
 * en el build y las notas nuevas no aparecerían hasta el siguiente deploy, que
 * es exactamente el problema que un sitemap debe resolver. Cinco minutos, igual
 * que la portada.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, categories] = await Promise.all([listPublishedForSitemap(), listCategories()]);

  // La fecha de la nota más reciente sirve de `lastmod` para los listados: es
  // lo que de verdad cambia en ellos.
  const newest = news[0]?.published_at ?? news[0]?.updated_at;
  const listingsModified = newest ? new Date(newest) : new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: listingsModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/archivo"),
      lastModified: listingsModified,
      changeFrequency: "daily",
      priority: 0.6,
    },
    ...categories.map((category) => ({
      url: absoluteUrl(`/categoria/${category.slug}`),
      lastModified: listingsModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...news.map((item) => ({
      url: absoluteUrl(`/noticias/${item.slug}`),
      // `updated_at` y no `published_at`: si la redacción corrigió la nota, lo
      // que le interesa al rastreador es que hay algo nuevo que releer.
      lastModified: new Date(item.updated_at ?? item.published_at ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
