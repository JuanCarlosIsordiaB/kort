import { AdSlot } from "@/components/ads/AdSlot";
import { getSiteSettings } from "@/lib/data/home";
import { punct } from "@/lib/punctuation";
import { socialList } from "@/lib/social";

import { KortMark } from "./KortMark";
import { SiteSocials } from "./SiteSocials";

/**
 * El pie lo monta cada página pública por su cuenta, así que el hueco de
 * publicidad que va aquí sale en todas sin tener que acordarse de ponerlo. Es
 * la razón por la que la zona se llama `footer-banner` y no "portada — pie".
 *
 * Async porque consulta las campañas vigentes; los cuatro llamadores son Server
 * Components.
 */
export async function SiteFooter() {
  // La línea del pie se edita en /admin/portada y hasta ahora sólo la aplicaban
  // la portada y el archivo, que la pasaban por prop; las otras cinco páginas
  // enseñaban el texto de fábrica aunque estuviera cambiado. Leerla aquí —de la
  // misma consulta memoizada que ya trae las redes— la arregla en todas.
  const settings = await getSiteSettings();
  const socials = socialList(settings);

  return (
    <>
      <AdSlot zone="footer-banner" className="px-6 pt-10 pb-2 md:px-10" />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-strong px-6 py-5 md:px-10">
        <KortMark height={26} />

        {/* Las redes al centro y el aviso a la derecha, pero en móvil el orden
            de lectura es el del DOM: logo, redes, aviso. */}
        <SiteSocials links={socials} className="flex order-last w-full justify-center sm:order-none sm:w-auto" />

        <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted">
          © {new Date().getFullYear()} KORT — {punct(settings.footer_tagline)}
        </span>
      </footer>
    </>
  );
}
