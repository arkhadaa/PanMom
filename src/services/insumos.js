// =============================================
// insumos.js
// Materias primas con precio de compra y cantidad.
// Las cantidades se almacenan en unidad base (g / ml).
// =============================================

import { supabase } from './supabase'

export async function listarInsumos() {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function crearInsumo({ nombre, unidad, precio_compra, cantidad_compra }) {
  const { data, error } = await supabase
    .from('insumos')
    .insert({
      nombre:          nombre.trim(),
      unidad,
      precio_compra:   Number(precio_compra),
      cantidad_compra: Number(cantidad_compra),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function editarInsumo(id, { nombre, unidad, precio_compra, cantidad_compra }) {
  const { data, error } = await supabase
    .from('insumos')
    .update({
      nombre:          nombre.trim(),
      unidad,
      precio_compra:   Number(precio_compra),
      cantidad_compra: Number(cantidad_compra),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarInsumo(id) {
  const { error } = await supabase.from('insumos').delete().eq('id', id)
  if (error) throw error
}
