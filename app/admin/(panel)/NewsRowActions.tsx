"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { NewsStatus } from "@/lib/types";

export function NewsRowActions({
  id,
  slug,
  status,
}: {
  id: string;
  slug: string;
  status: NewsStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("¿Eliminar esta noticia? No se puede deshacer.")) return;

    setPending(true);
    const res = await fetch(`/api/noticias/${id}`, { method: "DELETE" });
    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "No se pudo eliminar");
      return;
    }
    router.refresh();
  }

  return (
    // `gap-4` + `py-1`: en móvil estos tres enlaces son el único control de la
    // tarjeta y con `text-xs` pegados se tocaba el equivocado.
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
      <Link href={`/admin/noticias/${id}/editar`} className="py-1 underline">
        Editar
      </Link>
      {status === "published" && (
        <Link href={`/noticias/${slug}`} className="py-1 underline text-muted" target="_blank">
          Ver
        </Link>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="py-1 underline text-accent"
      >
        {pending ? "…" : "Eliminar"}
      </button>
    </div>
  );
}
