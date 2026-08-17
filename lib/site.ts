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

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
