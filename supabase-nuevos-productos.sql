-- =============================================
-- supabase-nuevos-productos.sql
-- Ejecutar en Supabase SQL Editor
-- =============================================

INSERT INTO productos (nombre, precio_venta, tiene_receta, receta_id) VALUES
  ('Pan ave mayo', 1500, false, null),
  ('Pan mantequilla', 500, false, null),
  ('Pan aliado', 1300, false, null),
  ('Pan membrillo', 700, false, null),
  ('Churrasco queso', 2500, false, null),
  ('Oferta 7 panes x $2000', 2000, false, null);
