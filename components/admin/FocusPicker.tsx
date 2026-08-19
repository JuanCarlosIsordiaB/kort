"use client";

import { useRef, useState } from "react";

import { clampFocus } from "@/lib/image-focus";

/**
 * Elige el punto de la foto que nunca se recorta.
 *
 * El sitio muestra la misma foto en marcos de proporciones muy distintas, y
 * `object-cover` recorta al centro: cuando lo importante está arriba o a la
 * orilla, el centro es justo lo que sobra. Aquí se arrastra la mira sobre la
 * foto completa y las vistas previas de al lado enseñan, con los mismos marcos
 * del sitio, qué se va a ver.
 *
 * La foto se dibuja con `object-contain` y el contenedor se ajusta a ella (no
 * al revés), así el porcentaje que sale del cursor es el porcentaje real de la
 * imagen y no del hueco que la rodea.
 */
export function FocusPicker({
  url,
  focusX,
  focusY,
  onChange,
}: {
  url: string;
  focusX: number;
  focusY: number;
  onChange: (focus: { focus_x: number; focus_y: number }) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function setFromEvent(clientX: number, clientY: number) {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;

    onChange({
      focus_x: clampFocus(((clientX - box.left) / box.width) * 100),
      focus_y: clampFocus(((clientY - box.top) / box.height) * 100),
    });
  }

  function nudge(dx: number, dy: number) {
    onChange({ focus_x: clampFocus(focusX + dx), focus_y: clampFocus(focusY + dy) });
  }

  const centered = focusX === 50 && focusY === 50;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-thumb)] border border-border bg-input/40 p-3 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-2">
        <div
          ref={areaRef}
          role="application"
          aria-label="Encuadre: arrastra la mira al punto importante de la foto"
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            setFromEvent(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (dragging) setFromEvent(e.clientX, e.clientY);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={(e) => {
            // Con teclado se mueve de 2 en 2: suficiente para afinar sin
            // necesitar cincuenta pulsaciones para cruzar la foto.
            const step = e.shiftKey ? 10 : 2;
            const by: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            };
            const delta = by[e.key];
            if (!delta) return;
            e.preventDefault();
            nudge(delta[0], delta[1]);
          }}
          className="relative inline-block cursor-crosshair touch-none select-none self-start overflow-hidden rounded-[var(--radius-thumb)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {/* Foto ya subida a Supabase; <img> basta en el panel. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            draggable={false}
            className="block max-h-[220px] w-auto max-w-full"
          />

          {/* Cruz de referencia, para leer el punto sin adivinar. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-white/70 mix-blend-difference"
            style={{ left: `${focusX}%` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-px bg-white/70 mix-blend-difference"
            style={{ top: `${focusY}%` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.6)]"
            style={{ left: `${focusX}%`, top: `${focusY}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <button
            type="button"
            onClick={() => onChange({ focus_x: 50, focus_y: 50 })}
            disabled={centered}
            className="rounded border border-border px-2 py-1 text-[11px] font-bold disabled:opacity-30"
          >
            Centrar
          </button>
          <span>
            {focusX}% · {focusY}%
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Así se va a ver
        </p>
        {/* Las proporciones son las de los marcos reales del sitio: hero de la
            nota, tarjeta de portada y miniatura de la barra lateral. */}
        <Preview url={url} focusX={focusX} focusY={focusY} label="Nota" className="h-24 w-full" />
        <div className="flex items-end gap-2">
          <Preview
            url={url}
            focusX={focusX}
            focusY={focusY}
            label="Tarjeta"
            className="h-[60px] flex-1"
          />
          <Preview
            url={url}
            focusX={focusX}
            focusY={focusY}
            label="Mini"
            className="h-[62px] w-[62px] shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

function Preview({
  url,
  focusX,
  focusY,
  label,
  className,
}: {
  url: string;
  focusX: number;
  focusY: number;
  label: string;
  className: string;
}) {
  return (
    <figure className={`relative overflow-hidden rounded-[var(--radius-thumb)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        style={{ objectPosition: `${focusX}% ${focusY}%` }}
        className="h-full w-full object-cover"
      />
      <figcaption className="absolute bottom-0 left-0 bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
        {label}
      </figcaption>
    </figure>
  );
}
