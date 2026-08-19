/**
 * El catálogo de huecos publicitarios del sitio.
 *
 * Las zonas las define el código, no el panel. Quien administra elige una de
 * esta lista en un desplegable y nada más: así el anunciante sabe qué medidas
 * entregar, cada hueco se puede vender por separado, y una imagen de tamaño
 * arbitrario no puede romper una maqueta que sí está diseñada.
 *
 * Este módulo lo importan las dos mitades —el render público en el servidor y
 * el formulario del panel en el cliente—, así que no puede tocar Supabase ni
 * `server-only`. Mismo caso que `lib/news-filters.ts`.
 *
 * IMPORTANTE: agregar o quitar una zona son dos archivos. Las claves de aquí y
 * el `check (zone in (...))` de supabase/migrations/0006_ads.sql tienen que
 * decir exactamente lo mismo.
 */

export interface AdZoneSpec {
  /** Cómo se lee en el desplegable del panel. */
  label: string;
  /** Dónde sale, en palabras del vendedor. */
  hint: string;
  /** Medidas del creativo. Reservan la caja para que no haya salto de maqueta. */
  width: number;
  height: number;
}

export const AD_ZONES = {
  "home-top": {
    label: "Portada — arriba de todo",
    hint: "Justo debajo del logo, lo primero que se ve al entrar.",
    width: 970,
    height: 250,
  },
  "home-sidebar": {
    label: "Portada — columna derecha",
    hint: "Bajo las pestañas de Último minuto / Destacadas.",
    width: 300,
    height: 600,
  },
  "home-mid": {
    label: "Portada — a media página",
    hint: "Entre la rejilla de noticias y la fila de Opinión.",
    width: 970,
    height: 250,
  },
  "article-top": {
    label: "Nota — antes del texto",
    hint: "Después de los botones de compartir, antes de las fotos.",
    width: 728,
    height: 90,
  },
  "article-bottom": {
    label: "Nota — al terminar de leer",
    hint: "Al final del cuerpo del artículo.",
    width: 728,
    height: 90,
  },
  "category-top": {
    label: "Secciones y archivo — arriba",
    hint: "Encima de la rejilla en /categoria/... y en /archivo.",
    width: 970,
    height: 250,
  },
  "footer-banner": {
    label: "Todo el sitio — sobre el pie",
    hint: "Aparece en todas las páginas públicas, encima del pie.",
    width: 970,
    height: 250,
  },
} as const satisfies Record<string, AdZoneSpec>;

export type AdZone = keyof typeof AD_ZONES;

export const AD_ZONE_KEYS = Object.keys(AD_ZONES) as AdZone[];

export function isAdZone(value: unknown): value is AdZone {
  return typeof value === "string" && value in AD_ZONES;
}

/** "Portada — arriba de todo · 970×250", para el desplegable. */
export function adZoneOptionLabel(zone: AdZone): string {
  const spec = AD_ZONES[zone];
  return `${spec.label} · ${spec.width}×${spec.height}`;
}
