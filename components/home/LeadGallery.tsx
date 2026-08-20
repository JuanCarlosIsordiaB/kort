"use client";

import Image from "next/image";
import Link from "next/link";

import { CarouselDots, useCarousel } from "@/components/media/Carousel";
import { focusStyle } from "@/lib/image-focus";
import type { NewsImage } from "@/lib/types";

/**
 * La foto grande de la portada cuando la nota principal trae más de una.
 *
 * Antes la portada solo enseñaba la primera —el resto de la galería solo se
 * veía entrando a la nota—, así que una nota con dos fotos dejaba la mitad de
 * su material escondido.
 *
 * Pasa sola cada 5 s y no lleva flechas: la portada ya está llena de cosas en
 * las que hacer clic y la foto no tiene que competir con el titular ni con el
 * botón de la nota.
 *
 * Los puntos sí se quedan, y son botones de verdad: cuando el sistema pide
 * menos movimiento la rotación no arranca, así que sin ellos la segunda foto
 * sería inalcanzable desde la portada.
 *
 * El marco es un enlace a la nota y los puntos van por fuera, no dentro: un
 * <button> dentro de un <a> no es HTML válido, y de todos modos cambiar de foto
 * no debe navegar a ningún lado.
 */
export function LeadGallery({ images, href }: { images: NewsImage[]; href: string }) {
  const total = images.length;
  const { index, go, containerProps } = useCarousel(total);

  return (
    <div
      {...containerProps}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Fotos de la nota principal, ${total} imágenes`}
    >
      <Link
        href={href}
        className="relative block h-[320px] w-full overflow-hidden rounded-[var(--radius-hero)] shadow-[var(--shadow-card)]"
      >
        {images.map((image, i) => (
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt ?? ""}
            fill
            // La foto del lead está arriba del pliegue y es la imagen más
            // grande de la portada: casi siempre es el LCP.
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority={i === 0}
            aria-hidden={i !== index}
            style={focusStyle(image.focus_x, image.focus_y)}
            className={`object-cover transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </Link>

      <CarouselDots total={total} index={index} onSelect={go} />
    </div>
  );
}
