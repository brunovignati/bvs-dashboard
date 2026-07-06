-- ============================================================
-- BVS Analytics — Tabla channel_segmentation
-- Ejecutar una sola vez en: Supabase → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS channel_segmentation (
  year         INTEGER      NOT NULL,
  month        INTEGER      NOT NULL,
  api_buyers   INTEGER      NOT NULL DEFAULT 0,
  web_buyers   INTEGER      NOT NULL DEFAULT 0,
  retail       INTEGER      NOT NULL DEFAULT 0,
  digital      INTEGER      NOT NULL DEFAULT 0,
  omnichannel  INTEGER      NOT NULL DEFAULT 0,
  total_buyers INTEGER      NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (year, month)
);

-- Habilitar RLS (requerido por Supabase)
ALTER TABLE channel_segmentation ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (igual que el resto de tablas del dashboard)
CREATE POLICY IF NOT EXISTS "Allow public read"
  ON channel_segmentation FOR SELECT
  USING (true);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_channel_seg_year_month
  ON channel_segmentation (year ASC, month ASC);
