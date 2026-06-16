-- ============================================================
-- BVS Analytics — Esquema Supabase
-- Ejecuta esto en el SQL Editor de Supabase una sola vez
-- ============================================================

-- 1. Compras mensuales nutraceúticos
CREATE TABLE IF NOT EXISTS monthly_metrics (
  id            SERIAL PRIMARY KEY,
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  purchases     NUMERIC DEFAULT 0,
  revenue       NUMERIC DEFAULT 0,
  avg_purchase  NUMERIC DEFAULT 0,
  email_attr    NUMERIC DEFAULT 0,
  push_attr     NUMERIC DEFAULT 0,
  web_attr      NUMERIC DEFAULT 0,
  sms_attr      NUMERIC DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 2. Campañas email (Métricas Looker + Audit Newsletters)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id             SERIAL PRIMARY KEY,
  year           INTEGER NOT NULL,
  month          INTEGER NOT NULL,
  email_name     TEXT NOT NULL DEFAULT '',
  email_workflow TEXT DEFAULT '',
  sent           NUMERIC DEFAULT 0,
  opens          NUMERIC DEFAULT 0,
  clicks         NUMERIC DEFAULT 0,
  unsubs         NUMERIC DEFAULT 0,
  purchases      NUMERIC DEFAULT 0,
  revenue        NUMERIC DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, email_name)
);

-- 3. Carritos abandonados
CREATE TABLE IF NOT EXISTS cart_abandonment (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  email_name  TEXT NOT NULL DEFAULT '',
  sent        NUMERIC DEFAULT 0,
  opens       NUMERIC DEFAULT 0,
  clicks      NUMERIC DEFAULT 0,
  purchases   NUMERIC DEFAULT 0,
  revenue     NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, email_name)
);

-- 4. Primerizos vs Recurrentes
CREATE TABLE IF NOT EXISTS buyer_cohorts (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  first_time  NUMERIC DEFAULT 0,
  recurring   NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 5. Métricas Push DS
CREATE TABLE IF NOT EXISTS push_campaigns (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  workflow    TEXT NOT NULL DEFAULT '',
  sent        NUMERIC DEFAULT 0,
  opens       NUMERIC DEFAULT 0,
  clicks      NUMERIC DEFAULT 0,
  purchases   NUMERIC DEFAULT 0,
  revenue     NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, workflow)
);

-- 6. Evolutivo suscritos email
CREATE TABLE IF NOT EXISTS subscribers (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT '',
  contacts    NUMERIC DEFAULT 0,
  increment   NUMERIC DEFAULT 0,
  unsubs      NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, status)
);

-- 7. Evolución suscriptores push
CREATE TABLE IF NOT EXISTS push_subscribers (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  contacts    NUMERIC DEFAULT 0,
  increment   NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 8. Cantidad usuarios por segmento
CREATE TABLE IF NOT EXISTS segments (
  id          SERIAL PRIMARY KEY,
  segment     TEXT NOT NULL,
  contacts    NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment)
);

-- 9. Compradores mensuales Marca BVS
CREATE TABLE IF NOT EXISTS compradores (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  brand       TEXT DEFAULT '',
  buyers      NUMERIC DEFAULT 0,
  revenue     NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, brand)
);

-- 10. Sticky (web content)
CREATE TABLE IF NOT EXISTS sticky (
  id           SERIAL PRIMARY KEY,
  workflow     TEXT NOT NULL,
  opens        NUMERIC DEFAULT 0,
  clicks       NUMERIC DEFAULT 0,
  conv_rate    NUMERIC DEFAULT 0,
  buyers       NUMERIC DEFAULT 0,
  revenue      NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow)
);

-- 11. Envíos por día
CREATE TABLE IF NOT EXISTS envios (
  id           SERIAL PRIMARY KEY,
  day_of_week  INTEGER NOT NULL,
  day_name     TEXT DEFAULT '',
  sent         NUMERIC DEFAULT 0,
  purchases    NUMERIC DEFAULT 0,
  revenue      NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- 12. Ventas Push
CREATE TABLE IF NOT EXISTS ventas_push (
  id           SERIAL PRIMARY KEY,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  channel      TEXT DEFAULT 'push',
  purchases    NUMERIC DEFAULT 0,
  revenue      NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, channel)
);

-- 13. Rendimiento Push
CREATE TABLE IF NOT EXISTS rendimiento_push (
  id              SERIAL PRIMARY KEY,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  sent            NUMERIC DEFAULT 0,
  purchases_attr  NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 14. Carrito (detalle campañas)
CREATE TABLE IF NOT EXISTS carrito (
  id           SERIAL PRIMARY KEY,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  email_name   TEXT NOT NULL DEFAULT '',
  sent         NUMERIC DEFAULT 0,
  opens        NUMERIC DEFAULT 0,
  clicks       NUMERIC DEFAULT 0,
  purchases    NUMERIC DEFAULT 0,
  revenue      NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, email_name)
);

-- 15. Retención (Sticky cohort)
-- Ya cubierto en la tabla sticky + buyer_cohorts

-- ── Habilitar Row Level Security (RLS) ──────────────────────
-- Permite lectura pública (el dashboard lee sin login)
ALTER TABLE monthly_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_abandonment  ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_cohorts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscribers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE compradores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticky            ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_push       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendimiento_push  ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrito           ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública para todas las tablas
CREATE POLICY "Lectura pública" ON monthly_metrics   FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON email_campaigns   FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON cart_abandonment  FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON buyer_cohorts     FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON push_campaigns    FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON subscribers       FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON push_subscribers  FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON segments          FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON compradores       FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON sticky            FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON envios            FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON ventas_push       FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON rendimiento_push  FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON carrito           FOR SELECT USING (true);
