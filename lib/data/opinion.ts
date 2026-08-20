import { getOpinionCategory } from "@/lib/data/categories";
import { listPublished } from "@/lib/data/news";
import { listColumnists, type PublicReporter } from "@/lib/data/reporters";
import type { Category, NewsWithCategory, Paginated } from "@/lib/types";

/**
 * La sección de Opinión, compuesta.
 *
 * No hay consultas propias aquí: este módulo junta tres cosas que ya existen
 * —cuál es la sección de Opinión, qué se publicó en ella y quién es cada
 * columnista— y devuelve lo que las páginas necesitan pintar. La alternativa,
 * un join en `news`, no serviría: `news` no guarda el nombre de la columna a
 * propósito (ver 0010_opinion.sql), justo para que renombrarla se refleje en
 * todo el archivo.
 */

/** Una colaboración con su columnista ya resuelto. */
export interface OpinionEntry extends NewsWithCategory {
  /**
   * `null` cuando la nota se importó, la firmó una cuenta ya borrada, o la
   * firmó alguien que no está marcado como columnista. En esos casos la
   * tarjeta cae de vuelta a `author_name`, que sí está congelado en la fila.
   */
  columnist: PublicReporter | null;
}

export interface OpinionPage extends Paginated<OpinionEntry> {
  /** `null` si nadie ha marcado todavía una sección como la de Opinión. */
  category: Category | null;
}

const EMPTY: Omit<OpinionPage, "category"> = { items: [], total: 0, page: 1, pageCount: 0 };

/**
 * Las colaboraciones publicadas, opcionalmente las de un solo columnista.
 *
 * El cruce autor→columnista se hace en memoria porque los columnistas son un
 * puñado de filas —caben en un `Map`— y así se paga una consulta por página en
 * lugar de una por tarjeta.
 */
export async function listOpinion(
  options: { page?: number; authorId?: string } = {},
): Promise<OpinionPage> {
  const category = await getOpinionCategory();
  if (!category) return { ...EMPTY, page: Math.max(1, options.page ?? 1), category: null };

  const [page, columnists] = await Promise.all([
    listPublished({ page: options.page, categoryId: category.id, authorId: options.authorId }),
    listColumnists(),
  ]);

  const byId = new Map(columnists.map((columnist) => [columnist.id, columnist]));

  return {
    ...page,
    items: page.items.map((item) => ({
      ...item,
      columnist: item.author_id ? byId.get(item.author_id) ?? null : null,
    })),
    category,
  };
}
