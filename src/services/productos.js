// =============================================
// productos.js
// Catálogo de productos de venta.
// Cada producto puede (o no) tener receta asociada.
// =============================================

import { supabase } from './supabase'

export async function listarProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('id')
  if (error) throw error
  return data || []
}

export async function crearProducto({ nombre, precio_venta, tiene_receta = false, receta_id = null }) {
  const { data, error } = await supabase
    .from('productos')
    .insert({
      nombre:       nombre.trim(),
      precio_venta: Number(precio_venta) || 0,
      tiene_receta,
      receta_id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function editarProducto(id, { nombre, precio_venta, tiene_receta, receta_id }) {
  const { data, error } = await supabase
    .from('productos')
    .update({
      nombre:       nombre.trim(),
      precio_venta: Number(precio_venta) || 0,
      tiene_receta: !!tiene_receta,
      receta_id:    receta_id || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Desactiva un producto (soft-delete: no lo elimina de la BD). */
export async function desactivarProducto(id) {
  const { error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}
