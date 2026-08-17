import { KortMark } from "./KortMark";

export function SiteFooter({ tagline }: { tagline?: string }) {
  const line = tagline ?? "NOTICIAS PARA GENTE QUE NO TIENE TODO EL DÍA";

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-strong px-6 py-5 md:px-10">
      <KortMark height={26} />
      <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted">
        © {new Date().getFullYear()} KORT — {line}
      </span>
    </footer>
  );
}
