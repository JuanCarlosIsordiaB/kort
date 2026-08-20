import { socialList, type SocialFields } from "@/lib/social";

/**
 * Las redes de quien firma, bajo su nombre.
 *
 * Recibe la fila entera —`PublicReporter` ya trae las siete columnas— en vez de
 * una lista ya armada: así ninguna página tiene que saber qué columna es qué
 * red ni en qué orden van. `socialList` decide las dos cosas, y de paso vuelve
 * a comprobar que cada URL sea http/https antes de que aquí se convierta en un
 * `href`.
 *
 * Píldoras de texto y no iconos: el sitio no tiene librería de iconos ni un
 * solo SVG de marca, y meter siete logotipos por esto sería estrenar una
 * dependencia visual entera. El nombre escrito además se lee igual en un lector
 * de pantalla, sin `aria-label` que mantener.
 */

const LINK_CLASS =
  "rounded-[var(--radius-pill)] border border-border-strong px-4 py-2 text-[11px] font-extrabold tracking-[1.2px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background";

export function SocialLinks({
  source,
  name,
  className = "",
}: {
  source: Partial<SocialFields> | null | undefined;
  /** De quién son, para el lector de pantalla. */
  name: string;
  className?: string;
}) {
  const links = socialList(source);
  if (links.length === 0) return null;

  return (
    <ul
      aria-label={`Redes de ${name}`}
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {links.map((link) => (
        <li key={link.id}>
          {/*
            `rel="me"` es lo que declara que esa cuenta es de esta misma
            persona; es el par del `sameAs` del JSON-LD, para quien lee el HTML
            en vez del bloque de datos. `noopener noreferrer` porque abre en
            otra pestaña y son dominios ajenos.
          */}
          <a
            href={link.url}
            target="_blank"
            rel="me noopener noreferrer"
            className={LINK_CLASS}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
