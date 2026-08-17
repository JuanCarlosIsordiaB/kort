"use client";

import { useEffect, useState } from "react";

/**
 * Botón para volver al inicio de la página. Aparece solo cuando ya bajaste lo
 * suficiente para que subir a mano sea molesto.
 */
export function BackToTop({ showAfter = 800 }: { showAfter?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    function measure() {
      frame = 0;
      setVisible(window.scrollY > showAfter);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showAfter]);

  function toTop() {
    // Con "menos movimiento" activado, el desplazamiento suave marea: salta.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Volver arriba"
      // Se mantiene montado y solo se oculta, para que la transición se vea.
      // `pointer-events-none` e `inert` evitan que se pueda tabular hacia un
      // botón invisible.
      inert={!visible}
      className={`fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-background text-lg font-bold shadow-[var(--shadow-card)] transition-all duration-200 ease-soft hover:border-foreground hover:bg-foreground hover:text-background ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
