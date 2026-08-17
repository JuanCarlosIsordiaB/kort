import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  // No exige sesión válida a propósito: cerrar sesión con un token ya expirado
  // debe limpiar la cookie igual, no responder 401.
  await clearSessionCookie();
  return Response.json({ ok: true });
}
