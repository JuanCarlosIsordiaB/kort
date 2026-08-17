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
    <div className="flex min-h-screen">
      <AdminSidebar adminName={admin.display_name} avatarUrl={admin.avatar_url} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
