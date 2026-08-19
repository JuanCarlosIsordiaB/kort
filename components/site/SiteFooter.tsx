import { AdSlot } from "@/components/ads/AdSlot";
import { punct } from "@/lib/punctuation";

import { KortMark } from "./KortMark";

/**
 * El pie lo monta cada página pública por su cuenta, así que el hueco de
 * publicidad que va aquí sale en todas sin tener que acordarse de ponerlo. Es
 * la razón por la que la zona se llama `footer-banner` y no "portada — pie".
 *
 * Async porque consulta las campañas vigentes; los cuatro llamadores son Server
 * Components.
 */
export async function SiteFooter({ tagline }: { tagline?: string }) {
  const line = tagline ?? "NOTICIAS PARA GENTE QUE NO TIENE TODO EL DÍA";

  return (
    <>
      <AdSlot zone="footer-banner" className="px-6 pt-10 pb-2 md:px-10" />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-strong px-6 py-5 md:px-10">
        <KortMark height={26} />
        <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted">
          © {new Date().getFullYear()} KORT — {punct(line)}
        </span>
      </footer>
    </>
  );
}
