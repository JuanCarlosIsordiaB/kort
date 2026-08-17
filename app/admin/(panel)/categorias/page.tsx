import type { Metadata } from "next";

import { listCategories } from "@/lib/data/categories";

import { CategoriesManager } from "./CategoriesManager";

export const metadata: Metadata = { title: "Secciones" };

export default async function CategoriasPage() {
  const categories = await listCategories();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-3xl font-extrabold">Secciones</h1>
      <p className="mb-6 text-sm text-muted">
        Las secciones que aparecen en la navegación del sitio. Puedes agregar o quitar las que
        quieras sin tocar el código.
      </p>

      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
