import { addDays, SITE_TIME_ZONE, todayInSiteZone } from "@/lib/site";
import type { NewsStatus } from "@/lib/types";

/**
 * Los filtros del listado del panel, y su ida y vuelta con la query string.
 *
 * Viven en la URL y no en estado de React a propósito: así el filtro sobrevive
 * al `router.refresh()` que dispara borrar una nota, se puede compartir o
 * marcar, y el servidor puede resolverlo en la consulta en vez de traer la
 * tabla completa para descartarla en el cliente.
 *
 * Este módulo lo importan las dos mitades (la página en el servidor y los
 * controles en el cliente), así que no puede tocar Supabase ni `server-only`.
 */

/** El valor del select de sección para "las que no tienen ninguna". */
export const NO_CATEGORY = "sin-seccion";

/** Sobre qué columna de fecha aplica el rango. */
export type DateField = "updated_at" | "published_at";

export const DATE_FIELDS: { value: DateField; label: string }[] = [
  { value: "updated_at", label: "Actualizadas" },
  { value: "published_at", label: "Publicadas" },
];

/** `""` es "cualquier fecha"; `personalizado` usa `from`/`to` tal cual. */
export type RangePreset = "" | "hoy" | "ayer" | "7d" | "30d" | "personalizado";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "", label: "Cualquier fecha" },
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "personalizado", label: "Personalizado" },
];

export interface NewsFilters {
  /** Texto libre; busca en título y extracto. */
  q: string;
  /** `""` = cualquier estado. */
  status: NewsStatus | "";
  /** Id de categoría, `NO_CATEGORY`, o `""` para todas. */
  categoryId: string;
  dateField: DateField;
  preset: RangePreset;
  /** Días "YYYY-MM-DD" en la zona del sitio, ambos inclusive. */
  from: string;
  to: string;
}

export const EMPTY_FILTERS: NewsFilters = {
  q: "",
  status: "",
  categoryId: "",
  dateField: "updated_at",
  preset: "",
  from: "",
  to: "",
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Next entrega `string | string[]`; los repetidos no significan nada aquí. */
function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * La query string es entrada del usuario: cualquiera puede escribir
 * `?estado=loquesea`. Todo lo que no sea un valor conocido cae al default, así
 * que la consulta nunca se arma con basura.
 */
export function parseFilters(
  raw: Record<string, string | string[] | undefined>,
): NewsFilters {
  const status = one(raw.estado);
  const dateField = one(raw.fecha);
  const preset = one(raw.rango);
  const from = one(raw.desde);
  const to = one(raw.hasta);

  return {
    q: one(raw.q).slice(0, 120),
    status: status === "draft" || status === "published" ? status : "",
    categoryId: one(raw.seccion),
    dateField: dateField === "published_at" ? "published_at" : "updated_at",
    preset: RANGE_PRESETS.some((r) => r.value && r.value === preset)
      ? (preset as RangePreset)
      : "",
    from: DAY_PATTERN.test(from) ? from : "",
    to: DAY_PATTERN.test(to) ? to : "",
  };
}

/** Solo se serializa lo que se desvía del default: la URL queda limpia. */
export function filtersToQuery(filters: NewsFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("estado", filters.status);
  if (filters.categoryId) params.set("seccion", filters.categoryId);
  if (filters.preset) params.set("rango", filters.preset);

  // El campo de fecha solo importa si hay un rango que aplicar.
  if (filters.preset && filters.dateField !== "updated_at") {
    params.set("fecha", filters.dateField);
  }
  if (filters.preset === "personalizado") {
    if (filters.from) params.set("desde", filters.from);
    if (filters.to) params.set("hasta", filters.to);
  }

  return params.toString();
}

export function hasActiveFilters(filters: NewsFilters): boolean {
  return Boolean(filters.q || filters.status || filters.categoryId || filters.preset);
}

// ---------------------------------------------------------------------------
// Fechas
//
// Un día del filtro es un día del calendario de la redacción, no un intervalo
// de 24 h desde ahora. Todo se calcula sobre cadenas "YYYY-MM-DD" y solo al
// final se convierten a instantes UTC, que es lo que guarda Postgres.
// ---------------------------------------------------------------------------

/** Convierte el preset elegido en un par de días concretos. */
export function resolveRange(
  filters: NewsFilters,
  today = todayInSiteZone(),
): { from: string; to: string } {
  switch (filters.preset) {
    case "hoy":
      return { from: today, to: today };
    case "ayer":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "personalizado":
      return { from: filters.from, to: filters.to };
    default:
      return { from: "", to: "" };
  }
}

/**
 * Minutos que la zona del sitio va por delante de UTC en ese instante.
 * `longOffset` da "GMT-06:00"; para UTC da "GMT" pelón, de ahí el 0 por default.
 */
function siteOffsetMinutes(instant: Date): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? "");
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * El instante UTC en el que empieza (o termina) ese día en la zona del sitio,
 * listo para comparar contra un `timestamptz`.
 *
 * El offset se toma del propio instante, así que un cambio de horario de verano
 * solo podría desviar el corte en la hora exacta del cambio — y México ya no lo
 * aplica.
 */
export function dayBoundaryInstant(day: string, edge: "start" | "end"): string {
  const naive = new Date(`${day}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}Z`);
  return new Date(naive.getTime() - siteOffsetMinutes(naive) * 60_000).toISOString();
}
