"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NewsImage } from "@/lib/types";

const INTERVAL_MS = 5000;

/**
 * Galería de la nota.
 *
 * Con una sola imagen no monta nada de slider: ni controles, ni temporizador,
 * ni estado. Con dos o más, rota sola cada 5 s.
 *
 * Tres cosas que un carrusel tiene que hacer bien y casi nunca hace:
 * se pausa cuando alguien está mirando (cursor encima) o navegando (foco
 * dentro); respeta `prefers-reduced-motion` y entonces no se mueve solo; y es
 * operable con el teclado.
 */
export function NewsGallery({ images }: { images: NewsImage[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = images.length;
  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
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

  if (total === 0) return null;

  const current = images[index];

  if (total === 1) {
    return (
      <Image
        src={current.url}
        alt={current.alt ?? ""}
        width={1280}
        height={720}
        priority
        className="mt-8 h-[380px] w-full rounded-[var(--radius-hero)] object-cover shadow-[var(--shadow-card)]"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative mt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Galería de la nota, ${total} imágenes`}
    >
      <div className="relative h-[380px] w-full overflow-hidden rounded-[var(--radius-hero)] shadow-[var(--shadow-card)]">
        {images.map((image, i) => (
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            priority={i === 0}
            aria-hidden={i !== index}
            className={`object-cover transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <Arrow side="left" onClick={() => go(index - 1)} />
      <Arrow side="right" onClick={() => go(index + 1)} />

      <div className="mt-3 flex items-center justify-center gap-2">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ir a la imagen ${i + 1} de ${total}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-foreground" : "w-2 bg-border-strong hover:bg-muted"
            }`}
          />
        ))}
      </div>

      {current.alt && (
        <p className="mt-2 text-center text-xs text-muted">{current.alt}</p>
      )}
    </div>
  );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Imagen anterior" : "Imagen siguiente"}
      className={`absolute top-[190px] -translate-y-1/2 rounded-full bg-background/85 px-3 py-2 text-lg font-bold shadow-[var(--shadow-card)] transition-opacity hover:bg-background focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
