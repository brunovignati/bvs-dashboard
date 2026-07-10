-- Vistas de agregación (perf). El servidor resume las tablas diarias grandes por día,
-- y el frontend lee ~745 filas en una sola petición en vez de paginar decenas de miles.
-- Regulares (no materializadas): siempre reflejan el dato actual; el coste de agregar en
-- Postgres es milisegundos. Consumidores: SendVolumeCard, WebContentTrendCard.

create or replace view public.v_daily_email_diario as
  select year, month, day,
         sum(sent)   as sent,
         sum(opens)  as opens,
         sum(clicks) as clicks
  from public.daily_email
  group by year, month, day;

create or replace view public.v_daily_push_diario as
  select year, month, day,
         sum(sent)      as sent,
         sum(purchases) as purchases
  from public.daily_push
  group by year, month, day;

create or replace view public.v_daily_sticky_diario as
  select year, month, day,
         sum(clicks)  as clicks,
         sum(opens)   as opens,
         sum(buyers)  as buyers,
         sum(revenue) as revenue
  from public.daily_sticky
  group by year, month, day;

-- Refresca el cache de esquema de PostgREST para exponer las vistas por REST.
notify pgrst, 'reload schema';
