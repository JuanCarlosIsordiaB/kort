-- Estadísticas de audiencia: cuánta gente entra al sitio y qué nota lee.

-- ---------------------------------------------------------------------------
-- Por qué se guarda agregado por día y no una fila por visita
-- ---------------------------------------------------------------------------
-- Una tabla de eventos crudos (una fila por página vista) crece sin techo y
-- obliga a un `group by` sobre cientos de miles de filas cada vez que alguien
-- abre el panel. Lo que la redacción necesita responder es "cuánto se leyó hoy,
-- esta semana, este mes y qué nota jaló más", y para eso el contador por día
-- basta: cada visita es un UPSERT sobre una fila que ya existe, y el panel lee
-- treinta filas para pintar un mes.
--
-- Lo que se pierde es el detalle por visita (de dónde llegó, en qué orden
-- navegó). Si algún día hace falta un embudo, eso pide otra herramienta, no
-- otra columna aquí.

-- ---------------------------------------------------------------------------
-- site_views
-- ---------------------------------------------------------------------------
-- El total del sitio, día por día, en la zona de la redacción (SITE_TIME_ZONE
-- en lib/site.ts). `views` son páginas vistas —recargar cuenta otra vez, como
-- en cualquier medidor— y `sessions` son visitas: la primera página que abre un
-- navegador en su sesión. La diferencia entre las dos es lo que dice si la
-- gente entra y se va o se queda leyendo.

create table if not exists public.site_views (
  day      date primary key,
  views    int not null default 0,
  sessions int not null default 0
);

-- ---------------------------------------------------------------------------
-- news_views
-- ---------------------------------------------------------------------------
-- Lo mismo pero por nota. `on delete cascade`: borrada la nota, sus números no
-- le sirven a nadie porque no hay a qué título colgarlos.

create table if not exists public.news_views (
  news_id uuid not null references public.news(id) on delete cascade,
  day     date not null,
  views   int  not null default 0,
  primary key (news_id, day)
);

-- El panel siempre pregunta por un rango de días ("los últimos 30"), y sin este
-- índice esa consulta recorre la tabla entera.
create index if not exists news_views_day_idx on public.news_views (day);

-- ---------------------------------------------------------------------------
-- El acumulado histórico de una nota vive en news.view_count
-- ---------------------------------------------------------------------------
-- La columna existe desde 0001_init.sql y hasta ahora nadie la escribía.
-- Llevarla evita sumar todas las filas de news_views cada vez que se quiere el
-- total de una nota.
--
-- El estorbo es el trigger de `updated_at`: tal como estaba, cada visita movería
-- la fecha de "actualizada" de la nota, y el panel ordena el listado justo por
-- esa columna — leer una nota vieja la mandaría hasta arriba como si alguien la
-- hubiera editado. La cláusula WHEN lo resuelve sin tocar nada más: el trigger
-- solo corre cuando `view_count` NO cambió, es decir, en las ediciones de
-- verdad. Ninguna escritura del panel toca esa columna (`updateNews` enumera
-- las suyas y no la incluye), así que no hay edición real que se quede sin
-- marcar.

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at
  before update on public.news
  for each row
  when (old.view_count is not distinct from new.view_count)
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- track_view
-- ---------------------------------------------------------------------------
-- Una sola llamada por página vista: suma al total del día, resuelve si la ruta
-- es una nota y, si lo es, le suma a ella también. Va en la base y no en el
-- servidor por lo mismo que `increment_ad_click`: dos lectores simultáneos
-- leerían el mismo valor y se contaría uno solo.
--
-- La ruta se traduce aquí adentro para no pagar un viaje extra a la base solo
-- para convertir el slug en un id. Solo cuentan las notas publicadas: un
-- borrador que alguien abrió con el enlace directo no es audiencia.

create or replace function public.track_view(p_path text, p_new_session boolean default false)
returns void
language plpgsql
as $$
declare
  v_day     date := (now() at time zone 'America/Mexico_City')::date;
  v_news_id uuid;
begin
  insert into public.site_views as s (day, views, sessions)
  values (v_day, 1, case when p_new_session then 1 else 0 end)
  on conflict (day) do update
     set views    = s.views + 1,
         sessions = s.sessions + excluded.sessions;

  -- 11 = el largo de '/noticias/' más uno.
  if p_path like '/noticias/%' then
    select id into v_news_id
      from public.news
     where slug = substring(p_path from 11)
       and status = 'published';
  end if;

  if v_news_id is not null then
    insert into public.news_views as n (news_id, day, views)
    values (v_news_id, v_day, 1)
    on conflict (news_id, day) do update
       set views = n.views + 1;

    update public.news set view_count = view_count + 1 where id = v_news_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lecturas agregadas para el panel
-- ---------------------------------------------------------------------------
-- PostgREST no sabe hacer `group by`, así que las dos preguntas que lo
-- necesitan viven como funciones.

-- Las notas más leídas del rango. Devuelve también el histórico para poder
-- mostrar las dos cifras juntas: una nota vieja puede tener un total enorme y
-- cero lecturas esta semana, y eso es justo lo que hay que poder ver.
create or replace function public.stats_top_news(p_from date, p_limit int default 20)
returns table (
  news_id       uuid,
  title         text,
  slug          text,
  category_name text,
  published_at  timestamptz,
  views         bigint,
  total_views   int
)
language sql
stable
as $$
  select n.id,
         n.title,
         n.slug,
         c.name,
         n.published_at,
         coalesce(sum(v.views), 0)::bigint,
         n.view_count
    from public.news n
    left join public.categories c on c.id = n.category_id
    -- El rango va en el JOIN y no en un WHERE: en un WHERE descartaría las
    -- notas sin lecturas en el periodo, y el panel las quiere ver en cero.
    left join public.news_views v on v.news_id = n.id and v.day >= p_from
   where n.status = 'published'
   group by n.id, c.name
   -- Por posición y no por nombre: en una función `returns table` los nombres
   -- de las columnas de salida están en alcance, y un `order by views` sería
   -- ambiguo entre esa salida y la columna de `news_views`.
   order by 6 desc, n.published_at desc nulls last
   limit greatest(p_limit, 0);
$$;

-- Cuánto se leyó cada sección en el rango.
create or replace function public.stats_by_category(p_from date)
returns table (
  category_name text,
  notes         bigint,
  views         bigint
)
language sql
stable
as $$
  select coalesce(c.name, 'Sin sección'),
         count(distinct n.id),
         coalesce(sum(v.views), 0)::bigint
    from public.news n
    left join public.categories c on c.id = n.category_id
    left join public.news_views v on v.news_id = n.id and v.day >= p_from
   where n.status = 'published'
   group by 1
   order by 3 desc;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Sin policies: invisibles para la anon key. Cuánto tráfico tiene el sitio es
-- información del negocio, no contenido — y la anon key vive en el navegador de
-- cualquiera. El panel lee con service role, que ignora RLS, y las visitas se
-- cuentan desde el servidor (POST /api/vistas), nunca desde el navegador
-- directo contra Supabase.

alter table public.site_views enable row level security;
alter table public.news_views enable row level security;
