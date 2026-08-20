import Link from "next/link";

import { categoryPath } from "@/lib/category-path";
import { listCategories } from "@/lib/data/categories";
import { upper } from "@/lib/format";

import { KortMark } from "./KortMark";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Masthead del diseño.
 *
 * Las secciones salen de la base, no de una lista fija: el admin agrega o quita
 * secciones y la navegación se entera sola. (El prototipo trae POLÍTICA, MUNDO,
 * CULTURA… pero eso era contenido de ejemplo.)
 *
 * BUSCAR y GUARDADOS del prototipo no están: todavía no existen esas páginas y
 * un enlace muerto es peor que no ponerlo. SUSCRIBIRSE sí, porque lleva al
 * bloque de boletín que sí está al pie de la portada.
 */
export async function SiteHeader({ compact = false }: { compact?: boolean }) {
  const categories = await listCategories();

  return (
    /* `relative` ancla el panel del menú móvil, que cuelga del borde inferior. */
    <header className="relative flex items-center justify-between gap-4 border-b border-border-strong px-6 py-5 md:px-10">
      <div className="flex min-w-0 items-center gap-8">
        <Link href="/" className="flex shrink-0 items-center">
          <KortMark height={compact ? 34 : 52} />
        </Link>

        {!compact && (
          <nav className="hidden flex-wrap gap-6 md:flex">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryPath(category)}
                className="whitespace-nowrap text-xs font-bold tracking-[1.4px] text-muted transition-colors hover:text-foreground"
              >
                {upper(category.name)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />

        {/* En móvil SUSCRIBIRSE vive dentro del menú, junto a las secciones; en
            modo compacto no hay menú, así que se queda visible siempre. */}
        <Link
          href="/#boletin"
          className={`whitespace-nowrap rounded-[var(--radius-pill)] border border-border-strong px-5 py-2.5 text-xs font-extrabold tracking-[1.2px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background ${
            compact ? "" : "hidden md:inline-block"
          }`}
        >
          SUSCRIBIRSE
        </Link>

        {!compact && <MobileNav categories={categories} />}
      </div>
    </header>
  );
}
