import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/news/Pagination";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCategoryBySlug } from "@/lib/data/categories";
import { listPublished } from "@/lib/data/news";
import { punct } from "@/lib/punctuation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/** El número de página del listado, tolerante a `?page=abc` y a `?page=-3`. */
function pageNumber(value: string | string[] | undefined): number {
  return Math.max(1, Number(Array.isArray(value) ? value[0] : value) || 1);
}

export async function generateMetadata(
  props: PageProps<"/categoria/[slug]">,
): Promise<Metadata> {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "Sección no encontrada", robots: { index: false } };

  // La página redirige (ver abajo); los metadatos de la que redirige no se
  // llegan a usar, pero declararla `noindex` evita que un rastreador que solo
  // mire la cabecera registre esta URL como una segunda copia de /opinion.
  if (category.kind === "opinion") {
    return { title: category.name, robots: { index: false } };
  }

  const page = pageNumber(searchParams.page);

  // La canónica apunta a la página que se pidió, no siempre a la primera: si
  // todas las páginas se declararan como la 1, Google dejaría de indexar las
  // notas que solo se alcanzan desde la 2 en adelante.
  const path = `/categoria/${category.slug}${page > 1 ? `?page=${page}` : ""}`;
  const title = page > 1 ? `${category.name} — Página ${page}` : category.name;
  const description = `Últimas noticias de ${category.name} en ${SITE_NAME}: lo que pasó, en corto y al día.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: absoluteUrl(path), type: "website" },
  };
}

export default async function CategoriaPage(props: PageProps<"/categoria/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  /*
    Opinión no se pinta como una sección: tiene su propia página, con las
    tarjetas de columnista. Se redirige en vez de renderizar aquí para que la
    sección tenga una sola URL —dos listados idénticos se reparten el
    posicionamiento en lugar de sumarlo—. La página viaja para no perderla al
    saltar.
  */
  if (category.kind === "opinion") {
    const page = pageNumber(searchParams.page);
    redirect(page > 1 ? `/opinion?page=${page}` : "/opinion");
  }

  const page = pageNumber(searchParams.page);

  const { items, page: currentPage, pageCount } = await listPublished({
    page,
    categoryId: category.id,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: category.name, path: `/categoria/${category.slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        {/* El banner conserva su propio relleno: es un bloque con fondo, y sin
            él el nombre de la sección quedaría pegado a la orilla del tinte. */}
        <div className="mb-10 bg-chip px-8 py-10">
          <h1 className="text-4xl font-extrabold">{punct(category.name)}</h1>
        </div>

        <AdSlot zone="category-top" className="mb-10" />

        {items.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            Todavía no hay noticias en esta sección.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        )}

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          basePath={`/categoria/${category.slug}`}
        />
      </main>

      <SiteFooter />
    </>
  );
}
