import { revalidatePath } from "next/cache";

/**
 * Vuelve a generar la sección de Opinión.
 *
 * `/opinion` y `/opinion/[slug]` son ISR de cinco minutos, así que sin esto un
 * cambio en el panel tarda hasta ese tiempo en verse. Las dos son cosas
 * distintas de revalidar y se olvidan por separado con facilidad —lo tocan seis
 * rutas: noticias, perfil, usuarios y secciones—, así que van juntas aquí.
 *
 * El segundo argumento `"page"` es obligatorio en una ruta con segmento
 * dinámico: sin él Next interpreta `[slug]` como un literal y no revalida
 * ningún perfil. Se revalidan todos y no solo el del autor porque una columna
 * puede cambiar de firma y la tarjeta del listado enseña datos de su perfil.
 */
export function revalidateOpinion(): void {
  revalidatePath("/opinion");
  revalidatePath("/opinion/[slug]", "page");
}
