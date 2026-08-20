import "server-only";

import { getNewsAuthorId } from "@/lib/data/news";
import type { PublicAdmin } from "@/lib/types";

import { can } from "./roles";

/**
 * Quién puede tocar qué nota.
 *
 * Un administrador entra a todas. Un reportero solo a las que firmó: puede
 * publicarlas, corregirlas y borrarlas, pero el trabajo de otro no se le abre
 * ni por URL directa.
 *
 * Vive aparte de `session.ts` porque necesita consultar `news`, y `session.ts`
 * es la capa que todo el panel importa: meterle la tabla de noticias lo ataría
 * a un módulo de datos que la mayoría de sus llamadores no usa.
 */

/** Sin consultar la base: sirve donde la nota ya está cargada. */
export function canEditNews(
  admin: PublicAdmin,
  news: { author_id: string | null },
): boolean {
  return can(admin.role, "noticias:ajenas") || news.author_id === admin.id;
}

/**
 * Para route handlers. Devuelve `null` si puede seguir, o la `Response` que
 * debe retornarse.
 *
 * El 404 de la nota inexistente y el 403 de la ajena se distinguen a propósito:
 * quien está autenticado en el panel ya sabe que el resto de las notas existe
 * —las ve publicadas en el sitio—, así que esconder el motivo solo confundiría
 * a un reportero que se equivocó de enlace.
 */
export async function requireEditableNews(
  admin: PublicAdmin,
  newsId: string,
): Promise<Response | null> {
  if (can(admin.role, "noticias:ajenas")) return null;

  const found = await getNewsAuthorId(newsId);
  if (!found) {
    return Response.json({ error: "Noticia no encontrada" }, { status: 404 });
  }

  if (found.authorId !== admin.id) {
    return Response.json(
      { error: "Solo puedes editar las noticias que tú publicaste" },
      { status: 403 },
    );
  }

  return null;
}
