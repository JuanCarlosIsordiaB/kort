import type { SocialLink } from "@/lib/social";

import { SocialIcon } from "./SocialIcon";

/**
 * Las cuentas de la redacción, con su logotipo.
 *
 * Recibe la lista ya resuelta por `socialList()` en vez de la fila de ajustes
 * porque el mismo componente lo monta el masthead (servidor) y el menú móvil
 * (cliente): así lo que cruza la frontera son tres campos de texto y no la fila
 * entera de `site_settings`, con su titular de portada en JSON.
 *
 * Sin `<ul>`: en el pie y en el masthead esto es una fila de botones, no una
 * lista que alguien quiera recorrer elemento por elemento con el lector de
 * pantalla. El `aria-label` del `<nav>` es lo que la anuncia como grupo.
 *
 * La clase de `display` la pone quien lo monta, no este componente. Traía
 * `flex` fijo y el masthead le sumaba `hidden md:flex`: dos utilidades de la
 * misma propiedad en el mismo elemento, y cuál gana no lo decide el orden en
 * que se escriben sino el orden del CSS que genera Tailwind. Dejarlo al
 * llamador quita la ambigüedad.
 */
export function SiteSocials({
  links,
  className = "",
  size = 18,
}: {
  links: SocialLink[];
  className?: string;
  size?: number;
}) {
  if (links.length === 0) return null;

  return (
    <nav aria-label="Redes sociales de Kort" className={`items-center gap-1 ${className}`}>
      {links.map((link) => (
        /*
          El nombre accesible sale del `aria-label` porque dentro sólo hay un
          SVG marcado `aria-hidden`; sin él el enlace se anunciaría como "enlace,
          en blanco". `rel="me"` declara que la cuenta es de este mismo sitio.
        */
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="me noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] text-muted transition-colors duration-[var(--dur-fast)] ease-soft hover:bg-chip hover:text-foreground"
        >
          <SocialIcon id={link.id} size={size} />
        </a>
      ))}
    </nav>
  );
}
