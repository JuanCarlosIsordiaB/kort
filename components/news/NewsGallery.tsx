"use client";

import Image from "next/image";

import { CarouselArrow, CarouselDots, useCarousel } from "@/components/media/Carousel";
import { focusStyle } from "@/lib/image-focus";
import type { NewsImage } from "@/lib/types";

/**
 * Galería de la nota.
 *
 * Con una sola imagen no monta nada de slider: ni controles, ni temporizador.
 * Con dos o más rota sola; las reglas de la rotación viven en `useCarousel`,
 * compartidas con el carrusel del lead de la portada.
 */
export function NewsGallery({ images }: { images: NewsImage[] }) {
  const total = images.length;
  const { index, go, containerProps } = useCarousel(total);

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
        style={focusStyle(current.focus_x, current.focus_y)}
        className="mt-8 h-[380px] w-full rounded-[var(--radius-hero)] object-cover shadow-[var(--shadow-card)]"
      />
    );
  }

  return (
    <div
      {...containerProps}
      className="group mt-8"
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Galería de la nota, ${total} imágenes`}
    >
      <div className="relative">
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
              style={focusStyle(image.focus_x, image.focus_y)}
              className={`object-cover transition-opacity duration-500 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <CarouselArrow side="left" onClick={() => go(index - 1)} />
        <CarouselArrow side="right" onClick={() => go(index + 1)} />
      </div>

      <CarouselDots total={total} index={index} onSelect={go} />

      {current.alt && (
        <p className="mt-2 text-center text-xs text-muted">{current.alt}</p>
      )}
    </div>
  );
}
