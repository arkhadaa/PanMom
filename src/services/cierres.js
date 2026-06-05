// =============================================
// cierres.js
// Lógica para registrar y listar los cierres de caja
// usando el nuevo esquema y vista_caja_hoy.
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/**
 * Obtiene los totales de la caja del día usando límites locales 
 * para evitar bugs de zona horaria con CURRENT_DATE de Postgres.
 */
export async function obtenerCajaHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()
  const isoInicio = inicio.toISOString()
  const isoFin = fin.toISOString()

  try {
    const [pagosRes, gastosRes, retirosRes] = await Promise.all([
      supabase.from('pagos_cliente').select('monto_efectivo, monto_transferencia').gte('fecha', isoInicio).lte('fecha', isoFin),
      supabase.from('gastos').select('monto').gte('fecha_gasto', isoInicio).lte('fecha_gasto', isoFin),
      supabase.from('retiros').select('monto').gte('fecha', isoInicio).lte('fecha', isoFin)
    ])

    const ingresos_efectivo = (pagosRes.data || []).reduce((s, p) => s + (p.monto_efectivo || 0), 0)
    const ingresos_transferencia = (pagosRes.data || []).reduce((s, p) => s + (p.monto_transferencia || 0), 0)
    const total_gastos = (gastosRes.data || []).reduce((s, g) => s + (g.monto || 0), 0)
    const total_retiros = (retirosRes.data || []).reduce((s, r) => s + (r.monto || 0), 0)

    const caja_efectivo_final = ingresos_efectivo - total_gastos - total_retiros

    return {
      ingresos_efectivo,
      ingresos_transferencia,
      total_gastos,
      total_retiros,
      caja_efectivo_final
    }
  } catch (err) {
    console.error("Error obteniendo caja hoy:", err)
    return { ingresos_efectivo: 0, ingresos_transferencia: 0, total_gastos: 0, total_retiros: 0, caja_efectivo_final: 0 }
  }
}

export async function registrarCierreCaja(datos) {
  // datos espera: 
  // total_ingresos_efectivo, total_ingresos_transferencia, total_gastos, total_retiros, total_ventas, total_deuda_generada
  const { data, error } = await supabase
    .from('cierres_caja')
    .insert([datos])
    .select()

  if (error) {
    console.error('Error registrando cierre:', error)
    throw error
  }
  return data
}

export async function listarCierresCaja() {
  const { data, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error listando cierres:', error)
    return []
  }
  return data
}
