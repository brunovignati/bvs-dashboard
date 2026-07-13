-- ============================================================
-- BVS Analytics — GA4 (trafico web)
-- Ejecuta esto en el SQL Editor de Supabase una sola vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS ga4_daily (
    id SERIAL PRIMARY KEY,
    date_str TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    sessions NUMERIC DEFAULT 0,
    users NUMERIC DEFAULT 0,
    pageviews NUMERIC DEFAULT 0,
    bounce_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date_str)
  );

ALTER TABLE ga4_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica" ON ga4_daily FOR SELECT USING (true);

-- ── Embudo de ecommerce (Nivel 2). Ejecutar también una vez; es idempotente. ──
-- Alimenta el embudo completo: sesiones → vistas de producto → carrito → checkout → compra.
ALTER TABLE ga4_daily ADD COLUMN IF NOT EXISTS item_views NUMERIC;
ALTER TABLE ga4_daily ADD COLUMN IF NOT EXISTS add_to_carts NUMERIC;
ALTER TABLE ga4_daily ADD COLUMN IF NOT EXISTS checkouts NUMERIC;
ALTER TABLE ga4_daily ADD COLUMN IF NOT EXISTS ecommerce_purchases NUMERIC;
ALTER TABLE ga4_daily ADD COLUMN IF NOT EXISTS purchase_revenue NUMERIC;
NOTIFY pgrst, 'reload schema';
