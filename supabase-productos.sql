-- =============================================
-- supabase-productos.sql
-- Catálogo de productos, líneas de pedido y retiros.
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- =============================================

-- ─── PRODUCTOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(100)  NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  tiene_receta BOOLEAN DEFAULT FALSE,   -- TRUE = tiene costo calculado (pan, etc)
  receta_id    INT REFERENCES recetas(id) ON DELETE SET NULL,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── LÍNEAS DE PEDIDO ─────────────────────────────────────────────────────────
-- Reemplaza cantidad_panes / cantidad_sopaipillas (columnas fijas)
CREATE TABLE IF NOT EXISTS pedido_items (
  id              SERIAL PRIMARY KEY,
  pedido_id       INT NOT NULL REFERENCES pedidos(id)   ON DELETE CASCADE,
  producto_id     INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        INT           NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL              -- snapshot del precio al vender
);

-- ─── RETIROS ──────────────────────────────────────────────────────────────────
-- Dinero que el dueño retira de la caja del día
CREATE TABLE IF NOT EXISTS retiros (
  id          SERIAL PRIMARY KEY,
  monto       DECIMAL(10,2) NOT NULL,
  descripcion VARCHAR(100),
  dia         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE productos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiros      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "open_productos"    ON productos    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "open_pedido_items" ON pedido_items FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "open_retiros"      ON retiros      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── REAL-TIME ────────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pedido_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE retiros;      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── DATOS BASE ───────────────────────────────────────────────────────────────
INSERT INTO productos (nombre, precio_venta, tiene_receta) VALUES
  ('Pan corriente', 300,  TRUE),
  ('Pan de huevo',  1000, FALSE),
  ('Consomé',       1000, FALSE),
  ('Té',             500, FALSE),
  ('Café',           700, FALSE)
ON CONFLICT DO NOTHING;

-- Vincular "Pan corriente" con su receta
UPDATE productos
SET receta_id = (SELECT id FROM recetas WHERE LOWER(nombre) LIKE '%pan corriente%' LIMIT 1)
WHERE nombre = 'Pan corriente' AND receta_id IS NULL;
