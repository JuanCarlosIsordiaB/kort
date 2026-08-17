"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Category } from "@/lib/types";

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
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
    if (await send(`/api/categorias/${id}`, "PUT", { name: editingName })) {
      setEditingId(null);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`¿Eliminar la sección "${category.name}"?`)) return;
    await send(`/api/categorias/${category.id}`, "DELETE");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la sección (ej. Deportes)"
          className="flex-1 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-sm font-semibold text-accent">{error}</p>}

      {initialCategories.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-border p-6 text-center text-sm text-muted">
          Todavía no hay secciones.
        </p>
      ) : (
        <ul className="rounded-[var(--radius-card)] border border-border">
          {initialCategories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              {editingId === category.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 rounded-[var(--radius-thumb)] border border-border bg-input px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(category.id)}
                    disabled={pending}
                    className="text-xs font-bold underline"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs font-semibold text-muted underline"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-semibold">{category.name}</span>
                  <code className="text-xs text-muted">/{category.slug}</code>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                    className="text-xs font-semibold underline"
                  >
                    Renombrar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(category)}
                    disabled={pending}
                    className="text-xs font-semibold text-accent underline"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
