"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * ¿Este navegador tiene el diálogo nativo de compartir?
 *
 * Con `useSyncExternalStore` en vez de un efecto: da un valor distinto en el
 * servidor (`false`) y en el cliente sin provocar un desajuste de hidratación
 * ni un render en cascada. La capacidad no cambia nunca, así que no hay nada a
 * qué suscribirse.
 */
const noop = () => () => {};
function useCanShareNative(): boolean {
  return useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false,
  );
}

/**
 * Botones de compartir.
 *
 * La URL llega ya absoluta desde el servidor (`lib/site.ts`) en vez de leerse de
 * `window.location`: en desarrollo eso copiaría un enlace a `localhost` que no
 * le sirve a nadie.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const canShareNative = useCanShareNative();

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const encodedUrl = encodeURIComponent(url);
  const shareText = `${title} ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Safari sin permiso de portapapeles: al menos deja el enlace a la vista.
      window.prompt("Copia el enlace:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <span className="mr-1 text-[10px] font-extrabold tracking-[1.6px] text-muted">
        COMPARTIR
      </span>

      <A href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>WhatsApp</A>
      <A href={`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}`}>
        X
      </A>
      <A href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}>Facebook</A>

      <button type="button" onClick={copy} className={buttonClass}>
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>

      {canShareNative && (
        <button
          type="button"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          className={buttonClass}
        >
          Compartir…
        </button>
      )}
    </div>
  );
}

const buttonClass =
  "rounded-[var(--radius-pill)] border border-border-strong px-4 py-2 text-[11px] font-extrabold tracking-[1.2px] transition-colors hover:border-blue hover:bg-blue hover:text-white";

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass}>
      {children}
    </a>
  );
}
