"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AD_ZONES, isAdZone } from "@/lib/ad-zones";
import { AD_STATUS_LABEL, adStatus, type AdStatus } from "@/lib/ad-status";
import type { Ad } from "@/lib/types";

/**
 * `timeZone: "UTC"` a propósito: `starts_on` es un día suelto ("2026-08-19"),
 * no un instante. Al convertirlo a Date se interpreta como medianoche UTC, y
 * sin fijar la zona el formateador lo correría al día anterior.
 */
const dayFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`)).replace(".", "");
}

function zoneLabel(zone: string): string {
  return isAdZone(zone) ? AD_ZONES[zone].label : zone;
}

const BADGE: Record<AdStatus, string> = {
  vigente: "bg-accent text-accent-foreground",
  programada: "bg-chip text-foreground",
  pausada: "bg-chip text-muted",
  vencida: "bg-chip text-muted",
};

export function AdsManager({ ads, today }: { ads: Ad[]; today: string }) {
  if (ads.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-border p-8 text-center text-sm text-muted">
        Todavía no hay campañas. Crea la primera.
      </p>
    );
  }

  /**
   * Con cuántas más comparte hueco esta campaña ahora mismo. Se muestra porque
   * la sorpresa típica es "subí el anuncio y no aparece" cuando en realidad
   * está rotando con otro que ocupa la misma zona.
   */
  function sharingZone(ad: Ad): number {
    if (adStatus(ad, today) !== "vigente") return 0;
    return ads.filter(
      (other) =>
        other.id !== ad.id && other.zone === ad.zone && adStatus(other, today) === "vigente",
    ).length;
  }

  return (
    <>
      {/* En móvil una tabla de siete columnas obliga a scroll lateral para leer
          una sola fila, así que ahí cada campaña sale como tarjeta. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {ads.map((ad) => (
          <li
            key={ad.id}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4"
          >
            <div className="flex items-start gap-3">
              <Thumb ad={ad} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{ad.advertiser}</p>
                <p className="text-xs text-muted">{zoneLabel(ad.zone)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <StatusBadge ad={ad} today={today} />
              <span>
                {formatDay(ad.starts_on)} — {formatDay(ad.ends_on)}
              </span>
              <span aria-hidden>·</span>
              <span>{ad.click_count} clics</span>
            </div>

            <RotationNote count={sharingZone(ad)} />
            <AdRowActions id={ad.id} advertiser={ad.advertiser} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-chip">
            <tr>
              <th className="px-4 py-3 font-bold">Anuncio</th>
              <th className="px-4 py-3 font-bold">Empresa</th>
              <th className="px-4 py-3 font-bold">Espacio</th>
              <th className="px-4 py-3 font-bold">Vigencia</th>
              <th className="px-4 py-3 font-bold">Estado</th>
              <th className="px-4 py-3 font-bold">Clics</th>
              <th className="px-4 py-3 font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Thumb ad={ad} />
                </td>
                <td className="px-4 py-3 font-semibold">{ad.advertiser}</td>
                <td className="px-4 py-3 text-muted">
                  {zoneLabel(ad.zone)}
                  <RotationNote count={sharingZone(ad)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDay(ad.starts_on)} — {formatDay(ad.ends_on)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge ad={ad} today={today} />
                </td>
                <td className="px-4 py-3 text-muted">{ad.click_count}</td>
                <td className="px-4 py-3">
                  <AdRowActions id={ad.id} advertiser={ad.advertiser} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Thumb({ ad }: { ad: Ad }) {
  return (
    // Ya está en Supabase Storage; <img> evita pasar por next/image para una
    // miniatura del panel, igual que en la barra lateral y el perfil.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ad.image_url}
      alt=""
      className="h-10 w-20 shrink-0 rounded-[var(--radius-thumb)] border border-border object-cover"
    />
  );
}

function StatusBadge({ ad, today }: { ad: Ad; today: string }) {
  const status = adStatus(ad, today);
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] px-2 py-1 text-xs font-bold ${BADGE[status]}`}
    >
      {AD_STATUS_LABEL[status]}
    </span>
  );
}

function RotationNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      Rota con {count} {count === 1 ? "campaña más" : "campañas más"} en este espacio.
    </p>
  );
}

function AdRowActions({ id, advertiser }: { id: string; advertiser: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm(`¿Eliminar la campaña de ${advertiser}? No se puede deshacer.`)) {
      return;
    }

    setPending(true);
    const res = await fetch(`/api/anuncios/${id}`, { method: "DELETE" });
    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "No se pudo eliminar");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
      <Link href={`/admin/publicidad/${id}/editar`} className="py-1 underline">
        Editar
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="py-1 text-accent underline"
      >
        {pending ? "…" : "Eliminar"}
      </button>
    </div>
  );
}
