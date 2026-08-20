import { revalidatePath } from "next/cache";

import { revalidateOpinion } from "@/lib/revalidate-opinion";

import { requireEditableNews } from "@/lib/auth/news-access";
import { requireAdmin } from "@/lib/auth/session";
import { deleteNews, getNewsById, updateNews } from "@/lib/data/news";
import { parseNewsInput } from "@/lib/news-input";

export async function GET(_request: Request, ctx: RouteContext<"/api/noticias/[id]">) {
  const { id } = await ctx.params;

  const news = await getNewsById(id);
  if (!news) {
    return Response.json({ error: "Noticia no encontrada" }, { status: 404 });
  }

  // Un borrador solo lo puede ver un admin: para el público no existe.
  if (news.status !== "published") {
    const admin = await requireAdmin();
    if (admin instanceof Response) {
      return Response.json({ error: "Noticia no encontrada" }, { status: 404 });
    }
  }

  return Response.json({ news });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/noticias/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  const denied = await requireEditableNews(admin, id);
  if (denied) return denied;

  const parsed = parseNewsInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const news = await updateNews(id, parsed);
    revalidatePath("/"); // la portada es ISR
    revalidateOpinion(); // por si la nota es de la sección de Opinión
    return Response.json({ news });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/noticias/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  const denied = await requireEditableNews(admin, id);
  if (denied) return denied;

  try {
    await deleteNews(id);
    revalidatePath("/"); // la portada es ISR
    revalidateOpinion(); // por si la nota es de la sección de Opinión
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
