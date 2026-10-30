-- pos_* — Tiendas físicas (TPV / Presta POS). Origen: PrestaShop (Gestor SQL, consultas BVS_pos_*,
-- ver sql/pos_queries.sql) + scripts/pos_refresh.js. Alimentan la pestaña "Tiendas" del dashboard.
-- Upsert idempotente desde el navegador (el Action de GitHub no alcanza PrestaShop), igual que category_sales.

create table if not exists public.pos_store_monthly (
  year integer not null, month integer not null, store text not null,
  tickets integer default 0, tickets_ident integer default 0, customers integer default 0,
  revenue numeric default 0, revenue_excl numeric default 0,
  coupon_discount numeric default 0, promo_discount numeric default 0,
  tickets_discount integer default 0,
  updated_at timestamptz default now(),
  primary key (year, month, store)
);
create table if not exists public.pos_bvs_monthly (
  year integer not null, month integer not null, store text not null, brand text not null,
  tickets integer default 0, units numeric default 0, revenue numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, store, brand)
);
create table if not exists public.pos_codes_monthly (
  year integer not null, month integer not null, src text not null, code text not null,
  tickets integer default 0, customers integer default 0, discount numeric default 0, revenue numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, src, code)
);
create table if not exists public.pos_retention_monthly (
  year integer not null, month integer not null, grp text not null,
  n30 integer default 0, r30 integer default 0, e30 numeric default 0,
  n60 integer default 0, r60 integer default 0, e60 numeric default 0,
  n90 integer default 0, r90 integer default 0, e90 numeric default 0,
  ns integer default 0, s60 numeric default 0, es60 numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, grp)
);
create table if not exists public.pos_code_retention (
  code text not null primary key,
  tickets integer default 0, customers integer default 0,
  n30 integer default 0, r30 integer default 0, e30 numeric default 0,
  n60 integer default 0, r60 integer default 0, e60 numeric default 0,
  n90 integer default 0, r90 integer default 0, e90 numeric default 0,
  ns integer default 0, s60 numeric default 0, es60 numeric default 0,
  pct_fiel numeric default 0, avg_ticket numeric default 0,
  updated_at timestamptz default now()
);
create table if not exists public.pos_latas (
  grp text not null, seg text not null,
  n integer default 0, ret60 integer default 0, again60 integer default 0,
  units_avg numeric default 0, ticket_avg numeric default 0,
  updated_at timestamptz default now(),
  primary key (grp, seg)
);
create table if not exists public.pos_meta (
  key text not null primary key, value jsonb, updated_at timestamptz default now()
);

-- RLS con lectura pública (dashboard interno, mismo patrón que el resto de tablas)
do $$
declare t text;
begin
  foreach t in array array['pos_store_monthly','pos_bvs_monthly','pos_codes_monthly','pos_retention_monthly','pos_code_retention','pos_latas','pos_meta'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_read') then
      execute format('create policy %I on public.%I for select using (true)', t||'_read', t);
    end if;
  end loop;
end $$;

-- ═══ Ampliación 30-oct-2026 (v2): margen, hora y día, zona, movimiento entre tiendas, web+tienda, cesta, prueba por cliente ═══
alter table public.pos_store_monthly add column if not exists coupon_excl numeric default 0;      -- cupones de caja sin IVA
alter table public.pos_retention_monthly add column if not exists ss60 numeric default 0;          -- suma de residuos² por cliente (prueba por clúster)
alter table public.pos_code_retention
  add column if not exists ss60 numeric default 0,
  add column if not exists tickets_all integer default 0,   -- tickets con el código (todos los clientes, también caja genérica)
  add column if not exists rev_all numeric default 0,       -- venta sin IVA de esas líneas
  add column if not exists rev_known numeric default 0,     -- venta sin IVA de las líneas con coste conocido
  add column if not exists cost numeric default 0,          -- coste de compra de esas líneas
  add column if not exists units_all numeric default 0;

create table if not exists public.pos_margin_monthly (
  year integer not null, month integer not null, store text not null,
  tickets integer default 0, rev_lines numeric default 0, rev_known numeric default 0, cost numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, store)
);
create table if not exists public.pos_hourly (
  year integer not null, month integer not null, store text not null, dow integer not null, hour integer not null,
  tickets integer default 0, revenue numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, store, dow, hour)
);
create table if not exists public.pos_zone (
  year integer not null, month integer not null, store text not null, cp text not null,
  city text, tickets integer default 0, revenue numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, month, store, cp)
);
create table if not exists public.pos_flow (
  year integer not null, quarter integer not null, store_from text not null,
  dest_kind text not null, dest_store text not null default '', customers integer default 0,
  updated_at timestamptz default now(),
  primary key (year, quarter, store_from, dest_kind, dest_store)
);
create table if not exists public.pos_channel_quarter (
  year integer not null, quarter integer not null, seg text not null,
  customers integer default 0, rev_store numeric default 0, rev_web numeric default 0,
  updated_at timestamptz default now(),
  primary key (year, quarter, seg)
);
create table if not exists public.pos_basket (
  code text not null, brand text not null default '',
  tickets integer default 0, units numeric default 0, rev numeric default 0,
  updated_at timestamptz default now(),
  primary key (code, brand)
);

do $$
declare t text;
begin
  foreach t in array array['pos_margin_monthly','pos_hourly','pos_zone','pos_flow','pos_channel_quarter','pos_basket'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_read') then
      execute format('create policy %I on public.%I for select using (true)', t||'_read', t);
    end if;
  end loop;
end $$;
