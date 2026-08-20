import Image from "next/image";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/news/Pagination";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SocialLinks } from "@/components/site/SocialLinks";
import { listPublished } from "@/lib/data/news";
import { getReporterBySlug } from "@/lib/data/reporters";
import { initials } from "@/lib/format";
import { punct } from "@/lib/punctuation";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { socialList } from "@/lib/social";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * Todo lo que ha firmado un reportero, para el lector.
 *
 * Es el destino de la firma de cada nota. Solo enseña lo que ya es público —su
 * nombre, su foto y sus notas publicadas—: el correo, el rol y los borradores
 * son cosa del panel, y esta página no los pide (ver `lib/data/reporters.ts`).
 *
 * Cacheada e ISR como la nota: ver el comentario largo en
 * `app/noticias/[slug]/page.tsx` sobre por qué hacen falta las dos
 * exportaciones en una ruta con segmento dinámico.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

/** El número de página del listado, tolerante a `?page=abc` y a `?page=-3`. */
function pageNumber(value: string | string[] | undefined): number {
  return Math.max(1, Number(Array.isArray(value) ? value[0] : value) || 1);
}

function describe(name: string): string {
  return `Todas las noticias firmadas por ${name} en ${SITE_NAME}.`;
}

export async function generateMetadata(
  props: PageProps<"/reportero/[slug]">,
): Promise<Metadata> {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const reporter = await getReporterBySlug(slug);

  if (!reporter) return { title: "Reportero no encontrado", robots: { index: false } };

  // Redirige a /opinion/[slug] (ver abajo); `noindex` para que esta URL no
  // quede registrada como una segunda copia del perfil.
  if (reporter.is_columnist) {
    return { title: reporter.display_name, robots: { index: false } };
  }

  const page = pageNumber(searchParams.page);

  // La canónica apunta a la página que se pidió, no siempre a la primera: si
  // todas se declararan como la 1, Google dejaría de indexar las notas que solo
  // se alcanzan de la 2 en adelante.
  const path = `/reportero/${reporter.slug}${page > 1 ? `?page=${page}` : ""}`;
  const title =
    page > 1 ? `${reporter.display_name} — Página ${page}` : reporter.display_name;
  const description = describe(reporter.display_name);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "profile",
      images: reporter.avatar_url ? [reporter.avatar_url] : undefined,
    },
  };
}

export default async function ReporteroPage(props: PageProps<"/reportero/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);

  const reporter = await getReporterBySlug(slug);
  if (!reporter) notFound();

  /*
    Un columnista tiene un perfil más completo —su columna, su semblanza, sus
    redes— y una sola URL: esta redirige allá. Los enlaces internos ya usan
    `profilePath()`, así que esto es la red para las URLs viejas que alguien
    haya guardado o que sigan indexadas.
  */
  if (reporter.is_columnist) redirect(`/opinion/${reporter.slug}`);

  const page = pageNumber(searchParams.page);

  const { items, total, page: currentPage, pageCount } = await listPublished({
    page,
    authorId: reporter.id,
  });

  const path = `/reportero/${reporter.slug}`;

  const socials = socialList(reporter);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: reporter.display_name, path },
  ]);

  /*
    La misma persona que aparece como `author` en cada una de sus notas, aquí
    con página propia. Es lo que le permite a Google unir las dos cosas y
    mostrar la firma como una entidad, en vez de como un nombre suelto repetido
    en veinte artículos.
  */
  const personJsonLd = {
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: reporter.display_name,
      url: absoluteUrl(path),
      image: reporter.avatar_url ?? undefined,
      worksFor: organizationJsonLd,
      /*
        `sameAs` es el campo con el que se dice "esta persona y esas cuentas
        son la misma". Es lo que evita que la firma del sitio y su cuenta de X
        se traten como dos entidades distintas que casualmente se llaman igual.
        Sin redes se omite: un arreglo vacío no dice nada y sí es una propiedad
        más que validar.
      */
      sameAs: socials.length ? socials.map((social) => social.url) : undefined,
    },
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={personJsonLd} />

      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        {/* Mismo banner con fondo que /categoria: es la misma idea —de quién es
            todo lo que viene abajo— y conviene que se lea igual. */}
        <div className="mb-10 flex flex-wrap items-center gap-5 bg-chip px-8 py-10">
          {reporter.avatar_url ? (
            <Image
              src={reporter.avatar_url}
              alt=""
              width={192}
              height={192}
              className="h-24 w-24 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-border-strong text-xl font-extrabold text-muted"
            >
              {initials(reporter.display_name)}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold">{punct(reporter.display_name)}</h1>
            <p className="mt-2 text-sm font-semibold text-muted">
              {total === 0
                ? "Todavía sin notas publicadas"
                : `${total} ${total === 1 ? "nota publicada" : "notas publicadas"}`}
            </p>

            <SocialLinks
              source={reporter}
              name={reporter.display_name}
              className="mt-4"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            {reporter.display_name} todavía no tiene notas publicadas.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        )}

        <Pagination page={currentPage} pageCount={pageCount} basePath={path} />
      </main>

      <SiteFooter />
    </>
  );
}
