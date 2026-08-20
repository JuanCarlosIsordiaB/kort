import bcrypt from "bcryptjs";

import { normalizeRole } from "@/lib/auth/roles";
import { setSessionCookie } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Mismo mensaje para email inexistente y contraseña incorrecta: distinguirlos
 *  le confirmaría a un atacante qué correos están dados de alta. */
const INVALID = { error: "Correo o contraseña incorrectos" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json(INVALID, { status: 400 });
  }

  const { data: admin, error } = await supabaseAdmin()
    .from("admins")
    .select("id, email, display_name, password_hash, role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return Response.json(INVALID, { status: 401 });
  }

  const role = normalizeRole(admin.role);

  await setSessionCookie({ adminId: admin.id, email: admin.email, role });

  return Response.json({
    admin: { id: admin.id, email: admin.email, display_name: admin.display_name, role },
  });
}
