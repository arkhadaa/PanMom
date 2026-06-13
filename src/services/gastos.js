// =============================================
// gastos.js
// Gastos operacionales del día (harina, gas, etc.).
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/** Registra un gasto del día o histórico. */
export async function registrarGasto({ descripcion, monto, usuario, insumo_id, metodo_pago, fecha_operacion }) {
  const insertData = {
    descripcion: descripcion?.trim() || 'Gasto',
    monto:       Number(monto) || 0,
    usuario:     usuario || 'sistema',
    insumo_id:   insumo_id || null,
    metodo_pago: metodo_pago || 'efectivo',
    fecha_operacion: fecha_operacion ? new Date(fecha_operacion).toISOString() : new Date().toISOString(),
    fecha_gasto: fecha_operacion ? new Date(fecha_operacion).toISOString() : new Date().toISOString(), // Mantenemos por retrocompatibilidad
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert(insertData)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Lista los gastos del día actual. */
export async function listarGastosHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .gte('fecha_gasto', inicio.toISOString())
    .lte('fecha_gasto', fin.toISOString())
    .order('fecha_gasto', { ascending: false })

  if (error) throw error
  return data || []
}

/** Elimina un gasto por ID. */
export async function eliminarGasto(gastoId) {
  const { error } = await supabase.from('gastos').delete().eq('id', gastoId)
  if (error) throw error
  return true
}
