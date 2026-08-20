import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/AdSlot";
import { CardGrid, NowBar } from "@/components/home/CardGrid";
import { CategoryRows } from "@/components/home/CategoryRows";
import { LeadPackage } from "@/components/home/LeadPackage";
import { NewsletterBand } from "@/components/home/NewsletterBand";
import { OpinionRow } from "@/components/home/OpinionRow";
import { SidebarTabs } from "@/components/home/SidebarTabs";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getHomeData } from "@/lib/data/home";
import { organizationJsonLd, SITE_DESCRIPTION } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * La portada no lee params ni cookies, así que Next la prerenderizaría en el
 * build y se quedaría congelada: publicar una nota o recurar la portada no
 * cambiaría nada hasta el siguiente deploy.
 *
 * Con esto se regenera sola cada 5 minutos, y además las rutas que la afectan
 * llaman a `revalidatePath("/")` para que un cambio desde el panel se vea de
 * inmediato en vez de esperar la ventana.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  // El dominio se sirve con y sin `www`, y con `?utm_...` colgando de cada
  // enlace compartido. Sin canónica, cada variante es una portada distinta para
  // Google y la autoridad del sitio se reparte entre todas.
  alternates: { canonical: "/" },
  openGraph: { url: SITE_URL, type: "website" },
};

/**
 * Quién es Kort, en el formato que leen los buscadores.
 *
 * Va solo en la portada: la organización se declara una vez y las notas la
 * referencian por `@id` desde su `publisher`. Es lo que permite que el nombre y
 * el logo salgan junto a los resultados en vez de solo la URL.
 */
const homeJsonLd = {
  "@graph": [
    organizationJsonLd,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "es-MX",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default async function HomePage() {
  const home = await getHomeData();
  const { settings, lead, leadImages, breaking, featured, opinion, grid, categoryRows } =
    home;

  return (
    <div>
      <JsonLd data={homeJsonLd} />

      {/*
        Sangrado completo: sin padding, sin tope de ancho y sin los bordes
        laterales. En pantalla ancha esa columna de 1280px se leía como dos
        líneas verticales con vacío por fuera; ahora la portada ocupa todo.
      */}
      <div className="bg-background">
        <SiteHeader />

        <AdSlot zone="home-top" className="px-6 pt-6 md:px-10" />

        {lead ? (
          <>
            {/* Lo de arriba del pliegue entra al cargar; las tarjetas de abajo
                se revelan solas al entrar en pantalla (`kort-reveal`). */}
            <div className="kort-stagger grid lg:grid-cols-[1.7fr_1fr]">
              <LeadPackage
                news={lead}
                headlineHtml={settings.hero_headline_html}
                images={leadImages}
              />

              {/* El anuncio va dentro de la misma celda del grid que el
                  sidebar, no como una tercera columna: la portada son dos
                  columnas y el hueco cuelga de la derecha. */}
              <div>
                <SidebarTabs breaking={breaking} featured={featured} />
                <AdSlot zone="home-sidebar" className="px-6 pb-11 md:px-10" />
              </div>
            </div>

            {/* La barra anuncia lo que viene abajo, así que no se pinta si
                abajo no hay nada: sola se lee como una sección rota. */}
            {(grid.length > 0 || categoryRows.length > 0) && (
              <>
                <NowBar />

                <div className="px-6 pt-8 pb-2 md:px-10">
                  <CardGrid items={grid} />
                  <CategoryRows rows={categoryRows} />
                  {/* Este hueco cicla: cuando hay varias campañas vendidas
                      a media portada se van pasando en vez de quedarse una
                      fija toda la ventana de caché. */}
                  <AdSlot zone="home-mid" rotate className="mt-8" />
                </div>
              </>
            )}

            <OpinionRow items={opinion} />
          </>
        ) : (
          <div className="px-10 py-24 text-center">
            <p className="text-sm font-semibold text-muted">
              Todavía no hay noticias publicadas.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block text-xs font-extrabold tracking-[1.2px] text-accent underline"
            >
              IR AL PANEL →
            </Link>
          </div>
        )}

        <NewsletterBand label={settings.newsletter_label} title={settings.newsletter_title} />
        <SiteFooter tagline={settings.footer_tagline} />
      </div>
    </div>
  );
}
