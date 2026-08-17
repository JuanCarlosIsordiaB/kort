"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useOptimistic, useRef, useState } from "react";

import {
  DATE_FIELDS,
  EMPTY_FILTERS,
  NO_CATEGORY,
  RANGE_PRESETS,
  filtersToQuery,
  hasActiveFilters,
  type NewsFilters as Filters,
} from "@/lib/news-filters";
import type { Category } from "@/lib/types";

/** Lo que tarda en dispararse la búsqueda después de la última tecla. */
const DEBOUNCE_MS = 300;

/**
 * Controles de búsqueda y filtrado del listado del panel.
 *
 * El estado real vive en la query string: cada cambio navega y el servidor
 * vuelve a consultar ya filtrado. Eso es lo que hace que el filtro sobreviva al
 * `router.refresh()` de borrar una nota, y evita traer la tabla entera al
 * cliente nada más para esconder filas.
 *
 * `useOptimistic` pinta el control elegido en el mismo frame del click, porque
 * si no el `<select>` se regresaría al valor de la URL hasta que termine la
 * navegación. Mientras esa transición corre, el `data-pending` de la raíz deja
 * que la lista se atenúe sola desde CSS.
 */
export function NewsFilters({
  categories,
  filters,
  shown,
  total,
}: {
  categories: Category[];
  filters: Filters;
  /** Cuántas noticias quedaron después de filtrar. */
  shown: number;
  /** Cuántas hay en total, sin filtros. */
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [optimistic, setOptimistic] = useOptimistic(filters);
  const [pending, setPending] = useOptimistic(false);

  // La caja de texto necesita eco local en cada tecla, así que es la única que
  // no sale de `optimistic`: un valor optimista se revierte entre transiciones y
  // el input parpadearía mientras se escribe.
  const [term, setTerm] = useState(filters.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(patch: Partial<Filters>) {
    const next = { ...optimistic, ...patch };
    startTransition(() => {
      setOptimistic(next);
      setPending(true);
      // `replace` y no `push`: con la búsqueda escribiendo cada 300 ms, `push`
      // llenaría el historial y el botón de atrás dejaría de servir.
      router.replace(`${pathname}?${filtersToQuery(next)}`, { scroll: false });
    });
  }

  function search(value: string) {
    setTerm(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ q: value.trim() }), DEBOUNCE_MS);
  }

  /** Enter no espera al debounce. */
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounce.current) clearTimeout(debounce.current);
    apply({ q: term.trim() });
  }

  function clearAll() {
    if (debounce.current) clearTimeout(debounce.current);
    setTerm("");
    startTransition(() => {
      setOptimistic(EMPTY_FILTERS);
      setPending(true);
      router.replace(pathname, { scroll: false });
    });
  }

  const active = hasActiveFilters(optimistic);
  const custom = optimistic.preset === "personalizado";

  return (
    <div
      data-pending={pending ? "" : undefined}
      className="mb-6 flex flex-col gap-3 rounded-[var(--radius-card)] border border-border p-3 sm:p-4"
    >
      <form onSubmit={submit} role="search" className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        >
          ⌕
        </span>
        <input
          type="search"
          value={term}
          onChange={(e) => search(e.target.value)}
          placeholder="Buscar por título o extracto…"
          aria-label="Buscar noticias"
          className="w-full rounded-[var(--radius-pill)] border border-border bg-input py-2.5 pr-3 pl-8 text-sm"
        />
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Sección
          </span>
          <select
            value={optimistic.categoryId}
            onChange={(e) => apply({ categoryId: e.target.value })}
            className="w-full min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">Todas las secciones</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={NO_CATEGORY}>Sin sección</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Estado
          </span>
          <select
            value={optimistic.status}
            onChange={(e) => apply({ status: e.target.value as Filters["status"] })}
            className="w-full min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">Publicadas y borradores</option>
            <option value="published">Solo publicadas</option>
            <option value="draft">Solo borradores</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Fecha
        </span>
        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((range) => {
            const on = optimistic.preset === range.value;
            return (
              <button
                key={range.value || "todas"}
                type="button"
                aria-pressed={on}
                onClick={() => apply({ preset: range.value })}
                className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-bold transition-colors ${
                  on
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:bg-chip"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* El campo de fecha solo cambia algo si hay un rango que aplicar. */}
      {optimistic.preset && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Contar por
            </span>
            <select
              value={optimistic.dateField}
              onChange={(e) => apply({ dateField: e.target.value as Filters["dateField"] })}
              className="min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
            >
              {DATE_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>

          {custom && (
            <>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Desde
                </span>
                <input
                  type="date"
                  value={optimistic.from}
                  onChange={(e) => apply({ from: e.target.value })}
                  className="min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Hasta
                </span>
                <input
                  type="date"
                  value={optimistic.to}
                  min={optimistic.from || undefined}
                  onChange={(e) => apply({ to: e.target.value })}
                  className="min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs font-semibold text-muted">
        <span>
          {active ? `${shown} de ${total} noticias` : `${total} noticias`}
          {pending && " · buscando…"}
        </span>
        {active && (
          <button type="button" onClick={clearAll} className="py-1 underline hover:text-foreground">
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
