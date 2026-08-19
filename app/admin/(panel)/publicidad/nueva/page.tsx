import type { Metadata } from "next";

import { AdForm } from "@/components/admin/AdForm";
import { todayInSiteZone } from "@/lib/site";

export const metadata: Metadata = { title: "Nueva campaña" };

export default function NuevaCampanaPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Nueva campaña</h1>
      <p className="mb-8 text-sm text-muted">
        El espacio es uno de los huecos fijos del sitio. Si ya hay otra campaña corriendo en el
        mismo, las dos se alternan.
      </p>

      <AdForm today={todayInSiteZone()} />
    </div>
  );
}
