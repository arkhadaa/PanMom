// =============================================
// auth.js
// Lógica de inicio de sesión por PIN y roles
// =============================================

import { supabase } from './supabase'

/** 
 * Verifica si el PIN ingresado existe. 
 * Retorna el objeto usuario { id, nombre, pin, rol } si es válido, 
 * o null si no existe.
 */
export async function validarPIN(pinIngresado) {
  if (!pinIngresado) return null

  const { data, error } = await supabase
    .from('usuarios_pin')
    .select('*')
    .eq('pin', pinIngresado)
    .maybeSingle()
    
  if (error) {
    console.error('Error al validar PIN:', error)
    return null
  }
  
  return data
}

/** Guarda el usuario en el navegador local */
export function guardarSesionLocal(usuario) {
  if (usuario) {
    localStorage.setItem('usuario_pan', JSON.stringify(usuario))
  } else {
    localStorage.removeItem('usuario_pan')
  }
}

/** Recupera el usuario si la sesión sigue activa */
export function obtenerSesionLocal() {
  try {
    const data = localStorage.getItem('usuario_pan')
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}
