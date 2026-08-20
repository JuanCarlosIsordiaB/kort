import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import {
  categorySlugExists,
  createCategory,
  isDuplicateOpinionError,
  listCategories,
} from "@/lib/data/categories";
import { revalidateOpinion } from "@/lib/revalidate-opinion";
import { slugify } from "@/lib/slug";
import type { CategoryKind } from "@/lib/types";

/** `kind` viene del panel; cualquier cosa que no sea "opinion" es una sección normal. */
function parseKind(value: unknown): CategoryKind {
  return value === "opinion" ? "opinion" : "noticia";
}

/**
 * Solo puede haber una sección de Opinión: lo impone un índice único en la
 * base. Se traduce a un 409 con un mensaje entendible en vez de dejar salir el
 * texto crudo de Postgres como un 500.
 */
function categoryError(error: unknown): Response {
  const message = (error as Error).message;

  if (isDuplicateOpinionError(message)) {
    return Response.json(
      { error: "Ya hay una sección marcada como Opinión. Desmárcala primero." },
      { status: 409 },
    );
  }

  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    return Response.json({ categories: await listCategories() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission("secciones");
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
    const category = await createCategory(name, parseKind(body?.kind));
    revalidatePath("/"); // el nav de la portada lista las secciones
    revalidateOpinion();
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return categoryError(error);
  }
}
