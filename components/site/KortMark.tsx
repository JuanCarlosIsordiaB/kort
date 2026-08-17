import Image from "next/image";

/**
 * El logotipo. Son dos archivos, uno navy y uno ivory, y se elige por CSS según
 * el tema en vez de con estado de React: así el correcto ya está pintado antes
 * de hidratar, igual que las etiquetas del botón de tema.
 */
export function KortMark({ height = 52 }: { height?: number }) {
  const common = {
    width: Math.round(height * 3.2),
    height,
    priority: true,
    style: { height, width: "auto" },
  };

  return (
    <>
      <span data-theme-when="light">
        <Image src="/kort-mark-navy.png" alt="Kort" {...common} />
      </span>
      {/* La copia oculta queda fuera del árbol de accesibilidad por su
          `display:none`, así que el nombre no se anuncia dos veces. */}
      <span data-theme-when="dark">
        <Image src="/kort-mark-ivory.png" alt="Kort" {...common} />
      </span>
    </>
  );
}
