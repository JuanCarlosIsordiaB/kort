"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Avisa al servidor que alguien está viendo esta página.
 *
 * Va montado en el layout raíz, así que cubre el sitio completo: portada,
 * secciones, archivo y notas. Cuál nota es lo resuelve la base a partir de la
 * ruta (ver `track_view` en 0009_estadisticas.sql); aquí no se manda ningún id,
 * de modo que el navegador no puede elegir a qué nota sumarle.
 *
 * Por qué desde el cliente y no al renderizar: las páginas se cachean cinco
 * minutos, así que mil lectores dentro de esa ventana producen un solo render
 * en el servidor. Contar ahí sería contar regeneraciones de caché, no gente.
 */

/** El panel es trabajo interno, no audiencia. */
const IGNORED_PREFIX = "/admin";

/** Marca en la pestaña: existe mientras el navegador no la cierre. */
const SESSION_KEY = "kort:sesion";

export function ViewTracker() {
  const pathname = usePathname();
  // La ruta que ya se avisó. React puede volver a correr un efecto sin que la
  // página haya cambiado (un remontaje, el doble montaje de Strict Mode), y sin
  // esta marca cada uno de esos casos contaría una visita de más.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    // En desarrollo no se cuenta nada. No es una precaución: `next dev` apunta
    // a la misma base de Supabase que el sitio publicado, así que sin esto cada
    // recarga mientras se programa acabaría sumada a los números que lee la
    // redacción. Para probar el conteo a mano: POST a /api/vistas con
    // `{ "path": "/" }`.
    if (process.env.NODE_ENV !== "production") return;

    if (!pathname || pathname.startsWith(IGNORED_PREFIX)) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    // La primera página de la pestaña es una "visita"; las siguientes son
    // páginas vistas de esa misma visita. `sessionStorage` muere al cerrar la
    // pestaña, que es exactamente la duración que se quiere medir. En modo
    // privado o con el almacenamiento bloqueado lanza: entonces se cuenta la
    // página vista y no la visita, que es la degradación correcta.
    let session = false;
    try {
      session = sessionStorage.getItem(SESSION_KEY) === null;
      if (session) sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      session = false;
    }

    const body = JSON.stringify({ path: pathname, session });

    // `sendBeacon` es la vía correcta para esto: el navegador la manda en
    // segundo plano, sin competir con las imágenes de la nota y sin quedarse a
    // medias si el lector se va a otra página enseguida. `keepalive` en el
    // fetch de respaldo busca lo mismo.
    try {
      const sent = navigator.sendBeacon?.(
        "/api/vistas",
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    } catch {
      // Cae al fetch de abajo.
    }

    // Una visita perdida no es nada que reportar: el `catch` vacío es
    // deliberado para no ensuciar la consola del lector.
    fetch("/api/vistas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
