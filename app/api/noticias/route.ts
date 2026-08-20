import { revalidatePath } from "next/cache";

import { revalidateOpinion } from "@/lib/revalidate-opinion";

import { can } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { createNews, listAllForAdmin, listPublished } from "@/lib/data/news";
import { parseNewsInput } from "@/lib/news-input";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // El listado completo (con borradores) exige sesión. Sin `?status=all` la
  // ruta es pública y solo devuelve publicadas.
  if (url.searchParams.get("status") === "all") {
    const admin = await requireAdmin();
    if (admin instanceof Response) return admin;

    try {
      // Un reportero solo se lleva las suyas: el listado del panel es el mismo
      // universo sobre el que puede actuar.
      const authorId = can(admin.role, "noticias:ajenas") ? undefined : admin.id;
      return Response.json({ news: await listAllForAdmin({ authorId }) });
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  }

  const page = Number(url.searchParams.get("page") ?? "1");
  const categoryId = url.searchParams.get("categoryId") ?? undefined;

  try {
    const result = await listPublished({
      page: Number.isFinite(page) ? page : 1,
      categoryId,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = parseNewsInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const news = await createNews(parsed, {
      id: admin.id,
      display_name: admin.display_name,
      avatar_url: admin.avatar_url,
    });
    revalidatePath("/"); // la portada es ISR
    revalidateOpinion(); // por si la nota es de la sección de Opinión
    return Response.json({ news }, { status: 201 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
