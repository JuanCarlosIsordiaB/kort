"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageManager } from "@/components/admin/ImageManager";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MAX_RECOMMENDATIONS } from "@/lib/news-input";
import type {
  Category,
  News,
  NewsImage,
  NewsImageInput,
  NewsStatus,
  NewsWithCategory,
} from "@/lib/types";

export interface NewsFormProps {
  categories: Category[];
  /** Ausente al crear; presente al editar. */
  news?: News;
  /** Galería existente al editar, ya ordenada por posición. */
  images?: NewsImage[];
  /** Las publicadas, para poder elegir a mano qué se recomienda en el texto. */
  recommendable?: NewsWithCategory[];
  /** Picks manuales existentes al editar, en orden. */
  recommendations?: string[];
}

export function NewsForm({
  categories,
  news,
  images: initialImages = [],
  recommendable = [],
  recommendations: initialRecommendations = [],
}: NewsFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(news?.title ?? "");
  const [excerpt, setExcerpt] = useState(news?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(news?.category_id ?? "");
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

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Siempre un renglón vacío de más para poder agregar, y nunca más del tope.
  const recommendationRows = [...recommendations, ""].slice(0, MAX_RECOMMENDATIONS);

  function setRecommendation(index: number, id: string) {
    setRecommendations((prev) => {
      const next = [...prev];
      if (id) next[index] = id;
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
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Sección</span>
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

        {/* La nota se excluye de su propia lista: recomendarse a sí misma no
            solo no sirve, la base lo rechaza con un CHECK. */}
        {recommendationRows.map((id, index) => (
          <select
            key={`reco-${index}`}
            value={id}
            onChange={(e) => setRecommendation(index, e.target.value)}
            className="w-full min-w-0 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">
              {index < recommendations.length
                ? "— quitar —"
                : "— automático (lo que diga Portada) —"}
            </option>
            {recommendable
              .filter((n) => n.id !== news?.id)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.category?.name ? `[${n.category.name}] ` : ""}
                  {n.title}
                </option>
              ))}
          </select>
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
