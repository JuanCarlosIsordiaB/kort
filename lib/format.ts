/** Formateo compartido por la portada, las tarjetas y el detalle. */

const shortDate = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "27 JUL" — el formato de la byline del lead. */
export function shortDateUpper(value: string | null): string {
  if (!value) return "";
  return shortDate.format(new Date(value)).replace(".", "").toLocaleUpperCase("es-MX");
}

/** "27 de julio de 2026" — el detalle de la nota. */
export function longDateEs(value: string | null): string {
  return value ? longDate.format(new Date(value)) : "";
}

/**
 * "20 MIN", "4 H", "3 D" — el meta del sidebar y de las tarjetas.
 * Pasada cierta antigüedad la cuenta regresiva deja de decir algo útil, así que
 * a partir de una semana se muestra la fecha.
 */
export function timeAgoUpper(value: string | null, now: Date = new Date()): string {
  if (!value) return "";

  const diffMs = now.getTime() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "AHORA";
  if (minutes < 60) return `${minutes} MIN`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} H`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} D`;

  return shortDateUpper(value);
}

export function readUpper(minutes: number | null): string {
  return minutes ? `${minutes} MIN DE LECTURA` : "";
}

export function readShortUpper(minutes: number | null): string {
  return minutes ? `${minutes} MIN` : "";
}

export function upper(value: string | null | undefined): string {
  return (value ?? "").toLocaleUpperCase("es-MX");
}

/** "Carlos Rebolledo" -> "CR", para el avatar de la fila de Opinión. */
export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("es-MX");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("es-MX");
}
