import type { Metadata } from "next";

import { NewsForm } from "@/components/admin/NewsForm";
import { listCategories } from "@/lib/data/categories";

export const metadata: Metadata = { title: "Nueva noticia" };

export default async function NuevaNoticiaPage() {
  const categories = await listCategories();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-3xl font-extrabold">Nueva noticia</h1>
      <NewsForm categories={categories} />
    </div>
  );
}
