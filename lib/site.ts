/**
 * Dominio público del sitio.
 *
 * Importa para dos cosas que se rompen calladas si está mal: las URLs absolutas
 * de Open Graph (WhatsApp y Facebook descartan las relativas) y el enlace que
 * copia el botón de compartir, que nunca debe salir con `localhost`.
 *
 * En desarrollo se puede apuntar a un túnel público con NEXT_PUBLIC_SITE_URL
 * para probar las vistas previas de verdad.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kort.com.mx"
).replace(/\/$/, "");

export const SITE_NAME = "Kort";

/**
 * La zona en la que el sitio piensa las fechas.
 *
 * Importa para los filtros por día del panel: el servidor corre en UTC, así que
 * sin esto "hoy" empezaría a las 18:00 del día anterior hora de México y el
 * filtro devolvería notas del día equivocado. Es fija a propósito — la redacción
 * es una sola y lo que se filtra es "el día" de la redacción, no el de quien
 * abre el panel desde otro huso.
 */
export const SITE_TIME_ZONE = "America/Mexico_City";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
