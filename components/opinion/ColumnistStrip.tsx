import Link from "next/link";

import { profilePath, type PublicReporter } from "@/lib/data/reporters";
import { upper } from "@/lib/format";
import { punct } from "@/lib/punctuation";

import { ColumnistAvatar } from "./ColumnistAvatar";

/**
 * La plana de columnistas, arriba del listado.
 *
 * Es la puerta a los perfiles: sin ella `/opinion/[slug]` solo se alcanzaría
 * desde una tarjeta que por casualidad esté en la primera página. Se desliza en
 * horizontal en vez de envolverse en varias filas para que no le robe la
 * pantalla al listado cuando la redacción crezca.
 */
export function ColumnistStrip({ columnists }: { columnists: PublicReporter[] }) {
  if (!columnists.length) return null;

  return (
    <nav
      aria-label="Columnistas"
      /* `-mx-6`/`px-6` para que el recorte del scroll llegue a la orilla de la
         pantalla y no se vea una tarjeta cortada a media página. */
      className="mb-10 -mx-6 flex gap-7 overflow-x-auto px-6 pb-2 md:-mx-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {columnists.map((columnist) => (
        <Link
          key={columnist.id}
          href={profilePath(columnist)}
          className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center"
        >
          <ColumnistAvatar
            src={columnist.avatar_url}
            name={columnist.display_name}
            size={64}
            className="transition-transform ease-soft group-hover:-translate-y-0.5"
          />

          <span className="text-[10px] font-extrabold leading-tight tracking-[0.6px] text-muted transition-colors group-hover:text-foreground">
            {punct(columnist.display_name)}
          </span>

          {columnist.column_name && (
            <span className="sr-only">{upper(columnist.column_name)}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
