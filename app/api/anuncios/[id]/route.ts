import { revalidatePath } from "next/cache";

import { parseAdInput } from "@/lib/ads-input";
import { requireAdmin } from "@/lib/auth/session";
import { deleteAd, getAdById, updateAd } from "@/lib/data/ads";

export async function GET(_request: Request, ctx: RouteContext<"/api/anuncios/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  try {
    const ad = await getAdById(id);
    if (!ad) return Response.json({ error: "Anuncio no encontrado" }, { status: 404 });
    return Response.json({ ad });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/anuncios/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  const parsed = parseAdInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const ad = await updateAd(id, parsed);
    revalidatePath("/", "layout");
    return Response.json({ ad });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/anuncios/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  try {
    await deleteAd(id);
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
