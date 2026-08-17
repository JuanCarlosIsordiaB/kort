"use client";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * Botón de tema. Pill con etiqueta en desktop, circular "◐" en móvil, como
 * pide el handoff de diseño.
 *
 * No usa estado de React a propósito. La etiqueta la resuelve el CSS a partir
 * del tema activo (ver `[data-theme-when]` en globals.css), así que dice lo
 * correcto desde el primer pintado —incluso antes de hidratar— y no hay
 * desajuste de hidratación que suprimir. El click solo escribe el atributo y
 * guarda la preferencia; el resto lo hacen las variables CSS.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;

    // Sin atributo, el tema activo es el del sistema.
    const explicit = root.dataset.theme as Theme | undefined;
    const resolved: Theme =
      explicit ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    const next: Theme = resolved === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage bloqueado: el tema aplica igual, solo no se recuerda.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-border text-[13px] font-bold transition-colors hover:bg-chip max-sm:h-9 max-sm:w-9 sm:px-4 sm:py-2 ${className}`}
    >
      {/* Visible solo en móvil: el glifo del handoff. */}
      <span aria-hidden className="sm:hidden">
        ◐
      </span>

      {/*
        Cada span se muestra u oculta por CSS según el tema activo. Los que
        quedan en `display:none` salen del árbol de accesibilidad, así que el
        nombre accesible del botón es siempre el de la etiqueta visible.
      */}
      <span data-theme-when="light" className="max-sm:sr-only">
        Modo oscuro
      </span>
      <span data-theme-when="dark" className="max-sm:sr-only">
        Modo claro
      </span>
    </button>
  );
}
