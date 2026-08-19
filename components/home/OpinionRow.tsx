import Image from "next/image";
import Link from "next/link";

import { initials, readShortUpper, upper } from "@/lib/format";
import { punct } from "@/lib/punctuation";
import type { NewsWithCategory } from "@/lib/types";

export function OpinionRow({ items }: { items: NewsWithCategory[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-9 border-t border-border-strong px-6 py-10 md:px-10">
      <div className="mb-5 flex items-center gap-3.5">
        <h2 className="text-[10px] font-extrabold tracking-[2px]">OPINIÓN</h2>
        <div aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/noticias/${item.slug}`}
            className="kort-reveal flex items-start gap-4 rounded-[var(--radius-card)] bg-card p-[18px] shadow-[var(--shadow-card)] transition-shadow ease-soft hover:shadow-[var(--shadow-card-hover)]"
          >
            {/* La foto del autor si ya subió una; si no, sus iniciales. */}
            {item.author_avatar_url ? (
              <Image
                src={item.author_avatar_url}
                alt=""
                width={88}
                height={88}
                className="h-11 w-11 shrink-0 rounded-[var(--radius-avatar)] object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-avatar)] border border-accent bg-background text-[13px] font-extrabold tracking-wide text-accent"
              >
                {initials(item.author_name)}
              </span>
            )}

            <div>
              <div className="mb-2 text-base font-bold leading-snug">{punct(item.title)}</div>
              <div className="text-[9px] font-extrabold tracking-[1.3px] text-muted">
                {[upper(item.author_name), readShortUpper(item.read_minutes)]
                  .filter(Boolean)
                  .join(" — ")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
