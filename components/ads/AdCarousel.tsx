"use client";

import Image from "next/image";

import { CarouselDots, useCarousel } from "@/components/media/Carousel";

/**
 * Un hueco con varias campañas vendidas: las pasa una tras otra en vez de
 * dejar una fija.
 *
 * Es lo único de publicidad que corre en el cliente, y solo se monta cuando de
 * verdad hay más de un anuncio en la zona (ver `AdSlot`). Con uno solo la
 * portada sigue siendo HTML puro.
 *
 * El comportamiento —cada 5 s, en pausa mientras el cursor esté encima o el
 * foco dentro, quieto si el sistema pide menos movimiento, y las flechas del
 * teclado— es el mismo `useCarousel` de la galería de las notas. Un anuncio no
 * tiene por qué moverse distinto al resto del sitio, y menos escaparse justo
 * cuando alguien iba a hacerle clic.
 */

/**
 * A propósito no recibe el `Ad` completo: lo que se le pasa a un componente de
 * cliente viaja en el HTML, y `notes` son apuntes internos del vendedor que
 * nunca deben salir al público.
 */
export interface AdSlide {
  id: string;
  image_url: string;
  alt: string | null;
  advertiser: string;
}

export function AdCarousel({
  ads,
  width,
  height,
}: {
  ads: AdSlide[];
  width: number;
  height: number;
}) {
  const total = ads.length;
  const { index, go, containerProps } = useCarousel(total);

  return (
    <div
      {...containerProps}
      className="w-full"
      style={{ maxWidth: width }}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Publicidad, ${total} anuncios`}
    >
      {/*
        La caja se reserva con la proporción de la zona, no con la altura de la
        imagen: las campañas van encimadas en absoluto para poder fundirse una
        con otra, así que sin esto el hueco mediría cero y la portada daría un
        salto al montar.
      */}
      <div
        className="relative w-full overflow-hidden rounded-[var(--radius-card)]"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {ads.map((ad, i) => (
          <a
            key={ad.id}
            href={`/api/anuncios/${ad.id}/click`}
            target="_blank"
            rel="noopener noreferrer sponsored"
            // La que no está a la vista no existe para nadie: ni la lee un
            // lector de pantalla, ni la alcanza el tabulador, ni se le puede
            // hacer clic a través del fundido.
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
            className={`absolute inset-0 transition-opacity duration-500 ease-soft hover:opacity-90 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={ad.image_url}
              alt={ad.alt ?? `Anuncio de ${ad.advertiser}`}
              fill
              sizes={`${width}px`}
              // `unoptimized` por lo mismo que en el hueco fijo: el optimizador
              // mata la animación de un GIF y el creativo ya llega en su
              // tamaño final.
              unoptimized
              // `contain` y no `cover`: si un anunciante entrega una medida que
              // no es la de la zona, se ve completa en vez de recortada.
              className="object-contain"
            />
          </a>
        ))}
      </div>

      {/*
        Los puntos no son decorativos: son la salida para quien quiere volver a
        un anuncio que ya pasó, y la señal de que hay más de uno.
      */}
      <CarouselDots
        total={total}
        index={index}
        onSelect={go}
        className="mt-2"
        goToLabel="al anuncio"
      />
    </div>
  );
}
