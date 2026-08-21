import type { ReactNode } from "react";

import type { SocialId } from "@/lib/social";

/**
 * Los logotipos de las redes, dibujados aquí mismo.
 *
 * El proyecto no tenía un solo SVG ni librería de iconos, y traer una entera
 * (`lucide`, `react-icons`) por siete glifos habría metido cientos de kilobytes
 * y una dependencia que actualizar para siempre. Cada marca son unos cientos de
 * bytes de `<path>` que van en el HTML del servidor: sin petición extra, sin
 * parpadeo y sin JavaScript.
 *
 * Todos pintan con `currentColor`, así que heredan el color del texto y
 * cambian solos con el tema claro/oscuro. Ninguno lleva `<title>`: el nombre
 * accesible lo pone el `<a>` que los envuelve, y repetirlo aquí haría que un
 * lector de pantalla dijera "Instagram Instagram".
 *
 * Las tres de trazo (Instagram, LinkedIn, Sitio web) usan `vector-effect` para
 * que la línea no engorde al escalar el icono.
 */

interface Glyph {
  /** El contenido del <svg>. */
  body: ReactNode;
  /** Marcas de línea en vez de silueta rellena. */
  stroke?: boolean;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const GLYPHS: Record<SocialId, Glyph> = {
  x: {
    body: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    ),
  },
  facebook: {
    body: (
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    ),
  },
  instagram: {
    stroke: true,
    body: (
      <>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.25" />
        <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
      </>
    ),
  },
  tiktok: {
    body: (
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.3v13.2a2.59 2.59 0 1 1-1.85-2.48v-3.4a5.9 5.9 0 1 0 5.15 5.85V8.99a7.55 7.55 0 0 0 4.4 1.41V7.1a4.29 4.29 0 0 1-3.35-1.28z" />
    ),
  },
  youtube: {
    body: (
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    ),
  },
  linkedin: {
    body: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
  web: {
    stroke: true,
    body: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M2.5 12h19" />
        <path d="M12 2.5c2.5 2.6 3.75 6.1 3.75 9.5s-1.25 6.9-3.75 9.5c-2.5-2.6-3.75-6.1-3.75-9.5S9.5 5.1 12 2.5z" />
      </>
    ),
  },
};

export function SocialIcon({ id, size = 18 }: { id: SocialId; size?: number }) {
  const glyph = GLYPHS[id];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      {...(glyph.stroke ? { ...STROKE, vectorEffect: "non-scaling-stroke" } : { fill: "currentColor" })}
    >
      {glyph.body}
    </svg>
  );
}
