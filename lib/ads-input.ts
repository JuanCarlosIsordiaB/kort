import { isAdZone } from "@/lib/ad-zones";
import type { AdInput } from "@/lib/data/ads";

/**
 * Valida el cuerpo que manda el formulario de publicidad. Compartido por POST y
 * PUT para que dar de alta y editar apliquen exactamente las mismas reglas.
 *
 * Los mensajes salen tal cual en la pantalla del panel, así que van en español
 * y dicen qué corregir.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Un día real: descarta 2026-02-31, que pasa el regex pero no existe. */
function isRealDay(day: string): boolean {
  if (!DAY_PATTERN.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
  );
}

/**
 * Solo http y https.
 *
 * Esto es lo único que impide guardar un `javascript:...` que después
 * renderizaríamos como `href` en una página pública. La validación del
 * navegador no cuenta: cualquiera puede llamar a la API directo.
 */
function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseAdInput(body: unknown): AdInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Cuerpo inválido" };
  }

  const b = body as Record<string, unknown>;

  const advertiser = typeof b.advertiser === "string" ? b.advertiser.trim() : "";
  if (!advertiser) return { error: "Falta el nombre de la empresa" };
  if (advertiser.length > 200) return { error: "El nombre de la empresa es demasiado largo" };

  if (!isAdZone(b.zone)) return { error: "Elige una sección donde mostrar el anuncio" };

  const imageUrl = typeof b.image_url === "string" ? b.image_url.trim() : "";
  if (!imageUrl) return { error: "Falta la imagen del anuncio" };
  if (!isWebUrl(imageUrl)) return { error: "La imagen no tiene una dirección válida" };

  const targetUrl = typeof b.target_url === "string" ? b.target_url.trim() : "";
  if (!targetUrl) return { error: "Falta el enlace al que lleva el anuncio" };
  if (!isWebUrl(targetUrl)) {
    return { error: "El enlace debe empezar con http:// o https://" };
  }

  const startsOn = typeof b.starts_on === "string" ? b.starts_on.trim() : "";
  const endsOn = typeof b.ends_on === "string" ? b.ends_on.trim() : "";

  if (!isRealDay(startsOn)) return { error: "La fecha de inicio no es válida" };
  if (!isRealDay(endsOn)) return { error: "La fecha de fin no es válida" };
  // Comparación de cadenas: "YYYY-MM-DD" ordena igual alfabética que cronológicamente.
  if (endsOn < startsOn) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio" };
  }

  return {
    advertiser,
    zone: b.zone,
    image_url: imageUrl,
    target_url: targetUrl,
    alt: typeof b.alt === "string" && b.alt.trim() ? b.alt.trim().slice(0, 300) : null,
    starts_on: startsOn,
    ends_on: endsOn,
    // Por omisión activa: dar de alta una campaña y que no corra sería lo
    // contrario de lo que espera quien la acaba de capturar.
    active: b.active !== false,
    notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null,
  };
}
