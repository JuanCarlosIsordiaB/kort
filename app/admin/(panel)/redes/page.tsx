import type { Metadata } from "next";

import { requirePanelPermission } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/home";

import { RedesEditor } from "./RedesEditor";

export const metadata: Metadata = { title: "Redes sociales" };

export default async function RedesPage() {
  await requirePanelPermission("redes");

  const settings = await getSiteSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Redes sociales</h1>
      <p className="mb-8 text-sm text-muted">
        Las cuentas del periódico. Salen con su logotipo en el masthead, dentro del
        menú de móvil y en el pie de todas las páginas. Las que dejes en blanco no
        aparecen.
      </p>

      <RedesEditor initialSettings={settings} />
    </div>
  );
}
