import { requirePermission } from "@/lib/auth/session";
import {
  adminEmailExists,
  createAdminAccount,
  listAdminAccounts,
} from "@/lib/data/admins";
import { revalidateOpinion } from "@/lib/revalidate-opinion";
import { parseNewUserInput } from "@/lib/users-input";

/**
 * Alta y listado de cuentas del panel.
 *
 * Todo exige el permiso `usuarios`, que solo tiene el rol admin: un reportero
 * ni siquiera puede enumerar quién más entra al panel.
 *
 * La byline de una nota vive desnormalizada en `news.author_name`, así que el
 * sitio no se entera de que una cuenta se renombró — y esa es justamente la
 * intención. Lo que sí se revalida es Opinión: ahí el perfil del columnista no
 * está congelado, se resuelve en cada render contra `admins` (ver
 * `lib/data/opinion.ts`), y marcar a alguien como columnista cambia el listado.
 */

export async function GET() {
  const admin = await requirePermission("usuarios");
  if (admin instanceof Response) return admin;

  try {
    return Response.json({ users: await listAdminAccounts() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission("usuarios");
  if (admin instanceof Response) return admin;

  const parsed = parseNewUserInput(await request.json().catch(() => null));
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  // La columna es `unique`, así que esto es cortesía para dar un mensaje
  // entendible en vez de un 500 con el texto crudo de Postgres.
  if (await adminEmailExists(parsed.email)) {
    return Response.json({ error: "Ya hay una cuenta con ese correo" }, { status: 409 });
  }

  try {
    const user = await createAdminAccount(parsed);
    if (user.is_columnist) revalidateOpinion();
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
