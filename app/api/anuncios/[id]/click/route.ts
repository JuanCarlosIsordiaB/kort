import { getAdTargetUrl, incrementAdClick } from "@/lib/data/ads";

/**
 * A dónde apunta el banner: cuenta el clic y manda al anunciante.
 *
 * Es la única ruta pública de publicidad. El destino no viaja en la URL —sale
 * de la base por id— para que nadie pueda usar esto como redirector abierto
 * hacia donde se le antoje.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/anuncios/[id]/click">) {
  const { id } = await ctx.params;

  const target = await getAdTargetUrl(id);
  if (!target) return new Response("Anuncio no encontrado", { status: 404 });

  // El conteo no debe poder impedir que el visitante llegue a su destino: si la
  // escritura falla se pierde un clic, que es mucho menos grave que un enlace
  // roto en un espacio pagado.
  try {
    await incrementAdClick(id);
  } catch (error) {
    console.error("No se pudo contar el clic del anuncio:", (error as Error).message);
  }

  // 302 y no 301: el navegador cachea un 301 para siempre, así que el segundo
  // clic del mismo visitante ya no pasaría por aquí y no se contaría.
  return Response.redirect(target, 302);
}
