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

/** Registra una compra de insumo en el historial y actualiza el precio/cantidad base del insumo. */
export async function registrarCompraInsumo(insumoId, cantidad, costoTotal, usuario) {
  // 1. Registrar la compra en compras_insumos
  const { error: errCompra } = await supabase
    .from('compras_insumos')
    .insert({
      insumo_id: insumoId,
      cantidad: Number(cantidad),
      costo_total: Number(costoTotal),
      usuario: usuario || 'sistema'
    })
  if (errCompra) throw errCompra

  // 2. Actualizar el insumo con el nuevo precio y cantidad base
  const { error: errUpdate } = await supabase
    .from('insumos')
    .update({
      precio_compra: Number(costoTotal),
      cantidad_compra: Number(cantidad)
    })
    .eq('id', insumoId)
  if (errUpdate) throw errUpdate
  
  return true
}

export async function listarComprasInsumos() {
  const { data, error } = await supabase
    .from('compras_insumos')
    .select('*, insumos ( nombre, unidad )')
    .order('fecha', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function obtenerInversionInsumosMes() {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('compras_insumos')
    .select('costo_total, fecha, insumos ( nombre )')
    .gte('fecha', inicioMes)
    .lte('fecha', finMes)
    .order('fecha', { ascending: false })

  if (error) throw error
  
  const total = (data || []).reduce((acc, curr) => acc + (curr.costo_total || 0), 0)
  return {
    total,
    compras: data || []
  }
}
