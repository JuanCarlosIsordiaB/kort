import Image from "next/image";

import { AdCarousel } from "@/components/ads/AdCarousel";
import { AD_ZONES, type AdZone } from "@/lib/ad-zones";
import { pickAdsFor } from "@/lib/data/ads";

/**
 * Un hueco de publicidad. Se monta como `<AdSlot zone="home-top" />`.
 *
 * Server Component: las campañas se eligen al renderizar y el banner llega ya
 * en el HTML, así que no hay parpadeo ni una petición extra por hueco. Ver
 * `pickAdsFor` en lib/data/ads.ts para el alcance real del sorteo cuando hay
 * varias campañas en la misma zona.
 *
 * Si no hay ninguna vigente no renderiza nada —ni el rótulo ni la caja—, así
 * que un hueco sin vender no deja un espacio en blanco en la página.
 */
export async function AdSlot({
  zone,
  className,
  /**
   * Con varias campañas vendidas en la zona, pasarlas en ciclo en vez de dejar
   * fija la que salió sorteada.
   *
   * Está apagado por omisión porque es lo único de publicidad que baja
   * JavaScript al cliente: se enciende hueco por hueco, donde el movimiento se
   * gana el costo. Con una sola campaña vigente da igual —no hay nada que
   * rotar— y el hueco se renderiza fijo aunque venga en `true`.
   */
  rotate = false,
}: {
  zone: AdZone;
  className?: string;
  rotate?: boolean;
}) {
  const ads = await pickAdsFor(zone);
  if (ads.length === 0) return null;

  const spec = AD_ZONES[zone];

  return (
    <aside
      aria-label="Publicidad"
      className={`flex flex-col items-center gap-1.5 ${className ?? ""}`}
    >
      {/*
        El rótulo no es decorativo. En un sitio de noticias, distinguir lo
        pagado de lo editorial es lo mínimo exigible, y sin él un banner con
        foto y titular se confunde con una nota.
      */}
      <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted">
        PUBLICIDAD
      </span>

      {rotate && ads.length > 1 ? (
        <AdCarousel
          // Solo lo que se ve. `notes` se queda en el servidor.
          ads={ads.map(({ id, image_url, alt, advertiser }) => ({
            id,
            image_url,
            alt,
            advertiser,
          }))}
          width={spec.width}
          height={spec.height}
        />
      ) : (
        <AdBanner ad={ads[0]} width={spec.width} height={spec.height} />
      )}
    </aside>
  );
}

/** El hueco de siempre: una campaña, sin nada de cliente. */
function AdBanner({
  ad,
  width,
  height,
}: {
  ad: { id: string; image_url: string; alt: string | null; advertiser: string };
  width: number;
  height: number;
}) {
  return (
    <a
      href={`/api/anuncios/${ad.id}/click`}
      target="_blank"
      // `sponsored` es lo que Google espera en un enlace pagado; sin él, el
      // enlace se lee como una recomendación editorial. `noopener` porque
      // abre en pestaña nueva.
      rel="noopener noreferrer sponsored"
      className="block w-full transition-opacity duration-200 ease-soft hover:opacity-90"
      style={{ maxWidth: width }}
    >
      <Image
        src={ad.image_url}
        // El alt lo escribe quien captura la campaña; si no lo puso, al menos
        // que un lector de pantalla sepa de quién es el anuncio.
        alt={ad.alt ?? `Anuncio de ${ad.advertiser}`}
        width={width}
        height={height}
        // `unoptimized` por dos razones: el optimizador re-codifica y mata la
        // animación de un GIF, y el creativo llega del anunciante ya en su
        // tamaño final, así que no hay nada que optimizar.
        unoptimized
        className="h-auto w-full rounded-[var(--radius-card)]"
      />
    </a>
  );
}
