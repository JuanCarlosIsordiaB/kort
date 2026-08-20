import type { Metadata } from "next";

import { requirePanelPermission } from "@/lib/auth/session";
import { listCategories } from "@/lib/data/categories";

import { CategoriesManager } from "./CategoriesManager";

export const metadata: Metadata = { title: "Secciones" };

export default async function CategoriasPage() {
  await requirePanelPermission("secciones");

  const categories = await listCategories();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Secciones</h1>
      <p className="mb-6 text-sm text-muted">
        Las secciones que aparecen en la navegación del sitio. Puedes agregar o quitar las que
        quieras sin tocar el código.
      </p>

      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
