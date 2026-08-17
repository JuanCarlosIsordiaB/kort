import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsForm } from "@/components/admin/NewsForm";
import { listCategories } from "@/lib/data/categories";
import { getImagesFor, getNewsById } from "@/lib/data/news";

export const metadata: Metadata = { title: "Editar noticia" };

export default async function EditarNoticiaPage(
  props: PageProps<"/admin/noticias/[id]/editar">,
) {
  const { id } = await props.params;

  const [news, categories, images] = await Promise.all([
    getNewsById(id),
    listCategories(),
    getImagesFor(id),
  ]);
  if (!news) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Editar noticia</h1>
      <NewsForm categories={categories} news={news} images={images} />
    </div>
  );
}
