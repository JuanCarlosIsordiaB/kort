-- Publicidad: campañas contratadas que se muestran en huecos fijos del sitio.
--
-- El modelo es el mismo que `home_slots` y por la misma razón: el hueco no lo
-- inventa quien administra, lo define el código. `zone` es una lista cerrada
-- que corresponde una a una con `AD_ZONES` en lib/ads/zones.ts, y cada zona
-- tiene su tamaño fijo allá. Dejar elegir "cualquier parte de la página" sonaría
-- más flexible, pero significa meter una imagen de medidas arbitrarias en una
-- maqueta diseñada — se rompe sola, y además no habría nada que vender por
-- ubicación.
--
-- IMPORTANTE: agregar una zona son dos archivos. Este `check` y el objeto de
-- lib/ads/zones.ts tienen que decir exactamente lo mismo.

-- ---------------------------------------------------------------------------
-- ads
-- ---------------------------------------------------------------------------
-- `starts_on`/`ends_on` son `date` y no `timestamptz` porque lo que se contrata
-- es "del día X al día Y", no un instante. Ambos inclusive.
--
-- `active` es la pausa manual: apagar una campaña sin borrarla ni tocar sus
-- fechas, para poder reactivarla tal cual.

create table if not exists public.ads (
  id          uuid primary key default gen_random_uuid(),
  -- Empresa que contrató el espacio. No hay tabla de anunciantes: hoy no hay
  -- nada que colgar de ella (ni contactos, ni facturación) y un texto libre
  -- basta para la lista del panel.
  advertiser  text not null,
  zone        text not null check (zone in (
                'home-top',
                'home-sidebar',
                'home-mid',
                'article-top',
                'article-bottom',
                'category-top',
                'footer-banner'
              )),
  image_url   text not null,
  target_url  text not null,
  alt         text,
  starts_on   date not null,
  ends_on     date not null,
  active      boolean not null default true,
  click_count int  not null default 0,
  -- Notas internas del vendedor (contacto, número de contrato). Nunca sale al
  -- público.
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint ads_dates_ok check (ends_on >= starts_on)
);

create index if not exists ads_zone_dates_idx
  on public.ads (zone, starts_on, ends_on);

drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
  before update on public.ads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- increment_ad_click
-- ---------------------------------------------------------------------------
-- El conteo se hace aquí y no leyendo-sumando-escribiendo desde el servidor:
-- dos clics simultáneos leerían el mismo valor y se contaría uno solo. Postgres
-- resuelve el `+ 1` bajo el candado de la fila.

create or replace function public.increment_ad_click(ad_id uuid)
returns void
language sql
as $$
  update public.ads set click_count = click_count + 1 where id = ad_id;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- La ventana de vigencia va dentro de la policy y no solo en la consulta. La
-- anon key viaja al navegador por diseño, así que sin esto cualquiera podría
-- listar las campañas futuras y saber qué empresas contrataron y hasta cuándo.
-- Eso es información comercial, no contenido.
--
-- El `at time zone`: Supabase corre en UTC. Sin él, una campaña que termina el
-- día 19 se apagaría a las 18:00 hora de México del 19. Tiene que coincidir con
-- SITE_TIME_ZONE de lib/site.ts.
--
-- El panel lee con service role, que ignora RLS, así que sigue viendo las
-- vencidas, las programadas y las pausadas.

alter table public.ads enable row level security;

drop policy if exists "anuncios vigentes visibles para todos" on public.ads;
create policy "anuncios vigentes visibles para todos"
  on public.ads for select
  to anon, authenticated
  using (
    active
    and (now() at time zone 'America/Mexico_City')::date between starts_on and ends_on
  );
