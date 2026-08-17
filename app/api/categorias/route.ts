import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { categorySlugExists, createCategory, listCategories } from "@/lib/data/categories";
import { slugify } from "@/lib/slug";

export async function GET() {
  try {
    return Response.json({ categories: await listCategories() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

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

  if (await categorySlugExists(slug)) {
    return Response.json({ error: "Ya existe una sección con ese nombre" }, { status: 409 });
  }

  try {
    const category = await createCategory(name);
    revalidatePath("/"); // el nav de la portada lista las secciones
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
