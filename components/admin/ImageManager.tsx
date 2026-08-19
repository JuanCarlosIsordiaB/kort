"use client";

import { useRef, useState } from "react";

import { FocusPicker } from "@/components/admin/FocusPicker";
import { uploadImage } from "@/lib/upload-client";
import type { NewsImageInput } from "@/lib/types";

/**
 * Galería de una nota. Reemplazó al campo único de "Portada": ahora se sube
 * todo aquí y la **primera visible** se usa automáticamente como portada en las
 * tarjetas y al compartir, para que no haya dos cosas que mantener en sincronía.
 *
 * Las imágenes se suben al elegirlas (no al guardar la nota), así el admin ve
 * de inmediato lo que quedó y puede ordenar sobre la miniatura real.
 */
export function ImageManager({
  images,
  onChange,
}: {
  images: NewsImageInput[];
  onChange: (images: NewsImageInput[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Qué foto tiene abierto el encuadre. Solo una a la vez: abiertas todas, la
  // lista se vuelve ilegible en cuanto hay más de dos o tres imágenes.
  const [editingFocus, setEditingFocus] = useState<string | null>(null);

  const coverIndex = images.findIndex((image) => image.visible);
  const visibleCount = images.filter((image) => image.visible).length;

  async function addFiles(files: FileList) {
    setError(null);
    setUploading(files.length);

    const added: NewsImageInput[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push({
          url: await uploadImage(file),
          alt: null,
          visible: true,
          focus_x: 50,
          focus_y: 50,
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }

    if (added.length) onChange([...images, ...added]);
  }

  function patch(index: number, changes: Partial<NewsImageInput>) {
    onChange(images.map((image, i) => (i === index ? { ...image, ...changes } : image)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-[var(--radius-pill)] border border-border-strong px-4 py-2 text-xs font-bold"
        >
          Agregar imágenes
        </button>
        {uploading > 0 && (
          <span className="text-sm text-muted">Subiendo {uploading}…</span>
        )}
        <span className="text-xs text-muted">
          {images.length === 0
            ? "Sin imágenes"
            : `${images.length} en total · ${visibleCount} visible(s)` +
              (visibleCount > 1 ? " · se mostrarán en slider" : "")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm font-semibold text-orange">{error}</p>}

      {images.map((image, index) => (
        <div
          key={image.url}
          className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border p-3"
        >
          <div className="flex items-start gap-3">
            {/* Miniatura de una imagen ya subida a Supabase; <img> basta aquí. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              style={{ objectPosition: `${image.focus_x}% ${image.focus_y}%` }}
              className={`h-16 w-20 shrink-0 rounded-[var(--radius-thumb)] object-cover sm:h-20 sm:w-28 ${
                image.visible ? "" : "opacity-35 grayscale"
              }`}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={image.visible}
                    onChange={(e) => patch(index, { visible: e.target.checked })}
                  />
                  Visible
                </label>

                {index === coverIndex && (
                  <span className="rounded-[var(--radius-pill)] bg-accent px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-accent-foreground">
                    PORTADA
                  </span>
                )}

                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingFocus((current) => (current === image.url ? null : image.url))
                    }
                    aria-expanded={editingFocus === image.url}
                    title="Elegir qué parte de la foto no se recorta"
                    className={`h-8 rounded border px-2 text-xs font-bold ${
                      editingFocus === image.url
                        ? "border-border-strong bg-chip"
                        : "border-border"
                    }`}
                  >
                    Encuadre
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    title="Subir"
                    aria-label="Subir"
                    className="h-8 w-8 rounded border border-border text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    title="Bajar"
                    aria-label="Bajar"
                    className="h-8 w-8 rounded border border-border text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, i) => i !== index))}
                    className="h-8 rounded border border-border px-2 text-xs text-orange"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <input
                value={image.alt ?? ""}
                onChange={(e) => patch(index, { alt: e.target.value })}
                placeholder="Texto alternativo (describe la foto para quien no puede verla)"
                className="w-full rounded-[var(--radius-thumb)] border border-border bg-input px-2 py-1 text-sm"
              />
            </div>
          </div>

          {editingFocus === image.url && (
            <FocusPicker
              url={image.url}
              focusX={image.focus_x}
              focusY={image.focus_y}
              onChange={(focus) => patch(index, focus)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
