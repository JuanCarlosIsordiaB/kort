import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Lo que Google enseña debajo del título cuando la página no trae una
 * descripción propia, y lo que WhatsApp pone en la vista previa del dominio.
 *
 * Vive aquí y no en `app/layout.tsx` porque el JSON-LD de la portada describe a
 * la misma organización y tiene que decir exactamente lo mismo: dos textos
 * distintos para la misma entidad es justo lo que confunde a los rastreadores.
 */
export const SITE_DESCRIPTION =
  "Noticias en corto: lo esencial del día en México, contado en el tiempo que tienes para leerlo.";

/** El logo que acompaña a la marca en los resultados enriquecidos. */
export const SITE_LOGO_URL = absoluteUrl("/kort-mark-navy.png");

/**
 * La redacción, como entidad de schema.org.
 *
 * Se repite dentro de cada nota (`publisher`) además de declararse suelta en la
 * portada: Google no cruza el `@id` entre páginas si la entidad nunca aparece
 * completa, y sin `publisher` la nota no califica para el carrusel de noticias.
 */
export const organizationJsonLd = {
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: {
    "@type": "ImageObject",
    url: SITE_LOGO_URL,
    // Las medidas reales de public/kort-mark-navy.png; declararlas mal es peor
    // que no declararlas.
    width: 405,
    height: 466,
  },
} as const;

/**
 * Miga de pan como la lee Google: la ruta desde la portada hasta esta página.
 *
 * Sirve para que el resultado de búsqueda muestre "Kort › Deportes › …" en vez
 * de la URL cruda, que es más difícil de leer y se lleva menos clics.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}
