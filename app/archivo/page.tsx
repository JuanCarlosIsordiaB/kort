import type { Metadata } from "next";

import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/news/Pagination";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteSettings } from "@/lib/data/home";
import { listPublished } from "@/lib/data/news";

export const metadata: Metadata = { title: "Archivo" };

/** Listado completo y paginado. Es el destino de "VER TODAS" en la portada. */
export default async function ArchivoPage(props: PageProps<"/archivo">) {
  const { page: pageParam } = await props.searchParams;
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1;

  const [{ items, page: currentPage, pageCount, total }, settings] = await Promise.all([
    listPublished({ page }),
    getSiteSettings(),
  ]);

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

      <SiteFooter tagline={settings.footer_tagline} />
    </>
  );
}
