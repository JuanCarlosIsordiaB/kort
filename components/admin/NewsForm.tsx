"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageManager } from "@/components/admin/ImageManager";
import { NewsPicker } from "@/components/admin/NewsPicker";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MAX_EXTRA_CATEGORIES, MAX_RECOMMENDATIONS } from "@/lib/news-input";
import type {
  Category,
  News,
  NewsImage,
  NewsImageInput,
  NewsOption,
  NewsStatus,
} from "@/lib/types";

export interface NewsFormProps {
  categories: Category[];
  /** Ausente al crear; presente al editar. */
  news?: News;
  /** Galería existente al editar, ya ordenada por posición. */
  images?: NewsImage[];
  /**
   * Las secciones guardadas de la nota, la principal incluida. El formulario
   * descuenta la principal al pintar: cuál lo es se puede cambiar sin recargar,
   * así que solo se sabe en el momento de dibujar las casillas.
   */
  sections?: string[];
  /** Picks manuales existentes al editar, en orden. */
  recommendations?: string[];
  /** Los títulos de esos picks, para pintarlos sin volver a pedirlos. */
  recommendedOptions?: NewsOption[];
}

/** El tinte de una casilla de sección, según cómo esté. */
function sectionTone(checked: boolean, disabled: boolean): string {
  if (checked) return "border-accent bg-accent text-accent-foreground";
  if (disabled) return "border-border text-muted opacity-50";
  return "border-border-strong text-muted hover:border-foreground hover:text-foreground";
}

export function NewsForm({
  categories,
  news,
  images: initialImages = [],
  sections: initialSections = [],
  recommendations: initialRecommendations = [],
  recommendedOptions = [],
}: NewsFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(news?.title ?? "");
  const [excerpt, setExcerpt] = useState(news?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(news?.category_id ?? "");
  const [sections, setSections] = useState<string[]>(initialSections);
  const [status, setStatus] = useState<NewsStatus>(news?.status ?? "draft");
  const [images, setImages] = useState<NewsImageInput[]>(
    initialImages.map((image) => ({
      url: image.url,
      alt: image.alt,
      visible: image.visible,
      focus_x: image.focus_x,
      focus_y: image.focus_y,
    })),
  );

  // El editor entrega JSON y HTML juntos en cada tecla; se guardan tal cual.
  const [content, setContent] = useState<{ json: unknown; html: string }>({
    json: news?.content ?? null,
    html: news?.content_html ?? "",
  });

  const [recommendations, setRecommendations] = useState<string[]>(initialRecommendations);

  // Lo que se sabe de cada nota recomendada, por id: lo que ya estaba puesto
  // más lo que se elija en el buscador. Los renglones se compactan al quitar
  // uno, así que el título no puede vivir dentro del selector.
  const [known, setKnown] = useState(
    () => new Map(recommendedOptions.map((option) => [option.id, option])),
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // La principal no se pinta como casilla: ya tiene su propio selector, y
  // destildarla ahí no significaría nada —el trigger de la base la vuelve a
  // meter en la tabla puente al guardar—.
  const otherCategories = categories.filter((category) => category.id !== categoryId);
  const extras = sections.filter((id) => id !== categoryId);

  function toggleSection(id: string) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  // Siempre un renglón vacío de más para poder agregar, y nunca más del tope.
  const recommendationRows = [...recommendations, ""].slice(0, MAX_RECOMMENDATIONS);

  function setRecommendation(index: number, option: NewsOption | null) {
    if (option) setKnown((prev) => new Map(prev).set(option.id, option));

    setRecommendations((prev) => {
      const next = [...prev];
      if (option) next[index] = option.id;
      else next.splice(index, 1);
      // Compacta y sin repetidos: dos veces la misma nota daría dos tarjetas
      // idénticas en el mismo artículo.
      return next.filter((value, i, all) => value && all.indexOf(value) === i);
    });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const payload = {
      title,
      excerpt,
      content: content.json,
      content_html: content.html,
      // La portada la deriva el servidor de la primera imagen visible.
      category_id: categoryId || null,
      extra_category_ids: extras,
      status,
      images,
      recommendations,
    };

    try {
      const res = await fetch(news ? `/api/noticias/${news.id}` : "/api/noticias", {
        method: news ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "No se pudo guardar");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-lg font-bold"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Extracto <span className="font-semibold normal-case">— el resumen que sale en las tarjetas</span>
        </span>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
      </label>

      {/* En una columna en móvil: lado a lado los dos selectores no cabían. */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            Sección principal
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">Sin sección</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NewsStatus)}
            className="w-full min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
          </select>
        </label>
      </div>

      {/* Fuera de la rejilla de arriba: son un número variable de casillas y al
          lado del selector de Estado se apretaban. Aquí ocupan el ancho y se
          envuelven solas. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Otras secciones{" "}
          <span className="font-semibold normal-case">
            — la nota también se lista ahí; el chip sigue siendo el de la principal
          </span>
        </span>

        {!categoryId || otherCategories.length === 0 ? (
          <p className="text-xs text-muted">
            {categoryId
              ? "No hay más secciones que elegir."
              : "Elige primero una sección principal."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map((category) => {
                const checked = extras.includes(category.id);
                // Al llegar al tope se apagan las que no están puestas, en vez
                // de aceptar el clic y recortar en el servidor: guardar menos de
                // lo que se marcó, y sin decirlo, es peor que una casilla que no
                // responde.
                const disabled = !checked && extras.length >= MAX_EXTRA_CATEGORIES;

                return (
                  <label
                    key={category.id}
                    className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
                  >
                    {/* Un <input> de verdad, escondido con sr-only y no con
                        display:none: así conserva el foco por teclado, la barra
                        espaciadora y el nombre que lee un lector de pantalla.
                        Mismo truco que el interruptor de Portada. */}
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSection(category.id)}
                      className="peer sr-only"
                    />
                    <span
                      className={`inline-flex items-center rounded-[var(--radius-pill)] border px-4 py-2 text-xs font-bold transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${sectionTone(checked, disabled)}`}
                    >
                      {category.name}
                    </span>
                  </label>
                );
              })}
            </div>

            {extras.length >= MAX_EXTRA_CATEGORIES && (
              <p className="text-xs text-muted">
                Máximo {MAX_EXTRA_CATEGORIES} secciones extra. Quita una para poder
                agregar otra.
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Imágenes{" "}
          <span className="font-semibold normal-case">
            — la primera visible es la portada; con dos o más se muestran en slider
          </span>
        </span>
        <ImageManager images={images} onChange={setImages} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Notas recomendadas dentro del texto{" "}
          <span className="font-semibold normal-case">
            — se intercalan entre los párrafos; vacío = las elige el sitio
          </span>
        </span>

        {/* La nota se excluye de su propia lista —`excludeId`—: recomendarse a
            sí misma no solo no sirve, la base lo rechaza con un CHECK. */}
        {recommendationRows.map((id, index) => (
          <NewsPicker
            key={`reco-${index}`}
            value={id}
            option={known.get(id)}
            onPick={(option) => setRecommendation(index, option)}
            categories={categories}
            excludeId={news?.id}
            ariaLabel={`Nota recomendada ${index + 1}`}
            emptyLabel="— automático (lo que diga Portada) —"
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Cuerpo</span>
        <RichTextEditor initialContent={news?.content ?? undefined} onChange={setContent} />
      </div>

      {error && <p className="text-sm font-semibold text-orange">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60 max-sm:w-full sm:py-2"
        >
          {pending ? "Guardando…" : status === "published" ? "Guardar y publicar" : "Guardar borrador"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="text-sm font-semibold text-muted underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
