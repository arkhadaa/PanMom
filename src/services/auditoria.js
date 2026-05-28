// =============================================
// auditoria.js
// Historial completo de movimientos del día
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/** Lista todos los movimientos del historial de hoy con info del pedido y cliente. */
export async function listarAuditoriaHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()

  const { data, error } = await supabase
    .from('historial')
    .select('*, pedidos ( id, monto_pesos, estado, clientes ( nombre ) )')
    .gte('timestamp', inicio.toISOString())
    .lte('timestamp', fin.toISOString())
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data || []
}
