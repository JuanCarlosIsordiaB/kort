import { slugify } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";

/**
 * Quién firma, visto desde el sitio público.
 *
 * Vive aparte de `lib/data/admins.ts` a propósito, y esa separación es lo que
 * mantiene la seguridad legible: `admins.ts` sirve al panel y devuelve la
 * cuenta entera —correo, rol, alta—; esto lo consume una página que puede abrir
 * cualquiera, y por eso el tipo que devuelve solo tiene nombre y foto. Lo que
 * no se selecciona no se puede filtrar por accidente a una vista pública.
 *
 * Las lecturas van por el service role porque `admins` no es legible por anon
 * —ahí viven los `password_hash`—, así que RLS no puede ser aquí la red de
 * seguridad: lo es `SELECT_COLUMNS`.
 */

/**
 * Las únicas columnas de `admins` que pueden salir al público.
 *
 * Después del avatar viene el perfil de columnista (0010_opinion.sql) y las
 * redes sociales (0011_redes.sql): se escribieron para leerse en `/opinion` y
 * en la página del reportero, así que están aquí por diseño. Lo que sigue sin
 * aparecer —y no debe aparecer nunca— es `email`, `password_hash` y `role`.
 *
 * Las redes se enumeran a mano en vez de expandir `SOCIAL_COLUMNS` de
 * `lib/social.ts`. Es a propósito: esta lista es la frontera de lo que sale al
 * público y tiene que poder leerse completa aquí. El precio es acordarse de
 * agregar la columna si algún día crece el catálogo, y el olvido falla del lado
 * correcto —un enlace que no aparece, no un dato que se escapa—.
 */
// En una sola cadena literal a propósito: supabase-js deduce el tipo de la fila
// leyendo este texto, y si se arma concatenando deja de reconocerlo y devuelve
// `GenericStringError` en vez de las columnas.
// prettier-ignore
const SELECT_COLUMNS = "id, display_name, avatar_url, is_columnist, column_name, tagline, bio, x_url, facebook_url, instagram_url, tiktok_url, youtube_url, linkedin_url, website_url";

/** Un reportero como lo ve un lector. Sin correo, sin rol, sin fechas. */
export interface PublicReporter {
  id: string;
  /** Derivado del nombre; ver `toReporter`. */
  slug: string;
  display_name: string;
  avatar_url: string | null;
  /** Si firma columna de opinión. Decide su página y cómo se le pinta. */
  is_columnist: boolean;
  /** El nombre permanente de su columna. */
  column_name: string | null;
  tagline: string | null;
  bio: string | null;
  x_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

/**
 * El slug sale del nombre y no de una columna nueva, igual que en las
 * secciones (`updateCategory` lo regenera con cada cambio de nombre). El precio
 * es el mismo que allá: renombrar a alguien cambia su URL. A cambio no hay una
 * columna que pueda quedar desincronizada, ni un backfill que hacer para las
 * cuentas que ya existen.
 */
function toReporter(row: Record<string, unknown>): PublicReporter {
  const name = (row.display_name as string) ?? "";
  const text = (key: string) => ((row[key] as string | null) ?? null) || null;

  return {
    id: row.id as string,
    slug: slugify(name),
    display_name: name,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_columnist: Boolean(row.is_columnist),
    column_name: text("column_name"),
    tagline: text("tagline"),
    bio: text("bio"),
    x_url: text("x_url"),
    facebook_url: text("facebook_url"),
    instagram_url: text("instagram_url"),
    tiktok_url: text("tiktok_url"),
    youtube_url: text("youtube_url"),
    linkedin_url: text("linkedin_url"),
    website_url: text("website_url"),
  };
}

/**
 * A dónde lleva el nombre de una firma.
 *
 * Existe para que la bifurcación viva en un solo lugar: la byline de la nota,
 * la tarjeta de opinión y la tira de columnistas la usan todas, y
 * `/reportero/[slug]` redirige a `/opinion/[slug]` para los columnistas — dos
 * URLs para la misma persona sería partir su posicionamiento en dos.
 */
export function profilePath(reporter: Pick<PublicReporter, "slug" | "is_columnist">): string {
  return reporter.is_columnist ? `/opinion/${reporter.slug}` : `/reportero/${reporter.slug}`;
}

/**
 * Todas las cuentas que pueden firmar, en orden de antigüedad.
 *
 * Se traen enteras y se filtran en memoria porque el slug no existe en la base:
 * son un puñado de filas —la redacción, no un directorio— y una consulta por
 * nombre exacto no sabría resolver "juan-perez".
 */
async function listAll(): Promise<PublicReporter[]> {
  const { data, error } = await supabaseAdmin()
    .from("admins")
    .select(SELECT_COLUMNS)
    .order("created_at");

  if (error) throw new Error(`No se pudieron listar los reporteros: ${error.message}`);
  return (data ?? []).map(toReporter);
}

/**
 * El reportero de una URL, o `null` si ese slug no es de nadie.
 *
 * Si dos cuentas se llaman igual gana la más antigua. Es una colisión que en
 * una redacción de este tamaño no se ha dado; cuando se dé, el arreglo es
 * distinguirlas por el nombre con el que firman —que es lo que el lector ve—,
 * no inventar un sufijo en la URL.
 */
export async function getReporterBySlug(slug: string): Promise<PublicReporter | null> {
  const reporters = await listAll();
  return reporters.find((reporter) => reporter.slug === slug) ?? null;
}

/**
 * A quién apunta la firma de una nota. `null` cuando la nota no tiene autor
 * —las importadas, y las que firmó una cuenta ya borrada—: ahí la byline se
 * queda como texto y no como enlace.
 */
export async function getReporterById(id: string | null): Promise<PublicReporter | null> {
  if (!id) return null;

  const { data, error } = await supabaseAdmin()
    .from("admins")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el reportero: ${error.message}`);
  return data ? toReporter(data) : null;
}

/**
 * Los reporteros con al menos una nota publicada, para el sitemap.
 *
 * Un conteo por cuenta en vez de recorrer la tabla de noticias entera: son
 * `head: true`, no devuelven filas, y las cuentas son pocas. Los que no han
 * publicado nada se quedan fuera a propósito — su página existe, pero ofrecerle
 * a Google una lista vacía es exactamente lo que penaliza como página delgada.
 */
export async function listReportersWithNotes(): Promise<PublicReporter[]> {
  const reporters = await listAll();

  const counted = await Promise.all(
    reporters.map(async (reporter) => {
      const { count } = await supabasePublic()
        .from("news")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("author_id", reporter.id);

      return { reporter, count: count ?? 0 };
    }),
  );

  return counted.filter((entry) => entry.count > 0).map((entry) => entry.reporter);
}

/**
 * Las cuentas marcadas como columnistas, en orden de antigüedad.
 *
 * Se filtra en memoria sobre `listAll` —que ya se usa para resolver slugs— en
 * vez de consultar con `.eq("is_columnist", true)`: son las mismas pocas filas
 * y así hay una sola forma de convertir una fila de `admins` en un autor
 * público.
 */
export async function listColumnists(): Promise<PublicReporter[]> {
  const reporters = await listAll();
  return reporters.filter((reporter) => reporter.is_columnist);
}

/** El columnista de una URL de `/opinion/[slug]`, o `null` si no lo es. */
export async function getColumnistBySlug(slug: string): Promise<PublicReporter | null> {
  const reporter = await getReporterBySlug(slug);
  return reporter?.is_columnist ? reporter : null;
}
