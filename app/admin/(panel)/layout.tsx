import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getCurrentAdmin } from "@/lib/auth/session";

/**
 * `/admin/login` vive fuera de este grupo de rutas a propósito: si estuviera
 * dentro, este layout lo protegería y el login rebotaría contra sí mismo.
 */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(LOGIN_PATH);

  return (
    // `admin-shell` sube los campos a 16px en móvil: abajo de eso Safari de iOS
    // hace zoom al enfocarlos y deja el panel descuadrado.
    // `min-w-0` en el main deja que las tablas anchas hagan su propio scroll en
    // vez de estirar el layout.
    <div className="admin-shell flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar adminName={admin.display_name} avatarUrl={admin.avatar_url} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
