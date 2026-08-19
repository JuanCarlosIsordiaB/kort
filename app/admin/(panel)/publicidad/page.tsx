import Link from "next/link";
import type { Metadata } from "next";

import { adStatus, sortAdsForPanel } from "@/lib/ad-status";
import { listAds } from "@/lib/data/ads";
import { todayInSiteZone } from "@/lib/site";

import { AdsManager } from "./AdsManager";

export const metadata: Metadata = { title: "Publicidad" };

export default async function PublicidadPage() {
  // El día se calcula aquí y viaja como prop: si cada fila lo sacara del reloj
  // del navegador, el HTML del servidor y el del cliente podrían no coincidir.
  const today = todayInSiteZone();
  const ads = sortAdsForPanel(await listAds(), today);

  const running = ads.filter((ad) => adStatus(ad, today) === "vigente").length;

  return (
    <div>
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Publicidad</h1>
        <Link
          href="/admin/publicidad/nueva"
          className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          Nueva campaña
        </Link>
      </header>

      <p className="mb-8 text-sm text-muted">
        {ads.length === 0
          ? "Cada campaña ocupa uno de los espacios fijos del sitio durante las fechas que contrató."
          : `${running} ${running === 1 ? "campaña corriendo" : "campañas corriendo"} de ${ads.length} en total.`}
      </p>

      <AdsManager ads={ads} today={today} />
    </div>
  );
}
