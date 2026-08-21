-- Una nota en más de una sección.
--
-- Hasta aquí `news.category_id` era la única respuesta a "¿de qué sección es
-- esta nota?", y hay notas que legítimamente son de dos: una iniciativa que se
-- vota en el Congreso es Política y es Nacionales a la vez, y esconderla de una
-- de las dos es perder a los lectores que entran por la que no se eligió.
--
-- `news.category_id` NO se va: se queda como la sección PRINCIPAL. Es la del
-- chip de la tarjeta, la del `articleSection` de los datos estructurados y la
-- que va bajo el titular — los lugares donde solo cabe una respuesta. Lo que se
-- agrega aquí son las demás.

-- ---------------------------------------------------------------------------
-- news_categories
-- ---------------------------------------------------------------------------
-- La puente guarda TODAS las secciones de una nota, la principal incluida.
-- Duplicar la principal parece redundante y es a propósito: así un listado de
-- sección —/categoria/[slug], los renglones de la portada— es un solo join
-- `!inner` contra esta tabla, en vez de un OR entre `news.category_id` y la
-- puente, que PostgREST no sabe paginar ni contar de un tirón.
--
-- Sin `id` propio ni `position`: a diferencia de `home_slots` o
-- `news_recommendations`, aquí el orden no significa nada —una nota no está
-- "más" en Política que en Nacionales— así que el par es la llave.
--
-- `on delete cascade` en las dos llaves: borrar una nota la despega de sus
-- secciones, y borrar una sección despega a las notas que la traían de extra.
-- Borrar una sección con notas ya se bloquea antes, en la API (409); esto es el
-- respaldo, no la puerta principal.

create table if not exists public.news_categories (
  news_id     uuid not null references public.news(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (news_id, category_id)
);

-- La PK ya indexa por `news_id`; este es el del sentido contrario, que es el
-- que corre en cada listado de sección.
create index if not exists news_categories_category_id_idx
  on public.news_categories (category_id);

alter table public.news_categories enable row level security;

-- Mismo trato que el resto de la curaduría pública: se lee de todas partes y
-- solo el service role escribe. Que un renglón de una nota en borrador sea
-- visible no filtra nada — son dos uuid, y la nota en sí sigue tapada por la
-- política de `news`, que es la que decide qué se puede leer.
drop policy if exists "secciones de una nota visibles para todos" on public.news_categories;
create policy "secciones de una nota visibles para todos"
  on public.news_categories for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- La principal, siempre dentro de la puente
-- ---------------------------------------------------------------------------
-- El panel escribe la lista completa al guardar (ver `replaceCategories` en
-- lib/data/news.ts), pero `news` también se escribe desde el importador de Wix
-- y desde SQL a mano. El trigger sostiene el invariante en los tres casos: si
-- una nota tiene sección principal, tiene su renglón aquí.
--
-- Solo inserta, nunca borra. Es un respaldo, no un espejo: si además borrara la
-- sección anterior al cambiar `category_id`, competiría con el `delete` +
-- `insert` del panel y el resultado dependería de cuál de las dos escrituras
-- llegara al final.

create or replace function public.sync_primary_category()
returns trigger
language plpgsql
as $$
begin
  if new.category_id is not null then
    insert into public.news_categories (news_id, category_id)
    values (new.id, new.category_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists news_sync_primary_category on public.news;
create trigger news_sync_primary_category
  after insert or update of category_id on public.news
  for each row
  execute function public.sync_primary_category();

-- Las notas que ya existían. Idempotente por el `on conflict`, que hace falta
-- porque scripts/migrate.ts no lleva registro de lo aplicado y vuelve a correr
-- todos los archivos en cada `npm run db:migrate`.
insert into public.news_categories (news_id, category_id)
select id, category_id
  from public.news
 where category_id is not null
    on conflict do nothing;
