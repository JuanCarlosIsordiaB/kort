import type { MetadataRoute } from "next";

import { getOpinionCategory, listCategories } from "@/lib/data/categories";
import { listPublishedForSitemap } from "@/lib/data/news";
import { listReportersWithNotes, profilePath } from "@/lib/data/reporters";
import { absoluteUrl } from "@/lib/site";

/**
 * El sitemap es una ruta cacheada como cualquier otra: sin esto se congelaría
 * en el build y las notas nuevas no aparecerían hasta el siguiente deploy, que
 * es exactamente el problema que un sitemap debe resolver. Cinco minutos, igual
 * que la portada.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, categories, reporters, opinion] = await Promise.all([
    listPublishedForSitemap(),
    listCategories(),
    listReportersWithNotes(),
    getOpinionCategory(),
  ]);

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
    // La sección de Opinión se queda fuera de `/categoria`: esa URL redirige a
    // `/opinion`, y ofrecerle a Google una redirección en el sitemap es gastar
    // presupuesto de rastreo en una página que no existe.
    ...categories
      .filter((category) => category.kind !== "opinion")
      .map((category) => ({
        url: absoluteUrl(`/categoria/${category.slug}`),
        lastModified: listingsModified,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ...(opinion
      ? [
          {
            url: absoluteUrl("/opinion"),
            lastModified: listingsModified,
            changeFrequency: "daily" as const,
            priority: 0.7,
          },
        ]
      : []),
    // La página de un autor cambia cuando publica, así que le sirve el mismo
    // `lastmod` que a los listados: la fecha de lo último que salió. Cada quien
    // aparece una sola vez, en la ruta a la que la otra redirige.
    ...reporters.map((reporter) => ({
      url: absoluteUrl(profilePath(reporter)),
      lastModified: listingsModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
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
