// =============================================
// pedidos.js
// CRUD de pedidos, líneas de pedido (pedido_items),
// historial de cambios y suscripción real-time.
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

export const PUBLICO_GENERAL_ID = 7;

// ──────────────────────────────────────────
// CLIENTES (helper interno)
// ──────────────────────────────────────────

/** Busca un cliente por nombre; lo crea si no existe. */
export async function obtenerOCrearCliente(nombre, telefono = null) {
  if (!nombre || nombre.trim().toLowerCase() === 'público general') {
    return { id: PUBLICO_GENERAL_ID, nombre: 'Público General' }
  }

  const { data: existente, error: errBuscar } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nombre', nombre.trim())
    .maybeSingle()

  if (errBuscar) throw errBuscar
  if (existente) return existente

  const { data: nuevo, error: errCrear } = await supabase
    .from('clientes')
    .insert({ nombre: nombre.trim(), telefono })
    .select()
    .single()

  if (errCrear) throw errCrear
  return nuevo
}

/** Lista todos los clientes ordenados por nombre alfabéticamente. */
export async function listarTodosClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre')
    .order('nombre')

  if (error) return []
  return data || []
}

/** Extrae los clientes únicos de los últimos pedidos (más frecuentes/recientes). */
export async function listarClientesFrecuentes(limite = 5) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('clientes ( id, nombre )')
    .order('fecha_pedido', { ascending: false })
    .limit(50)

  if (error) return []

  const unicos = []
  const ids = new Set()
  for (const row of (data || [])) {
    if (row.clientes && !ids.has(row.clientes.id) && row.clientes.id !== PUBLICO_GENERAL_ID) {
      ids.add(row.clientes.id)
      unicos.push(row.clientes)
      if (unicos.length >= limite) break
    }
  }
  return unicos
}

// ──────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────

export async function registrarHistorial(pedidoId, accion, usuario = 'sistema') {
  const { error } = await supabase
    .from('historial')
    .insert({ pedido_id: pedidoId, accion, usuario })
  if (error) console.warn('Historial:', error.message)
}

// ──────────────────────────────────────────
// PEDIDOS
// ──────────────────────────────────────────

/** Crea un pedido con sus líneas de producto. */
export async function crearPedido({ nombreCliente, items = [], metodoPago = 'fiado', montoEfectivo, notas, fechaEntrega, usuario = 'sistema' }) {
  const cliente    = await obtenerOCrearCliente(nombreCliente)
  const montoPesos = Math.round(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))

  const insertData = {
    cliente_id:   cliente.id,
    monto_pesos:  montoPesos,
    estado:       'pendiente',
    notas:        notas || null,
    fecha_entrega: fechaEntrega || null,
    fecha_pedido: new Date().toISOString(),
    usuario:      usuario
  }

  const { data, error } = await supabase
    .from('pedidos')
    .insert(insertData)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error

  if (items.length > 0) {
    const { error: errItems } = await supabase
      .from('pedido_items')
      .insert(items.map(i => ({
        pedido_id:       data.id,
        producto_id:     Number(i.producto_id),
        cantidad:        Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
      })))
    if (errItems) console.warn('pedido_items insert:', errItems.message)
  }

  // Insertar pago si no es fiado
  if (metodoPago !== 'fiado') {
    let ef = 0;
    let tr = 0;
    if (metodoPago === 'efectivo') ef = montoPesos;
    else if (metodoPago === 'transferencia') tr = montoPesos;
    else if (metodoPago === 'mixto') {
      ef = Number(montoEfectivo) || 0;
      tr = Math.max(0, montoPesos - ef);
    }

    if (ef + tr > 0) {
      const { error: errPago } = await supabase
        .from('pagos_cliente')
        .insert({
          cliente_id: cliente.id,
          pedido_id: data.id,
          monto_efectivo: ef,
          monto_transferencia: tr,
          usuario: usuario,
          notas: `Pago directo en creación`
        });
      if (errPago) console.warn('pagos_cliente insert:', errPago.message);
    }
  }

  await registrarHistorial(data.id, 'Pedido creado', usuario)
  return data
}

/** Lista los pedidos de hoy con cliente e items. */
export async function listarPedidosHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()

  const { data, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono ), pedido_items ( id, producto_id, cantidad, precio_unitario, productos ( id, nombre, precio_venta, receta_id, cantidad_panes ) ), pagos_cliente ( monto_efectivo, monto_transferencia )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (!error) return data || []

  console.warn('listarPedidosHoy fallback:', error.message)
  const { data: data2, error: error2 } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (error2) throw error2
  return data2 || []
}

/** Lista los pedidos de una fecha histórica. */
export async function listarPedidosPorFecha(fechaStr) {
  const { inicio, fin } = obtenerLimitesDiaNegocio(fechaStr)

  const { data, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono ), pedido_items ( id, producto_id, cantidad, precio_unitario, productos ( id, nombre, precio_venta, receta_id, cantidad_panes ) ), pagos_cliente ( monto_efectivo, monto_transferencia )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (!error) return data || []

  console.warn('listarPedidosPorFecha fallback:', error.message)
  const { data: data2, error: error2 } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (error2) throw error2
  return data2 || []
}

/** Avanza el estado de un pedido. */
export async function actualizarEstado(pedidoId, nuevoEstado, usuario = 'sistema') {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error
  await registrarHistorial(pedidoId, `Estado: ${nuevoEstado}`, usuario)
  return data
}

/** Edita un pedido reemplazando sus líneas de producto. */
export async function editarPedido(pedidoId, { nombreCliente, items = [], notas, fechaEntrega, estado }, usuario = 'sistema') {
  const { data: original } = await supabase.from('pedidos').select('monto_pesos, notas, clientes(nombre)').eq('id', pedidoId).single()

  const cliente = await obtenerOCrearCliente(nombreCliente)

  const montoPesos = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))
    : (original?.monto_pesos ?? 0)

  const updateData = {
    cliente_id:    cliente.id,
    monto_pesos:   montoPesos,
    estado:        estado || 'pendiente',
    notas:         notas ? notas.trim() : null,
    fecha_entrega: fechaEntrega !== undefined ? fechaEntrega : undefined,
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update(updateData)
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error

  if (items.length > 0) {
    await supabase.from('pedido_items').delete().eq('pedido_id', pedidoId)
    const { error: errItems } = await supabase
      .from('pedido_items')
      .insert(items.map(i => ({
        pedido_id:       pedidoId,
        producto_id:     Number(i.producto_id),
        cantidad:        Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
      })))
    if (errItems) console.warn('pedido_items edit:', errItems.message)
  }

  await registrarHistorial(pedidoId, 'Pedido editado', usuario)
  return obtenerPedidoConDetalle(pedidoId)
}

/** Anula un pedido (Soft delete). No se borra para auditoría. */
export async function anularPedido(pedidoId, usuario = 'sistema') {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'anulado' })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()
    
  if (error) throw error
  await registrarHistorial(pedidoId, 'Pedido ANULADO', usuario)
  
  // Opcional: si un pedido se anula, se podrian anular sus pagos, 
  // pero para no complicar el modelo ahora mismo, 
  // confiamos en que el admin los arregle o no se devuelva.
  return data
}

// ──────────────────────────────────────────
// REAL-TIME
// ──────────────────────────────────────────

/** Suscribe a cambios en la tabla pedidos. Retorna función de cancelación. */
export function suscribirPedidos(callback) {
  const channel = supabase
    .channel('pedidos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, callback)
    .subscribe((status, error) => {
      if (error) {
        console.error('Error suscribiendo a pedidos:', error.message)
        return () => {}
      }
    })

  return () => { supabase.removeChannel(channel) }
}

/** Trae un pedido individual con todos sus joins (usado por real-time). */
export async function obtenerPedidoConDetalle(pedidoId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono ), pedido_items ( id, producto_id, cantidad, precio_unitario, productos ( id, nombre, precio_venta, receta_id, cantidad_panes ) ), pagos_cliente ( monto_efectivo, monto_transferencia )')
    .eq('id', pedidoId)
    .single()
  if (error) throw error
  return data
}
