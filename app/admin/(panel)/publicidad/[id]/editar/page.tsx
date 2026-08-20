import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdForm } from "@/components/admin/AdForm";
import { requirePanelPermission } from "@/lib/auth/session";
import { getAdById } from "@/lib/data/ads";
import { todayInSiteZone } from "@/lib/site";

export const metadata: Metadata = { title: "Editar campaña" };

export default async function EditarCampanaPage(
  props: PageProps<"/admin/publicidad/[id]/editar">,
) {
  await requirePanelPermission("publicidad");

  const { id } = await props.params;
  const ad = await getAdById(id);
  if (!ad) notFound();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Editar campaña</h1>
      <p className="mb-8 text-sm text-muted">
        {ad.advertiser} · {ad.click_count} {ad.click_count === 1 ? "clic" : "clics"} hasta ahora.
      </p>

      <AdForm ad={ad} today={todayInSiteZone()} />
    </div>
  );
}
