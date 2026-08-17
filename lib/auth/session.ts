import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PublicAdmin } from "@/lib/types";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";
import { signSession, verifySessionToken, type SessionPayload } from "./jwt";

/**
 * Capa de acceso a la sesión.
 *
 * El proxy hace un chequeo optimista antes de renderizar, pero eso solo evita
 * el parpadeo de UI: no es la línea de defensa. Todo lo que lee o escribe datos
 * protegidos pasa por `requireAdmin()`, que además confirma contra la base que
 * el admin sigue existiendo — así un token de un admin borrado deja de servir.
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
    .select("id, email, display_name, avatar_url, created_at")
    .eq("id", session.adminId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicAdmin;
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
