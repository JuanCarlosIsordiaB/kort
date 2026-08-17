import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import {
  categorySlugExists,
  countNewsInCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/data/categories";
import { slugify } from "@/lib/slug";

export async function PUT(request: Request, ctx: RouteContext<"/api/categorias/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return Response.json(
      { error: "El nombre debe tener al menos una letra o número" },
      { status: 400 },
    );
  }

  if (await categorySlugExists(slug, id)) {
    return Response.json({ error: "Ya existe una sección con ese nombre" }, { status: 409 });
  }

  try {
    const category = await updateCategory(id, name);
    revalidatePath("/"); // el nav de la portada lista las secciones
    return Response.json({ category });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/categorias/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  // Se bloquea el borrado en vez de cascada o reasignación: perder la sección
  // de una noticia ya publicada es peor que obligar a moverlas primero.
  const inUse = await countNewsInCategory(id);
  if (inUse > 0) {
    return Response.json(
      {
        error: `No se puede eliminar: la sección tiene ${inUse} noticia(s). Muévelas a otra sección primero.`,
      },
      { status: 409 },
    );
  }

  try {
    await deleteCategory(id);
    revalidatePath("/"); // el nav de la portada lista las secciones
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
