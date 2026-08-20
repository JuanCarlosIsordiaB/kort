import { requirePermission } from "@/lib/auth/session";
import {
  deleteAdminAccount,
  getAdminAccount,
  updateAdminAccount,
} from "@/lib/data/admins";
import { revalidateOpinion } from "@/lib/revalidate-opinion";
import { parseUserProfileInput } from "@/lib/users-input";

/**
 * Editar y borrar cuentas.
 *
 * Las dos comparten la misma preocupación: que el panel no se quede sin nadie
 * que pueda administrarlo. Se resuelve con una sola regla —nadie se degrada ni
 * se borra a sí mismo— y de ahí sale solo el resto: quien manda la petición es
 * administrador y no es el afectado, así que después de aplicarla queda al
 * menos un administrador en pie. Por eso no hace falta contar cuántos hay.
 *
 * El precio es que un administrador que quiera dejar de serlo necesita que otro
 * se lo cambie, que es exactamente lo que impide que el último se vaya solo.
 */

export async function PUT(request: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const admin = await requirePermission("usuarios");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  const target = await getAdminAccount(id);
  if (!target) {
    return Response.json({ error: "La cuenta no existe" }, { status: 404 });
  }

  const parsed = parseUserProfileInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.role !== target.role && target.id === admin.id) {
    return Response.json(
      { error: "No puedes cambiar tu propio rol. Pídeselo a otro administrador." },
      { status: 409 },
    );
  }

  try {
    const user = await updateAdminAccount(id, parsed);
    // También cuando se desmarca: su tarjeta debe dejar de salir en /opinion.
    if (user.is_columnist || target.is_columnist) revalidateOpinion();
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const admin = await requirePermission("usuarios");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;

  if (id === admin.id) {
    return Response.json(
      { error: "No puedes eliminar tu propia cuenta" },
      { status: 409 },
    );
  }

  const target = await getAdminAccount(id);
  if (!target) {
    return Response.json({ error: "La cuenta no existe" }, { status: 404 });
  }

  try {
    // Sus noticias se quedan: `author_id` pasa a NULL y la firma sigue en
    // `author_name`. Ver el comentario en `deleteAdminAccount`.
    await deleteAdminAccount(id);
    if (target.is_columnist) revalidateOpinion();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
