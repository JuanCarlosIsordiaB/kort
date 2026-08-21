-- Dejar un hueco de la portada vacío a propósito.
--
-- Hasta aquí, un hueco que el panel no llenaba se rellenaba solo con lo más
-- reciente publicado, y ese relleno no tenía apagador: la fila de Opinión con
-- una sola columna curada se completaba con la nota que tocara, y no había
-- manera de decir "aquí no va nada". Estas banderas son ese apagador, una por
-- hueco:
--
--   · encendida  → lo curado primero y el resto se rellena solo (lo de siempre);
--   · apagada    → se enseña exactamente lo curado, ni una nota más. Si no hay
--                  nada curado, el bloque no se pinta.
--
-- Encendidas por omisión, que es como se comportaba el sitio antes de esto: una
-- instalación recién hecha tiene que llenar su portada sola.
--
-- Van en `site_settings` y no en `home_slots` porque son un ajuste del hueco, no
-- de una nota: `home_slots` guarda renglones de notas elegidas y un hueco
-- apagado justamente no tiene ninguna.

alter table public.site_settings
  add column if not exists autofill_lead     boolean not null default true,
  add column if not exists autofill_breaking boolean not null default true,
  add column if not exists autofill_featured boolean not null default true,
  add column if not exists autofill_opinion  boolean not null default true;
