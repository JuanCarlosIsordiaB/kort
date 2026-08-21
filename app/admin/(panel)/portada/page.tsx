import type { Metadata } from "next";

import { requirePanelPermission } from "@/lib/auth/session";
import { listCategories } from "@/lib/data/categories";
import { getHomeSlots, getSiteSettings } from "@/lib/data/home";
import { listNewsOptionsByIds } from "@/lib/data/news";

import { PortadaEditor } from "./PortadaEditor";

export const metadata: Metadata = { title: "Portada" };

export default async function PortadaPage() {
  await requirePanelPermission("portada");

  const [slots, settings, categories] = await Promise.all([
    getHomeSlots(),
    getSiteSettings(),
    listCategories(),
  ]);

  // Solo los títulos de lo que ya está puesto: el resto lo busca el selector
  // contra el servidor. Antes se mandaba el catálogo entero de publicadas, que
  // con el archivo creciendo era la mayor parte del HTML de esta página.
  const options = await listNewsOptionsByIds(Object.values(slots).flat());

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Portada</h1>
      <p className="mb-8 text-sm text-muted">
        Elige qué va en cada bloque de la página de inicio. Lo que dejes vacío se llena solo
        con lo más reciente, así que la portada nunca se ve rota.
      </p>

      <PortadaEditor
        initialSlots={slots}
        initialSettings={settings}
        categories={categories}
        initialOptions={options}
      />
    </div>
  );
}
