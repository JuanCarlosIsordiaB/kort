import Image from "next/image";

import { initials } from "@/lib/format";

/**
 * La foto del columnista, o sus iniciales.
 *
 * Es el elemento que más se repite en la sección —tarjeta, tira y cabecera—, y
 * las tres lo quieren del mismo tamaño relativo pero con medidas distintas, así
 * que el tamaño entra por prop. Redondo, a diferencia del avatar cuadrado de
 * `OpinionRow`: aquí la persona es el sujeto de la tarjeta, no un adorno de la
 * fila, y el círculo es lo que la lee como retrato.
 */
export function ColumnistAvatar({
  src,
  name,
  size,
  className = "",
}: {
  src: string | null;
  name: string | null;
  /** Lado en px. El `sizes` de la imagen se sirve al doble, para pantallas 2x. */
  size: number;
  className?: string;
}) {
  const box = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size * 2}
        height={size * 2}
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: Math.round(size * 0.32) }}
      className={`flex shrink-0 items-center justify-center rounded-full border border-accent bg-background font-extrabold tracking-wide text-accent ${className}`}
    >
      {initials(name)}
    </span>
  );
}
