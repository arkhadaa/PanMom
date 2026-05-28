// =============================================
// cierres.js
// Lógica para registrar y listar los cierres de caja
// =============================================

import { supabase } from './supabase'

export async function registrarCierreCaja(datos) {
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
