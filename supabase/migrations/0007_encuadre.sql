-- Punto focal por imagen: qué parte de la foto no se puede perder al recortar.

-- ---------------------------------------------------------------------------
-- Por qué un punto y no un recorte
-- ---------------------------------------------------------------------------
-- El sitio muestra la misma foto en marcos de proporciones muy distintas (hero
-- de 1280x380, tarjeta de 640x150, miniatura cuadrada de 62px). Guardar un
-- recorte fijo obligaría a guardar uno por marco, y cada marco nuevo dejaría
-- las fotos viejas sin encuadre.
--
-- El punto focal resuelve los tres de una vez: es el porcentaje de la foto que
-- debe quedar centrado, y `object-position` lo traduce a cada marco. 50/50 es
-- el centro, que es exactamente lo que hace hoy `object-cover` por omisión, así
-- que las fotos que ya existen no cambian de aspecto.

alter table public.news_images
  add column if not exists focus_x smallint not null default 50,
  add column if not exists focus_y smallint not null default 50;

do $$
begin
  alter table public.news_images
    add constraint news_images_focus_x_range check (focus_x between 0 and 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.news_images
    add constraint news_images_focus_y_range check (focus_y between 0 and 100);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Desnormalizado en `news`, igual que `cover_image_url`
-- ---------------------------------------------------------------------------
-- Los listados (portada, archivo, categoría) traen solo columnas de `news` y no
-- la galería: son decenas de filas de más por página. La portada ya se copia
-- aquí por ese mismo motivo, y su encuadre tiene que viajar con ella o las
-- tarjetas seguirían recortando al centro.
alter table public.news
  add column if not exists cover_focus_x smallint not null default 50,
  add column if not exists cover_focus_y smallint not null default 50;
