/**
 * Banda del boletín. El formulario todavía no tiene a dónde mandar los correos
 * —no hay tabla de suscriptores— así que en vez de fingir que funciona, el
 * campo está deshabilitado y lo dice. Cuando exista el backend, se quita el
 * `disabled` y se le pone una acción.
 */
export function NewsletterBand({ label, title }: { label: string; title: string }) {
  return (
    <section
      id="boletin"
      className="flex flex-wrap items-center justify-between gap-7 bg-foreground px-6 py-8 md:px-10"
    >
      <div>
        <div className="mb-2 text-[10px] font-extrabold tracking-[2px] text-[color-mix(in_srgb,var(--background)_60%,transparent)]">
          {label}
        </div>
        <p className="text-[26px] font-extrabold leading-tight tracking-[-0.5px] text-background">
          {title}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="email"
          disabled
          placeholder="tu@correo.com"
          aria-label="Correo para el boletín (aún no disponible)"
          className="min-w-[240px] rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--background)_35%,transparent)] bg-transparent px-5 py-3 text-xs font-semibold text-background placeholder:text-[color-mix(in_srgb,var(--background)_55%,transparent)]"
        />
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-[var(--radius-pill)] border border-background bg-background px-6 py-3.5 text-[11px] font-extrabold tracking-[1.2px] text-foreground opacity-60"
        >
          UNIRSE
        </button>
        <p className="w-full text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--background)_55%,transparent)]">
          Próximamente
        </p>
      </div>
    </section>
  );
}
