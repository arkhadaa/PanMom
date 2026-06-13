// =============================================
// compromisos.js
// Gestión de compromisos financieros (pasivos futuros)
// =============================================

import { supabase } from './supabase'

/** Lista todos los compromisos ordenados por fecha */
export async function listarCompromisos() {
  const { data, error } = await supabase
    .from('compromisos_financieros')
    .select('*')
    .order('estado', { ascending: false }) // pendiente primero
    .order('fecha', { ascending: true })
  
  if (error) throw error
  return data || []
}

/** Registra un nuevo compromiso */
export async function registrarCompromiso({ concepto, monto, fecha, tipo, usuario }) {
  const { data, error } = await supabase
    .from('compromisos_financieros')
    .insert({
      concepto: concepto.trim(),
      monto: Number(monto),
      fecha: fecha, // YYYY-MM-DD
      tipo: tipo || 'Personal',
      estado: 'pendiente',
      usuario: usuario || 'sistema'
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

/** Marca un compromiso como completado */
export async function completarCompromiso(id) {
  const { data, error } = await supabase
    .from('compromisos_financieros')
    .update({ 
      estado: 'completado',
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/** Elimina un compromiso */
export async function eliminarCompromiso(id) {
  const { error } = await supabase
    .from('compromisos_financieros')
    .delete()
    .eq('id', id)
    
  if (error) throw error
  return true
}
