import { requireAdmin } from "@/lib/auth/session";
import { listNewsOptions } from "@/lib/data/news";

/**
 * El buscador de los selectores del panel (portada y notas recomendadas).
 *
 * Solo devuelve publicadas: los dos selectores que la consumen eligen qué se le
 * enseña al público, y un borrador ahí sería un enlace roto. Por eso tampoco se
 * acota por autor como el listado — recomendar la nota de otro reportero no es
 * editarla, y la portada es de la redacción entera.
 *
 * Sin `q` contesta lo más reciente, que es el caso normal: casi siempre se
 * quiere la nota de hoy. `q` es lo que alcanza el archivo viejo sin tener que
 * pintarlo entero.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const params = new URL(request.url).searchParams;

  try {
    const news = await listNewsOptions({
      // El mismo tope que el filtro del listado: un término de 120 caracteres
      // ya no es una búsqueda.
      q: params.get("q")?.slice(0, 120) || undefined,
      categoryId: params.get("seccion") || undefined,
      excludeId: params.get("excluir") || undefined,
      status: "published",
    });
    return Response.json({ news });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
