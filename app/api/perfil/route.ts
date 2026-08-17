import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  return Response.json({ admin });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const displayName =
    typeof b.display_name === "string" && b.display_name.trim()
      ? b.display_name.trim()
      : admin.display_name;

  const avatarUrl =
    typeof b.avatar_url === "string" && b.avatar_url.trim() ? b.avatar_url.trim() : null;

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("admins")
    .update({ display_name: displayName, avatar_url: avatarUrl })
    .eq("id", admin.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  /*
    La foto sí se propaga a las notas ya firmadas; el nombre no.

    `news.author_name` es un registro histórico: una byline firmada no debe
    cambiar porque el autor se renombre después. Pero una foto de perfil es la
    persona de hoy, no la de la fecha de publicación, así que se reescribe en
    todo lo que ese autor haya firmado.
  */
  const { error: propagateError } = await supabase
    .from("news")
    .update({ author_avatar_url: avatarUrl })
    .eq("author_id", admin.id);

  if (propagateError) {
    return Response.json({ error: propagateError.message }, { status: 500 });
  }

  revalidatePath("/"); // la fila de Opinión de la portada muestra el avatar

  return Response.json({ ok: true });
}
