import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PublicAdmin } from "@/lib/types";

import { LOGIN_PATH, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";
import { signSession, verifySessionToken, type SessionPayload } from "./jwt";
import { can, normalizeRole, type Permission } from "./roles";

/**
 * Capa de acceso a la sesión.
 *
 * El proxy hace un chequeo optimista antes de renderizar, pero eso solo evita
 * el parpadeo de UI: no es la línea de defensa. Todo lo que lee o escribe datos
 * protegidos pasa por `requireAdmin()`, que además confirma contra la base que
 * el admin sigue existiendo — así un token de un admin borrado deja de servir.
 *
 * Lo mismo vale para el rol: el que cuenta es el de la fila, no el que viaja en
 * el token. `requirePermission()` es la puerta de todo lo que un reportero no
 * puede tocar.
 */

/** Lee y verifica el JWT de la cookie. No toca la base. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/**
 * Sesión válida + el admin correspondiente en la base.
 * Devuelve `null` si no hay sesión o si el admin ya no existe.
 */
export const getCurrentAdmin = cache(async (): Promise<PublicAdmin | null> => {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabaseAdmin()
    .from("admins")
    // Además de la cuenta, su perfil público: `/admin/perfil` lo necesita para
    // rellenar el formulario con lo que ya está guardado. En una sola cadena
    // literal porque supabase-js deduce el tipo de la fila leyendo este texto.
    // prettier-ignore
    .select("id, email, display_name, avatar_url, role, created_at, is_columnist, column_name, tagline, bio, x_url, facebook_url, instagram_url, tiktok_url, youtube_url, linkedin_url, website_url")
    .eq("id", session.adminId)
    .maybeSingle();

  if (error || !data) return null;
  // El rol pasa por `normalizeRole` y no se usa crudo: si la columna trajera
  // algo inesperado, la cuenta queda con los permisos mínimos, no con todos.
  return { ...data, role: normalizeRole(data.role) } as PublicAdmin;
});

/**
 * Para route handlers: devuelve el admin, o una `Response` 401 lista para
 * retornar. Usar como:
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof Response) return auth;
 */
export async function requireAdmin(): Promise<PublicAdmin | Response> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  return admin;
}

/**
 * Como `requireAdmin()`, pero además exige un permiso del rol. Devuelve 403
 * (no 401) cuando hay sesión válida y lo que falta son permisos: reintentar el
 * login no arreglaría nada.
 */
export async function requirePermission(
  permission: Permission,
): Promise<PublicAdmin | Response> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(admin.role, permission)) {
    return Response.json(
      { error: "Tu cuenta no tiene permiso para esta sección" },
      { status: 403 },
    );
  }
  return admin;
}

/**
 * La versión para páginas del panel: en vez de una `Response`, corta el render.
 *
 * Al panel y no a un 404 cuando falta el permiso: la ruta existe, simplemente
 * no es para esa cuenta, y dejar al reportero en su listado de noticias es más
 * útil que una pantalla de error.
 */
export async function requirePanelPermission(
  permission: Permission,
): Promise<PublicAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(LOGIN_PATH);
  if (!can(admin.role, permission)) redirect("/admin");
  return admin;
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
