"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { timeAgoUpper, upper } from "@/lib/format";
import type { NewsWithCategory } from "@/lib/types";

/**
 * El sidebar derecho de la portada, con las dos pestañas del diseño.
 *
 * Es el único bloque de la portada que necesita ser cliente, y solo por el
 * cambio de pestaña: las dos listas llegan ya renderizadas desde el servidor,
 * así que alternar no dispara ninguna petición.
 */
export function SidebarTabs({
  breaking,
  featured,
}: {
  breaking: NewsWithCategory[];
  featured: NewsWithCategory[];
}) {
  const [tab, setTab] = useState<"breaking" | "featured">("breaking");
  const list = tab === "breaking" ? breaking : featured;

  return (
    <div className="px-6 py-11 md:px-10">
      {/* El prototipo deja 6px aquí + 12px de cada fila = 18px. Se sube a 12px
          porque las tarjetas traen borde propio y a 18px seguían leyéndose
          pegadas al subrayado de la pestaña. */}
      <div className="mb-3 flex" role="tablist">
        <Tab active={tab === "breaking"} onClick={() => setTab("breaking")}>
          ÚLTIMO MINUTO
        </Tab>
        <Tab active={tab === "featured"} onClick={() => setTab("featured")}>
          DESTACADAS
        </Tab>
      </div>

      <div role="tabpanel">
        {list.length === 0 ? (
          <p className="mt-6 text-xs font-semibold text-muted">Nada por aquí todavía.</p>
        ) : (
          list.map((item) => (
            <Link
              key={item.id}
              href={`/noticias/${item.slug}`}
              className="mt-3 flex items-center gap-3.5 rounded-[var(--radius-card)] bg-card p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              {item.cover_image_url ? (
                <Image
                  src={item.cover_image_url}
                  alt=""
                  width={124}
                  height={124}
                  className="h-[62px] w-[62px] shrink-0 rounded-[var(--radius-thumb)] object-cover"
                />
              ) : (
                <div className="h-[62px] w-[62px] shrink-0 rounded-[var(--radius-thumb)] bg-chip" />
              )}

              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-[9px] font-extrabold tracking-[1.3px] text-muted">
                  <span className="whitespace-nowrap">{upper(item.category?.name) || "KORT"}</span>
                  <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-current" />
                  <span className="whitespace-nowrap">{timeAgoUpper(item.published_at)}</span>
                </div>
                <div className="text-sm font-bold leading-snug">{item.title}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Link
        href="/archivo"
        className="mt-4 block border-t border-border pt-3.5 text-[10px] font-extrabold tracking-[1.6px] text-muted transition-colors hover:text-foreground"
      >
        VER TODAS →
      </Link>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 border-b-[3px] pb-2.5 text-center text-[10px] font-extrabold tracking-[1.6px] transition-colors ${
        active ? "border-foreground text-foreground" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
