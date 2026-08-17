import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/news/Pagination";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCategoryBySlug } from "@/lib/data/categories";
import { listPublished } from "@/lib/data/news";

export async function generateMetadata(
  props: PageProps<"/categoria/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);

  return { title: category ? category.name : "Sección no encontrada" };
}

export default async function CategoriaPage(props: PageProps<"/categoria/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const pageParam = searchParams.page;
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1;

  const { items, page: currentPage, pageCount } = await listPublished({
    page,
    categoryId: category.id,
  });

  return (
    <>
      <SiteHeader />

      <main className="w-full flex-1 px-6 py-10 md:px-10">
        {/* El banner conserva su propio relleno: es un bloque con fondo, y sin
            él el nombre de la sección quedaría pegado a la orilla del tinte. */}
        <div className="mb-10 bg-chip px-8 py-10">
          <h1 className="text-4xl font-extrabold">{category.name}</h1>
        </div>

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
