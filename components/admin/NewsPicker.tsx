"use client";

import { useEffect, useRef, useState } from "react";

import { NEWS_OPTIONS_LIMIT, NO_CATEGORY } from "@/lib/news-filters";
import { SITE_TIME_ZONE } from "@/lib/site";
import type { Category, NewsOption } from "@/lib/types";

/** Lo que tarda en dispararse la búsqueda después de la última tecla. */
const DEBOUNCE_MS = 250;

// Con `timeZone` explícito, como en el listado: el servidor corre en UTC y sin
// esto una nota de las 8 de la noche saldría fechada al día siguiente.
const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

/**
 * Selector de una nota, con buscador.
 *
 * Reemplaza al `<select>` que pintaba el catálogo completo. Ese control aguanta
 * mientras haya cien notas; con el archivo de un diario encima se vuelve un
 * scroll interminable por el que hay que pasar leyendo título por título, y
 * además viaja entero en el HTML del panel cada vez que se abre la página.
 *
 * Aquí la lista arranca con lo último publicado —que es lo que casi siempre se
 * busca— y todo lo anterior se alcanza escribiendo: la consulta la resuelve el
 * servidor, así que el archivo puede crecer sin que este control cambie.
 *
 * No guarda la nota elegida en estado propio: la devuelve entera por `onPick` y
 * la recibe de vuelta en `option`. Es lo que deja que el padre reordene los
 * renglones —las flechas de la portada intercambian ids entre selectores— sin
 * que a uno se le quede pegado el título del otro.
 */
export function NewsPicker({
  value,
  option,
  onPick,
  categories,
  excludeId,
  emptyLabel,
  ariaLabel,
}: {
  /** Id elegido, o `""` si no hay ninguno. */
  value: string;
  /** La nota de `value`, si el padre ya la conoce. */
  option?: NewsOption;
  /** `null` = se quitó la elección. */
  onPick: (option: NewsOption | null) => void;
  categories: Category[];
  /** La nota que se está editando: no puede elegirse a sí misma. */
  excludeId?: string;
  /** Qué dice el botón cuando no hay nada elegido, y qué significa eso. */
  emptyLabel: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [section, setSection] = useState("");

  const [results, setResults] = useState<NewsOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Renglón resaltado por teclado; -1 = ninguno. */
  const [cursor, setCursor] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // La búsqueda solo corre con el panel abierto: cerrado no hay nada que
  // pintar, y si no los cuatro selectores de la portada dispararían su consulta
  // nada más cargar la página.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();

    // Sin término no hay nada que esperar: al abrir, la lista sale de una.
    // El "Buscando…" se prende dentro del temporizador, no aquí: marcarlo en el
    // cuerpo del efecto encadena un render de más por cada tecla.
    const timer = setTimeout(
      () => {
        setLoading(true);
        setFailed(false);

        void (async () => {
          try {
            const params = new URLSearchParams();
            if (term.trim()) params.set("q", term.trim());
            if (section) params.set("seccion", section);
            if (excludeId) params.set("excluir", excludeId);

            const res = await fetch(`/api/noticias/buscar?${params}`, {
              signal: controller.signal,
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "no se pudo buscar");

            if (cancelled) return;
            setResults(body.news ?? []);
            setCursor(-1);
          } catch {
            // Una petición abortada no es un error que enseñar: la reemplazó
            // otra tecla, y el resultado que vale es el de la nueva.
            if (cancelled) return;
            setFailed(true);
            setResults([]);
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      },
      term ? DEBOUNCE_MS : 0,
    );

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, term, section, excludeId]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Clic fuera = cerrar. `pointerdown` y no `click` para que cerrar el panel no
  // dispare de pasada lo que haya debajo.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // El renglón resaltado tiene que verse: la lista hace scroll y con las
  // flechas se sale de vista a los pocos pasos.
  useEffect(() => {
    if (cursor < 0) return;
    const active = listRef.current?.querySelector("[data-active]");
    active?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(picked: NewsOption | null) {
    onPick(picked);
    setTerm("");
    close();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      // Siempre, haya renglón resaltado o no: este control vive dentro del
      // formulario de la nota, y un Enter suelto ahí guardaría el artículo a
      // media búsqueda.
      event.preventDefault();
      if (cursor >= 0 && results[cursor]) pick(results[cursor]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  /** Hay un id guardado, pero su nota ya no está publicada (o se borró). */
  const missing = Boolean(value) && !option;

  return (
    <div ref={rootRef} className="relative w-full min-w-0 flex-1">
      {/* `min-w-0` con `truncate`: si no, el titular más largo estira el botón
          hasta desbordar la pantalla en móvil. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-left text-sm"
      >
        <span className="min-w-0 flex-1 truncate">
          {!value ? (
            <span className="text-muted">{emptyLabel}</span>
          ) : option ? (
            <>
              {option.category?.name && (
                <span className="text-muted">[{option.category.name}] </span>
              )}
              {option.title}
            </>
          ) : (
            <span className="text-orange">Nota no disponible — elige otra</span>
          )}
        </span>
        <span aria-hidden className="shrink-0 text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-[var(--radius-card)] border border-border bg-background shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-2 border-b border-border p-2">
            {/* `type="text"` y no `type="search"`: la equis del navegador se
                come el Escape que cierra el panel. */}
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar por título o extracto…"
              aria-label="Buscar una nota"
              className="w-full rounded-[var(--radius-pill)] border border-border bg-input px-3 py-2 text-sm"
            />
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              aria-label="Filtrar por sección"
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
          </div>

          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto"
          >
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-muted hover:bg-chip"
                >
                  — quitar —
                </button>
              </li>
            )}

            {results.map((news, index) => (
              <li key={news.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={news.id === value}
                  data-active={index === cursor ? "" : undefined}
                  onPointerEnter={() => setCursor(index)}
                  onClick={() => pick(news)}
                  className={`flex w-full flex-col gap-0.5 border-t border-border px-3 py-2 text-left ${
                    index === cursor ? "bg-chip" : ""
                  } ${news.id === value ? "font-bold" : ""}`}
                >
                  <span className="text-sm">{news.title}</span>
                  <span className="text-[11px] text-muted">
                    {news.category?.name ?? "Sin sección"} ·{" "}
                    {dateFormat.format(new Date(news.published_at ?? news.updated_at))}
                  </span>
                </button>
              </li>
            ))}

            {!loading && results.length === 0 && (
              <li className="border-t border-border px-3 py-4 text-center text-xs text-muted">
                {failed
                  ? "No se pudo buscar. Inténtalo otra vez."
                  : "Ninguna nota publicada coincide."}
              </li>
            )}
          </ul>

          <p className="border-t border-border bg-chip px-3 py-2 text-[11px] font-semibold text-muted">
            {loading
              ? "Buscando…"
              : !term.trim()
                ? "Lo último publicado. Escribe para buscar en todo el archivo."
                : results.length >= NEWS_OPTIONS_LIMIT
                  ? `Las ${NEWS_OPTIONS_LIMIT} más recientes que coinciden. Afina la búsqueda si falta la tuya.`
                  : `${results.length} ${results.length === 1 ? "resultado" : "resultados"}.`}
          </p>
        </div>
      )}

      {missing && (
        <p className="mt-1 text-[11px] text-orange">
          La nota que estaba aquí ya no está publicada, así que este lugar sale vacío.
        </p>
      )}
    </div>
  );
}
