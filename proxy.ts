import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { can, permissionForPath } from "@/lib/auth/roles";

/**
 * En Next.js 16 el Middleware pasó a llamarse Proxy: el archivo va en la raíz
 * del proyecto y corre en el runtime de Node.js por defecto (por eso
 * `jsonwebtoken` funciona aquí). Poner `export const runtime` en este archivo
 * lanza un error.
 *
 * Esto es un chequeo *optimista*: solo evita que alguien sin sesión vea el
 * cascarón del panel antes de rebotar. La verificación real vive en
 * `requireAdmin()` y `requirePermission()`, que cada route handler y cada
 * página protegida llaman por su cuenta — nunca se asume que el proxy ya
 * validó.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH) return NextResponse.next();

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (session) {
    const permission = permissionForPath(pathname);

    // Solo se rebota cuando el token dice explícitamente que el rol no alcanza.
    // Un token viejo sin `role` pasa de largo y lo resuelve la página contra la
    // base: es preferible un rebote de más adentro que sacar del panel a un
    // admin legítimo que todavía no vuelve a entrar.
    if (permission && session.role && !can(session.role, permission)) {
      const home = request.nextUrl.clone();
      home.pathname = "/admin";
      home.search = "";
      return NextResponse.redirect(home);
    }

    return NextResponse.next();
  }

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
