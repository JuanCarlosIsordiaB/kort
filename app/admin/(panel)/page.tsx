import Link from "next/link";
import type { Metadata } from "next";

import { listAllForAdmin } from "@/lib/data/news";

import { NewsRowActions } from "./NewsRowActions";

export const metadata: Metadata = { title: "Noticias" };

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const news = await listAllForAdmin();

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Noticias</h1>
        <Link
          href="/admin/noticias/nueva"
          className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          Nueva noticia
        </Link>
      </header>

      {news.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-border p-8 text-center text-sm text-muted">
          Todavía no hay noticias. Crea la primera.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-chip">
              <tr>
                <th className="px-4 py-3 font-bold">Título</th>
                <th className="px-4 py-3 font-bold">Sección</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Actualizada</th>
                <th className="px-4 py-3 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {news.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold">{item.title}</td>
                  <td className="px-4 py-3 text-muted">{item.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-[var(--radius-pill)] px-2 py-1 text-xs font-bold ${
                        item.status === "published"
                          ? "bg-accent text-accent-foreground"
                          : "bg-chip text-muted"
                      }`}
                    >
                      {item.status === "published" ? "Publicada" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {dateFormat.format(new Date(item.updated_at))}
                  </td>
                  <td className="px-4 py-3">
                    <NewsRowActions id={item.id} slug={item.slug} status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
