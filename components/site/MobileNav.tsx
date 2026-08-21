"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { categoryPath } from "@/lib/category-path";
import { upper } from "@/lib/format";
import type { SocialLink } from "@/lib/social";
import type { Category } from "@/lib/types";

import { SiteSocials } from "./SiteSocials";

/**
 * Las secciones del masthead en móvil.
 *
 * En pantalla angosta la fila de secciones se envolvía en dos o tres renglones y
 * el header quedaba amontonado, así que ahí se pliega detrás de este botón. El
 * desktop no lo usa: el `<nav>` del header sigue siendo el mismo de siempre.
 *
 * El panel se cierra al elegir una sección porque navegar a la misma ruta no
 * remonta el componente, y con Escape / click fuera para que no se quede
 * tapando la portada.
 */
export function MobileNav({
  categories,
  socials,
}: {
  categories: Category[];
  socials: SocialLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-border transition-colors hover:bg-chip"
      >
        {/* Tres barras que se cruzan en X al abrir: mismo botón, sin salto. */}
        <span aria-hidden className="relative block h-3.5 w-4">
          <span
            className={`absolute left-0 block h-[2px] w-full bg-current transition-transform duration-200 ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute top-1.5 left-0 block h-[2px] w-full bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-[2px] w-full bg-current transition-transform duration-200 ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="kort-drop absolute top-full right-0 left-0 z-50 border-b border-border-strong bg-background px-6 pt-2 pb-5 shadow-[var(--shadow-card)]"
        >
          <nav className="flex flex-col">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryPath(category)}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3.5 text-xs font-bold tracking-[1.4px] text-muted transition-colors hover:text-foreground"
              >
                {upper(category.name)}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/#boletin"
              onClick={() => setOpen(false)}
              className="inline-block rounded-[var(--radius-pill)] border border-foreground bg-foreground px-5 py-2.5 text-xs font-extrabold tracking-[1.2px] text-background"
            >
              SUSCRIBIRSE
            </Link>

            {/* En móvil las redes viven aquí y no en el masthead: ahí competirían
                con el logo y el botón de tema en 375px de ancho. */}
            <SiteSocials links={socials} size={20} className="flex" />
          </div>
        </div>
      )}
    </div>
  );
}
