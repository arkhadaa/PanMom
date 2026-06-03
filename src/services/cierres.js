// =============================================
// cierres.js
// Lógica para registrar y listar los cierres de caja
// usando el nuevo esquema y vista_caja_hoy.
// =============================================

import { supabase } from './supabase'

/**
 * Obtiene los totales de la caja del día usando la vista SQL
 */
export async function obtenerCajaHoy() {
  const { data, error } = await supabase
    .from('vista_caja_hoy')
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Si no hay pagos hoy, la vista podría devolver cero filas (dependiendo de la implementación de supabase single())
      // Manejamos el fallback a 0.
      return {
        ingresos_efectivo: 0,
        ingresos_transferencia: 0,
        total_gastos: 0,
        total_retiros: 0,
        caja_efectivo_final: 0
      }
    }
    console.error("Error obteniendo caja hoy:", error)
    throw error
  }
  
  return data
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
