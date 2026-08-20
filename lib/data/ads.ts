import { cache } from "react";

import type { AdZone } from "@/lib/ad-zones";
import { todayInSiteZone } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";
import type { Ad } from "@/lib/types";

/**
 * Único lugar donde se consultan las campañas de publicidad.
 *
 * Las lecturas del público usan la anon key: la policy de RLS ya filtra por
 * vigencia, así que aunque esta capa se equivocara de filtro no se podría
 * mostrar —ni listar— una campaña que no está corriendo. El panel usa el
 * service role porque necesita ver justo lo contrario: las vencidas, las
 * programadas y las pausadas.
 */

export interface AdInput {
  advertiser: string;
  zone: AdZone;
  image_url: string;
  target_url: string;
  alt: string | null;
  starts_on: string;
  ends_on: string;
  active: boolean;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

/**
 * Todas las campañas que corren hoy, de todas las zonas, en una sola consulta.
 *
 * El `cache()` es lo que hace que esto valga la pena: la portada monta cuatro
 * `<AdSlot>` (tres zonas más el pie) y sin él serían cuatro idas a la base para
 * traer la misma tabla. Con él, el primer slot la trae y los otros tres leen lo
 * ya resuelto en ese mismo render.
 */
export const getActiveAds = cache(async (): Promise<Ad[]> => {
  const today = todayInSiteZone();

  const { data, error } = await supabasePublic()
    .from("ads")
    .select("*")
    .eq("active", true)
    .lte("starts_on", today)
    .gte("ends_on", today);

  // Un fallo aquí no debe tumbar la página: la publicidad es accesoria al
  // contenido. Se cae al caso "no hay nada que mostrar" y el hueco desaparece.
  if (error) {
    console.error("No se pudieron leer los anuncios:", error.message);
    return [];
  }

  return (data ?? []) as Ad[];
});

/**
 * Las campañas vigentes de una zona, barajadas, o un arreglo vacío si no hay.
 *
 * Se devuelven todas y no una sola porque un hueco puede venderse a varios
 * anunciantes el mismo mes: el que rota (ver `AdCarousel`) las pasa una tras
 * otra, y el que no, se queda con la primera.
 *
 * El barajado es lo que reparte las impresiones. Ojo con su alcance: en la
 * portada y en las notas el render está cacheado 5 minutos, así que durante esa
 * ventana todos los visitantes reciben el mismo orden y el sorteo ocurre por
 * regeneración, no por visita. A lo largo de una campaña de semanas el reparto
 * sale parejo igual, y a cambio no se paga con una petición de cliente ni
 * rompiendo el renderizado estático.
 */
export async function pickAdsFor(zone: AdZone): Promise<Ad[]> {
  const candidates = (await getActiveAds()).filter((ad) => ad.zone === zone);

  // Fisher-Yates sobre una copia: `getActiveAds` está memoizado y el arreglo
  // que devuelve lo comparten todos los huecos de este render.
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * El destino de un clic. Va por service role a propósito: el visitante puede
 * traer la página desde la caché del navegador minutos después de que la
 * campaña venció, y mandarlo a un 404 en vez de al anunciante sería peor.
 */
export async function getAdTargetUrl(id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("ads")
    .select("target_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { target_url: string }).target_url;
}

export async function incrementAdClick(id: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc("increment_ad_click", { ad_id: id });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

/** Todas las campañas, vigentes o no. El orden final lo decide la UI. */
export async function listAds(): Promise<Ad[]> {
  const { data, error } = await supabaseAdmin()
    .from("ads")
    .select("*")
    .order("ends_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudieron listar los anuncios: ${error.message}`);
  return (data ?? []) as Ad[];
}

export async function getAdById(id: string): Promise<Ad | null> {
  const { data, error } = await supabaseAdmin()
    .from("ads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Ad) ?? null;
}

export async function createAd(input: AdInput): Promise<Ad> {
  const { data, error } = await supabaseAdmin()
    .from("ads")
    .insert(input)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Ad;
}

/** No toca `click_count`: el contador es histórico y editar la campaña no lo reinicia. */
export async function updateAd(id: string, input: AdInput): Promise<Ad> {
  const { data, error } = await supabaseAdmin()
    .from("ads")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Ad;
}

export async function deleteAd(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("ads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
