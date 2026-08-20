import { trackView } from "@/lib/data/stats";

/**
 * Donde se cuentan las visitas.
 *
 * La cuenta la dispara el navegador (components/site/ViewTracker.tsx) y no el
 * render de la página porque el sitio es estático: la portada y las notas se
 * cachean cinco minutos, así que mil lectores en esa ventana producen un solo
 * render — contar ahí daría uno de cada mil. Un aviso desde el cliente sí ocurre
 * una vez por lector.
 *
 * Es la segunda ruta pública que escribe (la otra es el clic de un anuncio), así
 * que se trata como entrada hostil: la ruta se valida contra un patrón, el
 * cuerpo nunca decide a qué nota se le suma —eso lo resuelve la base a partir
 * del slug— y hay un tope por IP para que nadie infle el contador a fuerza de
 * peticiones.
 */

/** Nunca se cachea: cada llamada tiene que llegar a la base. */
export const dynamic = "force-dynamic";

/**
 * Rutas que no son audiencia: el panel es trabajo interno y `/api` no es una
 * página. El cliente ya no las manda; esto es el cinturón.
 */
const IGNORED = ["/admin", "/api"];

/** Una ruta del sitio y nada más: sin protocolo, sin `//`, sin `..`. */
const PATH_PATTERN = /^\/[\w\-/%.]*$/;

/**
 * Tope por IP: 60 vistas por minuto.
 *
 * Es best-effort a propósito. Vive en memoria del proceso, así que con varias
 * instancias cada una lleva su propia cuenta y un reinicio la borra. Para lo que
 * sirve —que un script casero no multiplique por mil las lecturas de una nota—
 * alcanza, y no cuesta ni una tabla ni un Redis. Si algún día hace falta de
 * verdad, el lugar correcto es el borde (Vercel/Cloudflare), no aquí.
 */
const LIMIT = 60;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, now: number): boolean {
  // El Map crece con cada IP distinta. Vaciarlo entero al pasarse de tamaño es
  // burdo pero correcto: lo peor que pasa es que a unos cuantos se les perdone
  // su cuenta, y nunca se queda ocupando memoria sin techo.
  if (hits.size > 10_000) hits.clear();

  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > LIMIT;
}

/**
 * Los rastreadores que sí ejecutan JavaScript. La mayoría no lo hace y nunca
 * llega hasta aquí, así que esto solo recorta el sobrante — no pretende ser una
 * detección de bots completa.
 */
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|preview|monitor|lighthouse/i;

export async function POST(request: Request) {
  // 204 pase lo que pase: al visitante no le sirve de nada enterarse de que su
  // visita no se contó, y un error visible solo le diría a quien esté probando
  // el endpoint qué defensa acaba de topar.
  const done = new Response(null, { status: 204 });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT_PATTERN.test(userAgent)) return done;

  // El primero de la lista es el cliente; el resto son los proxys por los que
  // pasó. Sin cabecera (desarrollo local) todos caen en el mismo cubo.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip, Date.now())) return done;

  const body = (await request.json().catch(() => null)) as {
    path?: unknown;
    session?: unknown;
  } | null;

  const path = typeof body?.path === "string" ? body.path : "";
  if (!path || path.length > 200 || !PATH_PATTERN.test(path)) return done;
  if (IGNORED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return done;

  try {
    await trackView(path, body?.session === true);
  } catch (error) {
    // Perder una visita no es motivo para devolver un error a una página que ya
    // se está leyendo bien.
    console.error("No se pudo contar la visita:", (error as Error).message);
  }

  return done;
}
