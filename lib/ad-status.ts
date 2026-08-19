import type { Ad } from "@/lib/types";

/**
 * En qué punto de su vida está una campaña.
 *
 * Es una función del par (fechas, `active`) y no una columna: una columna
 * "estado" habría que mantenerla al día con un cron para que una campaña se
 * marcara vencida sola, y de todos modos la verdad seguirían siendo las fechas.
 *
 * El día de referencia se pasa desde afuera —lo calcula el servidor con
 * `todayInSiteZone()`— para que el panel no lo derive del reloj del navegador y
 * la fila diga lo mismo en el HTML del servidor que tras hidratar.
 */
export type AdStatus = "vigente" | "programada" | "vencida" | "pausada";

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  vigente: "Vigente",
  programada: "Programada",
  vencida: "Vencida",
  pausada: "Pausada",
};

export function adStatus(ad: Pick<Ad, "starts_on" | "ends_on" | "active">, today: string): AdStatus {
  // Vencida gana sobre pausada: una campaña que ya terminó no se "reanuda"
  // volviendo a marcarla activa, hay que renovarle las fechas.
  if (ad.ends_on < today) return "vencida";
  if (!ad.active) return "pausada";
  if (ad.starts_on > today) return "programada";
  return "vigente";
}

/** Lo que se está viendo primero, lo que ya no importa al final. */
const ORDER: Record<AdStatus, number> = {
  vigente: 0,
  programada: 1,
  pausada: 2,
  vencida: 3,
};

export function sortAdsForPanel<T extends Pick<Ad, "starts_on" | "ends_on" | "active">>(
  ads: T[],
  today: string,
): T[] {
  return [...ads].sort((a, b) => {
    const byStatus = ORDER[adStatus(a, today)] - ORDER[adStatus(b, today)];
    if (byStatus !== 0) return byStatus;
    // Dentro del mismo estado, la que termina antes primero: es la que corre
    // prisa renovar.
    return a.ends_on.localeCompare(b.ends_on);
  });
}
