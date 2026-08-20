import type { Metadata } from "next";

import { requirePanelPermission } from "@/lib/auth/session";
import { getHomeSlots, getSiteSettings } from "@/lib/data/home";
import { listAllForAdmin } from "@/lib/data/news";

import { PortadaEditor } from "./PortadaEditor";

export const metadata: Metadata = { title: "Portada" };

export default async function PortadaPage() {
  await requirePanelPermission("portada");

  const [slots, settings, news] = await Promise.all([
    getHomeSlots(),
    getSiteSettings(),
    listAllForAdmin(),
  ]);

  // Solo se puede curar lo que el público puede ver.
  const published = news.filter((n) => n.status === "published");

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Portada</h1>
      <p className="mb-8 text-sm text-muted">
        Elige qué va en cada bloque de la página de inicio. Lo que dejes vacío se llena solo
        con lo más reciente, así que la portada nunca se ve rota.
      </p>

      <PortadaEditor initialSlots={slots} initialSettings={settings} news={published} />
    </div>
  );
}
