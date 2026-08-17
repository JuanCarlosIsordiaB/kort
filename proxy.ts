import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

/**
 * En Next.js 16 el Middleware pasó a llamarse Proxy: el archivo va en la raíz
 * del proyecto y corre en el runtime de Node.js por defecto (por eso
 * `jsonwebtoken` funciona aquí). Poner `export const runtime` en este archivo
 * lanza un error.
 *
 * Esto es un chequeo *optimista*: solo evita que alguien sin sesión vea el
 * cascarón del panel antes de rebotar. La verificación real vive en
 * `requireAdmin()`, que cada route handler protegido llama por su cuenta —
 * nunca se asume que el proxy ya validó.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH) return NextResponse.next();

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  // Para volver a donde iba después de loguearse.
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
