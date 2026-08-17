import Link from "next/link";

import { CardGrid, CategoryRail, NowBar } from "@/components/home/CardGrid";
import { LeadPackage } from "@/components/home/LeadPackage";
import { NewsletterBand } from "@/components/home/NewsletterBand";
import { OpinionRow } from "@/components/home/OpinionRow";
import { SidebarTabs } from "@/components/home/SidebarTabs";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listCategories } from "@/lib/data/categories";
import { getHomeData } from "@/lib/data/home";

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

export default async function HomePage() {
  const [home, categories] = await Promise.all([getHomeData(), listCategories()]);
  const { settings, lead, breaking, featured, opinion, grid } = home;

  return (
    <div>
      {/*
        Sangrado completo: sin padding, sin tope de ancho y sin los bordes
        laterales. En pantalla ancha esa columna de 1280px se leía como dos
        líneas verticales con vacío por fuera; ahora la portada ocupa todo.
      */}
      <div className="bg-background">
        <SiteHeader />

        {lead ? (
          <>
            {/* Lo de arriba del pliegue entra al cargar; las tarjetas de abajo
                se revelan solas al entrar en pantalla (`kort-reveal`). */}
            <div className="kort-stagger grid lg:grid-cols-[1.7fr_1fr]">
              <LeadPackage news={lead} headlineHtml={settings.hero_headline_html} />
              <SidebarTabs breaking={breaking} featured={featured} />
            </div>

            <NowBar />

            <div className="px-6 pt-8 pb-2 md:px-10">
              <CategoryRail categories={categories} />
              <CardGrid items={grid} />
            </div>

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
