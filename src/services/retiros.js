// =============================================
// retiros.js
// Retiros de caja del día (plata que saca el dueño)
// y cálculo del estado de caja.
// =============================================

import { supabase } from './supabase'

/** Lista los retiros del día actual. */
export async function listarRetirosHoy() {
  const diaHoy = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('retiros')
    .select('*')
    .eq('dia', diaHoy)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

/** Registra un retiro de caja. */
export async function registrarRetiro({ monto, descripcion }) {
  const { data, error } = await supabase
    .from('retiros')
    .insert({
      monto:       Math.round(Number(monto) || 0),
      descripcion: descripcion?.trim() || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Elimina un retiro por ID. */
export async function eliminarRetiro(id) {
  const { error } = await supabase.from('retiros').delete().eq('id', id)
  if (error) throw error
}

/**
 * Calcula el estado de caja del día.
 * Caja = Cobrado − Gastos − Retiros
 */
export function calcularCajaHoy(pedidos, gastos, retiros) {
  const cobrado      = (pedidos  || []).filter(p => p.pagado).reduce((s, p) => s + (p.monto_pesos || 0), 0)
  const totalGastos  = (gastos   || []).reduce((s, g) => s + (g.monto || 0), 0)
  const totalRetiros = (retiros  || []).reduce((s, r) => s + (r.monto || 0), 0)
  const caja         = cobrado - totalGastos - totalRetiros
  return { cobrado, totalGastos, totalRetiros, caja }
}
