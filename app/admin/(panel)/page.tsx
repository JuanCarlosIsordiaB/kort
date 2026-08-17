import Link from "next/link";
import type { Metadata } from "next";

import { listCategories } from "@/lib/data/categories";
import { countAllForAdmin, listAllForAdmin } from "@/lib/data/news";
import { hasActiveFilters, parseFilters, resolveRange } from "@/lib/news-filters";
import { SITE_TIME_ZONE } from "@/lib/site";

import { NewsFilters } from "./NewsFilters";
import { NewsRowActions } from "./NewsRowActions";

export const metadata: Metadata = { title: "Noticias" };

// Con `timeZone` explícito: el servidor corre en UTC y sin esto una nota
// guardada a las 8 de la noche aparecería fechada al día siguiente.
const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

export default async function DashboardPage(props: PageProps<"/admin">) {
  const filters = parseFilters(await props.searchParams);
  const range = resolveRange(filters);

  const [news, total, categories] = await Promise.all([
    listAllForAdmin({
      q: filters.q,
      status: filters.status || undefined,
      categoryId: filters.categoryId || undefined,
      dateField: filters.dateField,
      from: range.from || undefined,
      to: range.to || undefined,
    }),
    countAllForAdmin(),
    listCategories(),
  ]);

  const filtering = hasActiveFilters(filters);

  return (
    // `group` para que los filtros puedan atenuar la lista con `data-pending`
    // mientras llega el render nuevo del servidor, sin coordinar estado.
    <div className="group">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Noticias</h1>
        <Link
          href="/admin/noticias/nueva"
          className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          Nueva noticia
        </Link>
      </header>

      <NewsFilters
        categories={categories}
        filters={filters}
        shown={news.length}
        total={total}
      />

      <div className="transition-opacity group-has-data-pending:opacity-50">
        {news.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-border p-8 text-center text-sm text-muted">
            {filtering
              ? "Ninguna noticia coincide con estos filtros."
              : "Todavía no hay noticias. Crea la primera."}
          </p>
        ) : (
          <>
            {/*
              En móvil la tabla de cinco columnas obligaba a hacer scroll lateral
              para leer una sola fila, así que ahí cada noticia sale como tarjeta
              con los mismos datos apilados.
            */}
            <ul className="flex flex-col gap-3 md:hidden">
              {news.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4"
                >
                  <p className="font-bold">{item.title}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span
                      className={`rounded-[var(--radius-pill)] px-2 py-1 font-bold ${
                        item.status === "published"
                          ? "bg-accent text-accent-foreground"
                          : "bg-chip text-muted"
                      }`}
                    >
                      {item.status === "published" ? "Publicada" : "Borrador"}
                    </span>
                    <span>{item.category?.name ?? "Sin sección"}</span>
                    <span aria-hidden>·</span>
                    <span>{dateFormat.format(new Date(item.updated_at))}</span>
                  </div>

                  <NewsRowActions id={item.id} slug={item.slug} status={item.status} />
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-border md:block">
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
          </>
        )}
      </div>
    </div>
  );
}
