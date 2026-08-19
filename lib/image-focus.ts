import type { CSSProperties } from "react";

/**
 * Encuadre de una foto: el punto que tiene que sobrevivir al recorte.
 *
 * Todas las fotos del sitio se muestran con `object-cover` dentro de marcos de
 * proporciones distintas, y `object-cover` recorta al centro. Cuando lo
 * importante de la foto no está al centro —una cara arriba, alguien a la
 * orilla— el centro es justo lo que sobra. `object-position` mueve ese recorte
 * al punto que eligió el admin.
 */

/** El centro: lo que hace `object-cover` por su cuenta. */
export const DEFAULT_FOCUS = { x: 50, y: 50 } as const;

export function clampFocus(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Estilo para el <img>/<Image> recortado.
 *
 * Devuelve `undefined` cuando el encuadre es el centro, para no ensuciar el
 * HTML de todas las tarjetas con un `style` que no cambia nada.
 */
export function focusStyle(
  x: number | null | undefined,
  y: number | null | undefined,
): CSSProperties | undefined {
  const fx = clampFocus(x ?? 50);
  const fy = clampFocus(y ?? 50);
  if (fx === 50 && fy === 50) return undefined;
  return { objectPosition: `${fx}% ${fy}%` };
}

/** Atajo para la portada desnormalizada en `news`. */
export function coverFocusStyle(news: {
  cover_focus_x?: number | null;
  cover_focus_y?: number | null;
}): CSSProperties | undefined {
  return focusStyle(news.cover_focus_x, news.cover_focus_y);
}
