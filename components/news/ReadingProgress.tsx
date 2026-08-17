"use client";

import { useEffect, useState } from "react";

/**
 * Riel vertical de avance de lectura, flotando cerca del borde derecho.
 *
 * Mide el avance sobre el **cuerpo de la nota**, no sobre la página completa:
 * si contara el masthead, los botones de compartir y el pie, la barra ya
 * arrancaría avanzada y llegaría al 100% antes del último párrafo.
 *
 * `targetId` es el elemento a medir; se resuelve en el efecto porque en un
 * Server Component no hay manera de pasar una ref.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;

    function measure() {
      frame = 0;
      const element = target as HTMLElement;

      const start = element.offsetTop;
      // Lo que hay que recorrer para ver el final del texto: se descuenta la
      // altura de la ventana, si no la barra nunca llegaría al 100%.
      const distance = element.offsetHeight - window.innerHeight;

      if (distance <= 0) {
        setProgress(window.scrollY > start ? 1 : 0);
        return;
      }

      const scrolled = (window.scrollY - start) / distance;
      setProgress(Math.min(1, Math.max(0, scrolled)));
    }

    // El scroll dispara muy seguido; se agrupa en un frame para no recalcular
    // el layout en cada evento.
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  const percent = Math.round(progress * 100);

  return (
    /*
      Centrado y a 60vh en vez de pegado y a pantalla completa: el hueco de 20vh
      que queda abajo es lo que lo mantiene fuera del botón de "volver arriba"
      (`fixed bottom-6 right-5`) en cualquier alto de ventana.

      El relleno va en `accent`, que es la propia tinta de la página: navy sobre
      marfil en claro, marfil sobre navy en oscuro.
    */
    <div
      role="progressbar"
      aria-label="Avance de lectura"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="fixed right-4 top-1/2 z-40 h-[60vh] max-h-[420px] w-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-border-strong sm:right-6 sm:w-2"
    >
      <div
        className="w-full rounded-full bg-accent transition-[height] duration-75 ease-out"
        style={{ height: `${percent}%` }}
      />
    </div>
  );
}
