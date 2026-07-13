-- brand_sales — Ventas por MARCA real (fabricante), origen: Google Analytics 4.
-- GA4 registra cada compra a nivel de artículo con su item_brand (Seresto, Royal Canin,
-- Advantix, Farmina, MSD, Ceva, …). Esta tabla agrega por marca y mes:
--   revenue = itemRevenue (ingresos atribuidos al artículo)
--   units   = itemsPurchased (unidades compradas)
-- La puebla scripts/sync_ga4_to_supabase.py (bloque protegido). Upsert idempotente.
-- NOTA: es medida de la web (online, sujeta a consentimiento/adblock); direccional, no
-- exacta contable. El "euro exacto + retail" llegará vía PrestaShop cuando haya acceso.

create table if not exists public.brand_sales (
  year        integer     not null,
  month       integer     not null,
  brand       text        not null,
  revenue     numeric     default 0,
  units       numeric     default 0,
  updated_at  timestamptz default now(),
  primary key (year, month, brand)
);

alter table public.brand_sales enable row level security;

-- Lectura pública (dashboard interno, mismo patrón que el resto de tablas)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brand_sales' and policyname = 'brand_sales_read'
  ) then
    create policy brand_sales_read on public.brand_sales for select using (true);
  end if;
end $$;
