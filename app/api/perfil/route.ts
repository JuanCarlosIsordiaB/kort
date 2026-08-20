import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { revalidateOpinion } from "@/lib/revalidate-opinion";
import { parseSocials } from "@/lib/social";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseColumnistFields } from "@/lib/users-input";

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

  /*
    Las redes se validan aquí y no en el formulario.

    El navegador ya avisa de lo obvio, pero esta ruta la puede llamar cualquiera
    con una sesión válida y un `curl`, y lo que se guarde acaba siendo un `href`
    en una página pública. `parseSocials` es lo que impide que ahí termine un
    `javascript:` —o un enlace a otro sitio con la etiqueta de Instagram—; ver
    el comentario largo en lib/social.ts.

    Devuelve siempre las siete columnas, con `null` en las vacías, para que
    borrar una red la borre de verdad en vez de dejar el valor viejo.
  */
  const socials = parseSocials(b);
  if ("error" in socials) {
    return Response.json({ error: socials.error }, { status: 400 });
  }

  /*
    El texto de la columna lo edita cada quien: es su semblanza y el nombre de
    su columna. `is_columnist` NO se lee aquí a propósito —solo lo marca un
    administrador desde /admin/usuarios—: si se leyera, cualquier cuenta podría
    ascenderse a columnista mandando la bandera en el cuerpo. Quien no lo sea
    puede guardar estos campos, pero no salen a ninguna parte hasta que alguien
    lo marque.
  */
  const columnist = parseColumnistFields(b);
  if ("error" in columnist) {
    return Response.json({ error: columnist.error }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("admins")
    .update({ display_name: displayName, avatar_url: avatarUrl, ...columnist, ...socials })
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
  // La página del reportero es ISR de cinco minutos: sin esto, quien acaba de
  // agregar sus redes no las vería y creería que no se guardaron.
  revalidatePath("/reportero/[slug]", "page");
  // Y la de Opinión: el nombre de su columna encabeza cada una de sus tarjetas.
  revalidateOpinion();

  return Response.json({ ok: true });
}
