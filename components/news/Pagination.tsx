import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  basePath,
}: {
  page: number;
  pageCount: number;
  basePath: string;
}) {
  if (pageCount <= 1) return null;

  const linkClass =
    "rounded-[var(--radius-pill)] border border-border px-4 py-2 text-sm font-semibold";

  return (
    <nav className="mt-10 flex items-center justify-between" aria-label="Paginación">
      {page > 1 ? (
        <Link href={`${basePath}?page=${page - 1}`} className={linkClass}>
          ← Anteriores
        </Link>
      ) : (
        <span />
      )}

      <span className="text-sm font-semibold text-muted">
        Página {page} de {pageCount}
      </span>

      {page < pageCount ? (
        <Link href={`${basePath}?page=${page + 1}`} className={linkClass}>
          Siguientes →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
