import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/AdSlot";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/news/Pagination";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listPublished } from "@/lib/data/news";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const DESCRIPTION = `Todas las noticias publicadas en ${SITE_NAME}, de la más reciente a la más antigua.`;

/**
 * La canónica va por página y no siempre a `/archivo`: apuntarlas todas a la
 * primera le diría a Google que las demás son duplicados y dejaría de seguir
 * los enlaces a las notas viejas, que son justo las que solo se alcanzan desde
 * aquí.
 */
export async function generateMetadata(props: PageProps<"/archivo">): Promise<Metadata> {
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);
  const path = page > 1 ? `/archivo?page=${page}` : "/archivo";
  const title = page > 1 ? `Archivo — Página ${page}` : "Archivo";

  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path },
    openGraph: { title, description: DESCRIPTION, url: absoluteUrl(path), type: "website" },
  };
}

/** Listado completo y paginado. Es el destino de "VER TODAS" en la portada. */
export default async function ArchivoPage(props: PageProps<"/archivo">) {
  const { page: pageParam } = await props.searchParams;
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1;

  const { items, page: currentPage, pageCount, total } = await listPublished({ page });

  return (
    <>
      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        <div className="mb-8 flex items-center gap-3.5">
          <h1 className="text-[10px] font-extrabold tracking-[2px]">
            ARCHIVO — {total} {total === 1 ? "NOTA" : "NOTAS"}
          </h1>
          <div aria-hidden className="h-px flex-1 bg-border" />
        </div>

        <AdSlot zone="category-top" className="mb-10" />

        {items.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">
            Todavía no hay noticias publicadas.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        )}

        <Pagination page={currentPage} pageCount={pageCount} basePath="/archivo" />
      </main>

      <SiteFooter />
    </>
  );
}
