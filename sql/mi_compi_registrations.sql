-- ============================================================
-- Mi Compi Registrations â tabla + vistas para el dashboard
-- Sincroniza perfiles de mascotas desde Connectif
-- ============================================================

CREATE TABLE IF NOT EXISTS mi_compi_registrations (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,

  -- Tracking de sync
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connectif_updated_at TIMESTAMPTZ,

  -- Compi 1 (principal â detalle completo)
  nombre_1      TEXT,
  especie_1     TEXT,
  raza_1        TEXT,
  sexo_1        TEXT,
  nacimiento_1  DATE,
  talla_peso_1  TEXT,
  esterilizado_1 TEXT,
  actividad_1   TEXT,
  pelaje_1      TEXT,
  color_pelaje_1 TEXT,
  alergias_1    TEXT[],
  enfermedades_1 TEXT[],

  -- Compi 2
  nombre_2      TEXT,
  especie_2     TEXT,
  raza_2        TEXT,
  sexo_2        TEXT,
  nacimiento_2  DATE,

  -- Compi 3
  nombre_3      TEXT,
  especie_3     TEXT,
  raza_3        TEXT,
  sexo_3        TEXT,
  nacimiento_3  DATE,

  -- Compi 4
  nombre_4      TEXT,
  especie_4     TEXT,
  raza_4        TEXT,
  sexo_4        TEXT,
  nacimiento_4  DATE,

  -- MÃ©tricas derivadas
  num_compis    INT GENERATED ALWAYS AS (
    (CASE WHEN nombre_1 IS NOT NULL AND nombre_1 != '' THEN 1 ELSE 0 END) +
    (CASE WHEN nombre_2 IS NOT NULL AND nombre_2 != '' THEN 1 ELSE 0 END) +
    (CASE WHEN nombre_3 IS NOT NULL AND nombre_3 != '' THEN 1 ELSE 0 END) +
    (CASE WHEN nombre_4 IS NOT NULL AND nombre_4 != '' THEN 1 ELSE 0 END)
  ) STORED,

  UNIQUE(email)
);

-- Ãndices para queries del dashboard
CREATE INDEX IF NOT EXISTS idx_mi_compi_first_seen ON mi_compi_registrations(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_mi_compi_especie ON mi_compi_registrations(especie_1);
CREATE INDEX IF NOT EXISTS idx_mi_compi_email ON mi_compi_registrations(email);

-- Vista para el dashboard: registros por dÃ­a
CREATE OR REPLACE VIEW mi_compi_daily AS
SELECT
  DATE(first_seen_at) AS dia,
  COUNT(*)            AS registros,
  COUNT(*) FILTER (WHERE especie_1 = 'Perro')  AS perros,
  COUNT(*) FILTER (WHERE especie_1 = 'Gato')   AS gatos,
  COUNT(*) FILTER (WHERE especie_1 NOT IN ('Perro','Gato') AND especie_1 IS NOT NULL) AS otros,
  ROUND(AVG(num_compis)::numeric, 1)           AS media_compis,
  SUM(num_compis)                               AS total_compis
FROM mi_compi_registrations
GROUP BY DATE(first_seen_at)
ORDER BY dia DESC;

-- Vista acumulada
CREATE OR REPLACE VIEW mi_compi_cumulative AS
SELECT
  dia,
  registros,
  SUM(registros) OVER (ORDER BY dia) AS acumulado,
  perros,
  gatos,
  otros
FROM mi_compi_daily
ORDER BY dia;

-- RLS: polÃ­tica de lectura pÃºblica (dashboard interno)
ALTER TABLE mi_compi_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_all_mi_compi" ON mi_compi_registrations;
CREATE POLICY "read_all_mi_compi" ON mi_compi_registrations FOR SELECT USING (true);
