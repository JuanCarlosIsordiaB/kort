import { revalidatePath } from "next/cache";

import { parseAdInput } from "@/lib/ads-input";
import { requireAdmin } from "@/lib/auth/session";
import { createAd, listAds } from "@/lib/data/ads";

/**
 * `revalidatePath("/", "layout")` y no la ruta suelta: los anuncios salen en la
 * portada, en las notas, en las secciones y en el archivo, y el pie los lleva
 * en todas. Revalidar el layout raíz los alcanza a todos de un golpe. Es lo
 * mismo que hace /api/portada.
 */
function revalidateEverywhere() {
  revalidatePath("/", "layout");
}

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  try {
    return Response.json({ ads: await listAds() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const parsed = parseAdInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const ad = await createAd(parsed);
    revalidateEverywhere();
    return Response.json({ ad }, { status: 201 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
