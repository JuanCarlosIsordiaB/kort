import type { Metadata } from "next";

import { requirePanelPermission } from "@/lib/auth/session";
import { listAdminAccounts } from "@/lib/data/admins";

import { UsersManager } from "./UsersManager";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  // Devuelve el admin de la sesión, no solo comprueba: la lista necesita saber
  // cuál de las cuentas es la suya para no ofrecerle borrarse.
  const admin = await requirePanelPermission("usuarios");
  const users = await listAdminAccounts();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Usuarios</h1>
      <p className="mb-8 text-sm text-muted">
        Quién entra al panel y con qué permisos. Un <strong>administrador</strong> ve todo el
        panel; un <strong>reportero</strong> solo sube y edita sus propias noticias.
      </p>

      <UsersManager users={users} currentAdminId={admin.id} />
    </div>
  );
}
