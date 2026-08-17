"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/site/ThemeToggle";
import { initials } from "@/lib/format";

const LINKS = [
  { href: "/admin", label: "Noticias" },
  { href: "/admin/noticias/nueva", label: "Nueva noticia" },
  { href: "/admin/portada", label: "Portada" },
  { href: "/admin/categorias", label: "Secciones" },
  { href: "/admin/perfil", label: "Mi perfil" },
];

export function AdminSidebar({
  adminName,
  avatarUrl,
}: {
  adminName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-border p-5">
      <div>
        <Link href="/" className="text-2xl font-extrabold">
          Kort
        </Link>
        <p className="mt-1 text-xs font-semibold text-muted">Panel</p>
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-[var(--radius-thumb)] px-3 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "hover:bg-chip"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <ThemeToggle className="mb-4 w-full" />

        <div className="flex items-center gap-2">
          {avatarUrl ? (
            // Ya está en Supabase; <img> evita configurar next/image aquí.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-[10px] font-extrabold text-muted">
              {initials(adminName)}
            </span>
          )}
          <p className="text-sm font-bold">{adminName}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 text-xs font-semibold text-muted underline hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
