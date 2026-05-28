// =============================================
// gastos.js
// Gastos operacionales del día (harina, gas, etc.).
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/** Registra un gasto del día. */
export async function registrarGasto({ descripcion, monto }) {
  const { data, error } = await supabase
    .from('gastos')
    .insert({
      descripcion: descripcion.trim(),
      monto:       Math.round(Number(monto) || 0),
      fecha_gasto: new Date().toISOString(),
    })
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
