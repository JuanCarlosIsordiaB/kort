"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/site/ThemeToggle";
import { initials } from "@/lib/format";

const LINKS = [
  { href: "/admin", label: "Noticias" },
  { href: "/admin/noticias/nueva", label: "Nueva noticia" },
  { href: "/admin/portada", label: "Portada" },
  { href: "/admin/categorias", label: "Secciones" },
  { href: "/admin/perfil", label: "Mi perfil" },
];

/**
 * Navegación del panel.
 *
 * En pantalla ancha es la columna de siempre. Abajo de `lg` esa columna se
 * comía media pantalla, así que ahí se pliega detrás de una barra superior con
 * botón de menú y el mismo contenido sale como cajón lateral.
 */
export function AdminSidebar({
  adminName,
  avatarUrl,
}: {
  adminName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // Sin esto el contenido sigue haciendo scroll detrás del cajón.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Barra superior: sustituye a la columna abajo de `lg`. */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-nav-drawer"
          aria-label="Abrir menú del panel"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-thumb)] border border-border transition-colors hover:bg-chip"
        >
          <span aria-hidden className="relative block h-3.5 w-4">
            <span className="absolute top-0 left-0 block h-[2px] w-full bg-current" />
            <span className="absolute top-1.5 left-0 block h-[2px] w-full bg-current" />
            <span className="absolute top-3 left-0 block h-[2px] w-full bg-current" />
          </span>
        </button>

        <Link href="/admin" className="text-xl font-extrabold">
          Kort
        </Link>
        <span className="text-xs font-semibold text-muted">Panel</span>

        <ThemeToggle className="ml-auto shrink-0" />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú del panel"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            id="admin-nav-drawer"
            className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 overflow-y-auto border-r border-border bg-background p-5 shadow-[var(--shadow-card-hover)]"
          >
            <NavBody
              adminName={adminName}
              avatarUrl={avatarUrl}
              pathname={pathname}
              onLogout={logout}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-5 lg:flex">
        <NavBody
          adminName={adminName}
          avatarUrl={avatarUrl}
          pathname={pathname}
          onLogout={logout}
        />
      </aside>
    </>
  );
}

/** El contenido compartido por la columna de desktop y el cajón de móvil. */
function NavBody({
  adminName,
  avatarUrl,
  pathname,
  onLogout,
  onClose,
}: {
  adminName: string;
  avatarUrl?: string | null;
  pathname: string;
  onLogout: () => void;
  /**
   * Solo lo pasa el cajón de móvil. Presente significa "estoy en el cajón": es
   * lo que decide el botón de cerrar, que los enlaces cierren al navegar (Next
   * no remonta este layout entre rutas del grupo) y que el toggle de tema no se
   * duplique, porque en móvil ya vive en la barra superior.
   */
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href="/" className="text-2xl font-extrabold" onClick={onClose}>
            Kort
          </Link>
          <p className="mt-1 text-xs font-semibold text-muted">Panel</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú del panel"
            className="-mt-1 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-thumb)] border border-border text-lg leading-none transition-colors hover:bg-chip"
          >
            <span aria-hidden>×</span>
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`rounded-[var(--radius-thumb)] px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "hover:bg-chip"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        {!onClose && <ThemeToggle className="mb-4 w-full" />}

        <div className="flex items-center gap-2">
          {avatarUrl ? (
            // Ya está en Supabase; <img> evita configurar next/image aquí.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-extrabold text-muted">
              {initials(adminName)}
            </span>
          )}
          <p className="min-w-0 truncate text-sm font-bold">{adminName}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 text-xs font-semibold text-muted underline hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
