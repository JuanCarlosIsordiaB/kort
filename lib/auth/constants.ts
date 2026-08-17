/**
 * Constantes compartidas por el proxy, los route handlers y el layout de admin.
 * Deliberadamente sin dependencias: `proxy.ts` importa de aquí y no debe
 * arrastrar módulos marcados como `server-only`.
 */

export const SESSION_COOKIE = "kort_session";

/** 7 días. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const LOGIN_PATH = "/admin/login";
