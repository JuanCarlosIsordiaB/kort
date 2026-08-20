import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { Pagination } from "@/components/news/Pagination";
import { ColumnistCard } from "@/components/opinion/ColumnistCard";
import { ColumnistStrip } from "@/components/opinion/ColumnistStrip";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listOpinion } from "@/lib/data/opinion";
import { listColumnists } from "@/lib/data/reporters";
import { punct } from "@/lib/punctuation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * La sección de Opinión.
 *
 * Vive fuera de `/categoria/[slug]` porque no se pinta como una sección: aquí
 * el sujeto de cada tarjeta es el columnista, no la nota. Qué sección es la de
 * Opinión lo decide `categories.kind` desde el panel, no una constante — el
 * sitio no tiene ningún slug quemado en el código.
 */
export const revalidate = 300;

/** El número de página del listado, tolerante a `?page=abc` y a `?page=-3`. */
function pageNumber(value: string | string[] | undefined): number {
  return Math.max(1, Number(Array.isArray(value) ? value[0] : value) || 1);
}

const DESCRIPTION = `Columnas y análisis de los colaboradores de ${SITE_NAME}.`;

export async function generateMetadata(props: PageProps<"/opinion">): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const page = pageNumber(searchParams.page);

  // La canónica apunta a la página que se pidió, no siempre a la primera: si
  // todas se declararan como la 1, Google dejaría de indexar las colaboraciones
  // que solo se alcanzan de la 2 en adelante.
  const path = `/opinion${page > 1 ? `?page=${page}` : ""}`;
  const title = page > 1 ? `Opinión — Página ${page}` : "Opinión";

  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path },
    openGraph: { title, description: DESCRIPTION, url: absoluteUrl(path), type: "website" },
  };
}

export default async function OpinionPage(props: PageProps<"/opinion">) {
  const searchParams = await props.searchParams;
  const page = pageNumber(searchParams.page);

  const [{ items, category, page: currentPage, pageCount }, columnists] = await Promise.all([
    listOpinion({ page }),
    listColumnists(),
  ]);

  // Nadie ha marcado una sección como la de Opinión: la página no existe
  // todavía, y un 404 es más honesto que un listado permanentemente vacío.
  if (!category) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: category.name, path: "/opinion" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        <div className="mb-10 bg-chip px-8 py-10">
          <h1 className="text-4xl font-extrabold">{punct(category.name)}</h1>
          <p className="mt-2 text-sm font-semibold text-muted">{DESCRIPTION}</p>
        </div>

        <ColumnistStrip columnists={columnists} />

        <AdSlot zone="category-top" className="mb-10" />

        {items.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            Todavía no hay colaboraciones publicadas.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry) => (
              <ColumnistCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <Pagination page={currentPage} pageCount={pageCount} basePath="/opinion" />
      </main>

      <SiteFooter />
    </>
  );
}
