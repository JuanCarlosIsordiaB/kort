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
    <div className="flex items-center gap-3 text-xs font-semibold">
      <Link href={`/admin/noticias/${id}/editar`} className="underline">
        Editar
      </Link>
      {status === "published" && (
        <Link href={`/noticias/${slug}`} className="underline text-muted" target="_blank">
          Ver
        </Link>
      )}
      <button type="button" onClick={remove} disabled={pending} className="underline text-accent">
        {pending ? "…" : "Eliminar"}
      </button>
    </div>
  );
}
