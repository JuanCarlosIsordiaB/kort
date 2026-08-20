"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Category, CategoryKind } from "@/lib/types";

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  /*
    El tipo viaja siempre en el `PUT`, no solo cuando se toca la casilla: el
    servidor guarda lo que reciba, así que renombrar la sección de Opinión sin
    mandarlo la devolvería a ser una sección normal.
  */
  const [editingKind, setEditingKind] = useState<CategoryKind>("noticia");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Algo salió mal");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (await send("/api/categorias", "POST", { name })) setName("");
  }

  async function saveEdit(id: string) {
    if (await send(`/api/categorias/${id}`, "PUT", { name: editingName, kind: editingKind })) {
      setEditingId(null);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`¿Eliminar la sección "${category.name}"?`)) return;
    await send(`/api/categorias/${category.id}`, "DELETE");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la sección (ej. Deportes)"
          className="min-w-0 flex-1 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="shrink-0 rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-sm font-semibold text-orange">{error}</p>}

      {initialCategories.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-border p-6 text-center text-sm text-muted">
          Todavía no hay secciones.
        </p>
      ) : (
        <ul className="rounded-[var(--radius-card)] border border-border">
          {initialCategories.map((category) => (
            // En móvil el nombre ocupa su propio renglón (`basis-full`) y los
            // botones bajan al siguiente; apretados en una sola línea el nombre
            // largo empujaba a "Eliminar" fuera de la tarjeta.
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 last:border-0"
            >
              {editingId === category.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="min-w-0 flex-1 basis-full rounded-[var(--radius-thumb)] border border-border bg-input px-2 py-1.5 text-sm sm:basis-auto"
                  />
                  <label className="flex basis-full items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editingKind === "opinion"}
                      onChange={(e) =>
                        setEditingKind(e.target.checked ? "opinion" : "noticia")
                      }
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold">Esta es la sección de Opinión</span>
                      <span className="mt-0.5 block text-muted">
                        Se lista en /opinion con las tarjetas de columnista —el
                        autor y su columna al frente— en vez del formato normal
                        de sección. Solo puede haber una.
                      </span>
                    </span>
                  </label>
                  <div className="ml-auto flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => saveEdit(category.id)}
                      disabled={pending}
                      className="py-1 text-xs font-bold underline"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="py-1 text-xs font-semibold text-muted underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 basis-full items-baseline gap-2 sm:basis-auto">
                    <span className="truncate font-semibold">{category.name}</span>
                    <code className="shrink-0 text-xs text-muted">
                      {category.kind === "opinion" ? "/opinion" : `/${category.slug}`}
                    </code>
                    {category.kind === "opinion" && (
                      <span className="shrink-0 rounded-[var(--radius-pill)] border border-accent px-2 py-0.5 text-[10px] font-extrabold tracking-[1px] text-accent">
                        OPINIÓN
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                        setEditingKind(category.kind);
                      }}
                      className="py-1 text-xs font-semibold underline"
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      disabled={pending}
                      className="py-1 text-xs font-semibold text-accent underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
