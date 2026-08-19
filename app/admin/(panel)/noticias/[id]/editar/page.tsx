import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsForm } from "@/components/admin/NewsForm";
import { listCategories } from "@/lib/data/categories";
import {
  getImagesFor,
  getNewsById,
  getRecommendationIdsFor,
  listAllForAdmin,
} from "@/lib/data/news";

export const metadata: Metadata = { title: "Editar noticia" };

export default async function EditarNoticiaPage(
  props: PageProps<"/admin/noticias/[id]/editar">,
) {
  const { id } = await props.params;

  const [news, categories, images, recommendations, all] = await Promise.all([
    getNewsById(id),
    listCategories(),
    getImagesFor(id),
    getRecommendationIdsFor(id),
    listAllForAdmin(),
  ]);
  if (!news) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Editar noticia</h1>
      {/* Solo se puede recomendar lo que el público puede abrir. */}
      <NewsForm
        categories={categories}
        news={news}
        images={images}
        recommendable={all.filter((n) => n.status === "published")}
        recommendations={recommendations}
      />
    </div>
  );
}
