-- Tabla simple de configuración
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(50) PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '0'
);

-- Valores iniciales
INSERT INTO configuracion (clave, valor) VALUES
  ('costo_pan_unitario',        '0'),
  ('costo_sopaipilla_unitario', '0')
ON CONFLICT DO NOTHING;

-- Acceso abierto (uso interno familiar)
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total configuracion"
  ON configuracion FOR ALL USING (true) WITH CHECK (true);
