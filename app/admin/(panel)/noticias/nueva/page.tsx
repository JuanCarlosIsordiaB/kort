import type { Metadata } from "next";

import { NewsForm } from "@/components/admin/NewsForm";
import { listCategories } from "@/lib/data/categories";
import { listAllForAdmin } from "@/lib/data/news";

export const metadata: Metadata = { title: "Nueva noticia" };

export default async function NuevaNoticiaPage() {
  const [categories, news] = await Promise.all([listCategories(), listAllForAdmin()]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Nueva noticia</h1>
      {/* Solo se puede recomendar lo que el público puede abrir. */}
      <NewsForm
        categories={categories}
        recommendable={news.filter((n) => n.status === "published")}
      />
    </div>
  );
}
