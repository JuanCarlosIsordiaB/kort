-- Puntuación en naranja: bandera del sitio, no del artículo.
--
-- Cuando está prendida, los signos (punto, coma, punto y coma, dos puntos,
-- signos de admiración e interrogación, puntos suspensivos) y las letras
-- acentuadas del texto editorial se pintan con `--orange` en vez de heredar la
-- tinta. Vive en `site_settings` porque es una decisión de identidad visual del
-- diario entero, igual que el titular de portada o la línea del pie.
--
-- Default `false`: prender un efecto tipográfico sin que nadie lo haya pedido
-- cambiaría el sitio de golpe al aplicar la migración.

alter table public.site_settings
  add column if not exists punctuation_accent boolean not null default false;
