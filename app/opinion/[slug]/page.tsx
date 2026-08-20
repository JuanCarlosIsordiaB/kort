import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pagination } from "@/components/news/Pagination";
import { ColumnistCard } from "@/components/opinion/ColumnistCard";
import { ColumnistHeader } from "@/components/opinion/ColumnistHeader";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listOpinion } from "@/lib/data/opinion";
import { getColumnistBySlug } from "@/lib/data/reporters";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { socialList } from "@/lib/social";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * El perfil de un columnista: quién es y todo lo que ha firmado en Opinión.
 *
 * Sustituye a `/reportero/[slug]` para las cuentas marcadas como columnistas
 * —esa ruta redirige aquí— para que cada persona tenga una sola URL.
 *
 * Dinámica, no ISR, igual que `/categoria/[slug]`: el listado se pagina con
 * `?page=`, y `searchParams` es una API de request-time. Declarar `revalidate`
 * y `generateStaticParams` la marcaba como SSG, y entonces leer `searchParams`
 * al generarla reventaba con `DYNAMIC_SERVER_USAGE` — un 500 que solo aparece
 * en producción, porque en `next dev` todo se renderiza en cada petición.
 */

/** El número de página del listado, tolerante a `?page=abc` y a `?page=-3`. */
function pageNumber(value: string | string[] | undefined): number {
  return Math.max(1, Number(Array.isArray(value) ? value[0] : value) || 1);
}

export async function generateMetadata(
  props: PageProps<"/opinion/[slug]">,
): Promise<Metadata> {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const columnist = await getColumnistBySlug(slug);

  if (!columnist) return { title: "Columnista no encontrado", robots: { index: false } };

  const page = pageNumber(searchParams.page);
  const path = `/opinion/${columnist.slug}${page > 1 ? `?page=${page}` : ""}`;

  const title =
    page > 1 ? `${columnist.display_name} — Página ${page}` : columnist.display_name;

  // La semblanza es lo que la persona escribió sobre sí misma: si la puso, es
  // mejor descripción que cualquier plantilla. Se recorta porque Google no
  // enseña más allá de unos 160 caracteres.
  const description = columnist.bio
    ? columnist.bio.slice(0, 200)
    : `${columnist.column_name ? `${columnist.column_name}, la columna de ` : "Columnas de "}${columnist.display_name} en ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "profile",
      images: columnist.avatar_url ? [columnist.avatar_url] : undefined,
    },
  };
}

export default async function ColumnistaPage(props: PageProps<"/opinion/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);

  const columnist = await getColumnistBySlug(slug);
  if (!columnist) notFound();

  const page = pageNumber(searchParams.page);

  const { items, total, page: currentPage, pageCount } = await listOpinion({
    page,
    authorId: columnist.id,
  });

  const path = `/opinion/${columnist.slug}`;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Opinión", path: "/opinion" },
    { name: columnist.display_name, path },
  ]);

  /*
    La misma persona que firma como `author` cada una de sus columnas, aquí con
    página propia. `sameAs` con sus redes es lo que le permite a Google unir esa
    cuenta de X con esta firma en vez de tratarlas como dos entidades sueltas.
    Sale de `socialList` —la misma lista que pinta los enlaces visibles— para
    que el bloque de datos y el HTML nunca digan cosas distintas.
  */
  const sameAs = socialList(columnist).map((link) => link.url);

  const personJsonLd = {
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: columnist.display_name,
      url: absoluteUrl(path),
      image: columnist.avatar_url ?? undefined,
      jobTitle: columnist.column_name ?? undefined,
      description: columnist.bio ?? undefined,
      sameAs: sameAs.length ? sameAs : undefined,
      worksFor: organizationJsonLd,
    },
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={personJsonLd} />

      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        <ColumnistHeader columnist={columnist} total={total} />

        {items.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            {columnist.display_name} todavía no tiene colaboraciones publicadas.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry) => (
              <ColumnistCard key={entry.id} entry={entry} variant="profile" />
            ))}
          </div>
        )}

        <Pagination page={currentPage} pageCount={pageCount} basePath={path} />
      </main>

      <SiteFooter />
    </>
  );
}
