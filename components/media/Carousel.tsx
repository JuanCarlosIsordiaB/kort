"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, RefObject } from "react";

/**
 * Las piezas compartidas de los carruseles del sitio: el estado y las dos
 * reglas de conducta que un carrusel casi nunca cumple, más los controles.
 *
 * Vive aquí y no dentro de cada galería porque la nota y la portada muestran
 * las mismas fotos con marcos distintos: lo único que cambia entre las dos es
 * la caja, no cómo se comporta.
 */

const INTERVAL_MS = 5000;

interface Carousel {
  index: number;
  /** Salta a una foto; el índice se envuelve por los dos lados. */
  go: (next: number) => void;
  /** Va en el contenedor: pausa la rotación y habilita las flechas del teclado. */
  containerProps: HTMLAttributes<HTMLDivElement> & {
    ref: RefObject<HTMLDivElement | null>;
  };
}

/**
 * Rota solo cada 5 s, pero:
 * se pausa cuando alguien está mirando (cursor encima) o navegando (foco
 * dentro); respeta `prefers-reduced-motion` y entonces no se mueve solo; y
 * responde a las flechas del teclado.
 */
export function useCarousel(total: number): Carousel {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => setIndex(total > 0 ? ((next % total) + total) % total : 0),
    [total],
  );

  useEffect(() => {
    if (total < 2 || paused) return;

    // Si el sistema pide menos movimiento, no auto-avanza: el usuario pasa las
    // fotos cuando quiera.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const id = setInterval(() => setIndex((i) => (i + 1) % total), INTERVAL_MS);
    return () => clearInterval(id);
  }, [total, paused]);

  return {
    index,
    go,
    containerProps: {
      ref,
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocusCapture: () => setPaused(true),
      onBlurCapture: (e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setPaused(false);
      },
      onKeyDown: (e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      },
    },
  };
}

/**
 * Se centra contra su padre posicionado, no contra una altura fija: el marco de
 * la nota y el de la portada no miden lo mismo y ninguno de los dos tiene por
 * qué saber de esto.
 */
export function CarouselArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Imagen anterior" : "Imagen siguiente"}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-background/85 px-3 py-2 text-lg font-bold shadow-[var(--shadow-card)] transition-opacity hover:bg-background focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

export function CarouselDots({
  total,
  index,
  onSelect,
  className = "mt-3",
  // Qué está pasando el carrusel, en el "Ir ___ 2 de 3" que oye un lector de
  // pantalla. Frase completa y no solo el sustantivo porque en español la
  // preposición cambia con el género ("a la imagen", "al anuncio").
  goToLabel = "a la imagen",
}: {
  total: number;
  index: number;
  onSelect: (i: number) => void;
  className?: string;
  goToLabel?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Ir ${goToLabel} ${i + 1} de ${total}`}
          aria-current={i === index}
          className={`h-2 rounded-full transition-all ${
            i === index ? "w-6 bg-foreground" : "w-2 bg-border-strong hover:bg-muted"
          }`}
        />
      ))}
    </div>
  );
}
