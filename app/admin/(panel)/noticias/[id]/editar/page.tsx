import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NewsForm } from "@/components/admin/NewsForm";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { canEditNews } from "@/lib/auth/news-access";
import { getCurrentAdmin } from "@/lib/auth/session";
import { listCategories } from "@/lib/data/categories";
import {
  getCategoryIdsFor,
  getImagesFor,
  getNewsById,
  getRecommendationIdsFor,
  listNewsOptionsByIds,
} from "@/lib/data/news";

export const metadata: Metadata = { title: "Editar noticia" };

export default async function EditarNoticiaPage(
  props: PageProps<"/admin/noticias/[id]/editar">,
) {
  const { id } = await props.params;

  const admin = await getCurrentAdmin();
  if (!admin) redirect(LOGIN_PATH);

  const [news, categories, images, sections, recommendations] = await Promise.all([
    getNewsById(id),
    listCategories(),
    getImagesFor(id),
    getCategoryIdsFor(id),
    getRecommendationIdsFor(id),
  ]);
  if (!news) notFound();

  // La nota de otro reportero no se abre ni escribiendo la URL a mano. Va al
  // listado y no a un 404: el enlace es válido, simplemente no es su nota.
  if (!canEditNews(admin, news)) redirect("/admin");

  // Solo los títulos de las que ya están recomendadas; el resto lo busca el
  // selector contra el servidor en vez de venir todo el catálogo en el HTML.
  const recommendedOptions = await listNewsOptionsByIds(recommendations);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Editar noticia</h1>
      {/* Solo se puede recomendar lo que el público puede abrir, y ahí sí
          entra la redacción completa: recomendar una nota no es editarla. Las
          dos reglas las aplica /api/noticias/buscar. */}
      <NewsForm
        categories={categories}
        news={news}
        images={images}
        sections={sections}
        recommendations={recommendations}
        recommendedOptions={recommendedOptions}
      />
    </div>
  );
}
