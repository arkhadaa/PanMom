-- =============================================
-- supabase-costos.sql  — MIGRACIÓN SEGURA
-- Ejecutar en Supabase SQL Editor.
-- Idempotente: se puede correr más de una vez.
-- =============================================

-- ─── 1. CREAR TABLAS (con todas las columnas finales) ────────────────────────
-- CREATE TABLE IF NOT EXISTS es seguro: no falla si ya existen.

CREATE TABLE IF NOT EXISTS produccion (
  id        SERIAL PRIMARY KEY,
  receta_id INT  NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  cargas    INT  NOT NULL DEFAULT 1,
  notas     TEXT,
  dia       DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id        SERIAL PRIMARY KEY,
  receta_id INT NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id INT NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad  DECIMAL(12,4) NOT NULL DEFAULT 0,
  UNIQUE (receta_id, insumo_id)
);

-- ─── 2. MIGRAR COLUMNAS en tablas existentes ─────────────────────────────────

ALTER TABLE insumos    ADD COLUMN IF NOT EXISTS precio_compra   DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE insumos    ADD COLUMN IF NOT EXISTS cantidad_compra DECIMAL(12,3) NOT NULL DEFAULT 1;
ALTER TABLE recetas    ADD COLUMN IF NOT EXISTS precio_venta    DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS dia             DATE          NOT NULL DEFAULT CURRENT_DATE;

-- Limpiar columnas obsoletas de instalaciones anteriores
ALTER TABLE insumos             DROP COLUMN IF EXISTS costo_unidad;
ALTER TABLE insumos             DROP COLUMN IF EXISTS notas;
ALTER TABLE receta_ingredientes DROP COLUMN IF EXISTS unidad_uso;

-- ─── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE insumos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion          ENABLE ROW LEVEL SECURITY;

-- Políticas (ignorar si ya existen)
DO $$ BEGIN
  CREATE POLICY "Acceso insumos"      ON insumos             FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Acceso recetas"      ON recetas             FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Acceso ingredientes" ON receta_ingredientes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Acceso produccion"   ON produccion          FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 4. REAL-TIME (ignorar si ya está registrada) ────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE insumos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE recetas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE produccion;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 5. DATOS DE EJEMPLO ─────────────────────────────────────────────────────

INSERT INTO insumos (nombre, unidad, precio_compra, cantidad_compra) VALUES
  ('Harina',    'g', 15240, 25000),
  ('Margarina', 'g',  2000,  1000),
  ('Levadura',  'g',  2000,   500),
  ('Sal',       'g',   600,  1000)
ON CONFLICT DO NOTHING;

INSERT INTO recetas (nombre, panes_por_carga, precio_venta) VALUES
  ('Pan corriente', 23, 300)
ON CONFLICT DO NOTHING;

INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad)
SELECT r.id, i.id,
  CASE i.nombre
    WHEN 'Harina'    THEN 1500
    WHEN 'Margarina' THEN 220
    WHEN 'Levadura'  THEN 30
    WHEN 'Sal'       THEN 30
  END
FROM recetas r, insumos i
WHERE r.nombre = 'Pan corriente'
  AND i.nombre IN ('Harina', 'Margarina', 'Levadura', 'Sal')
ON CONFLICT DO NOTHING;
