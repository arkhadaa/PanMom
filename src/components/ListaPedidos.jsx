// =============================================
// ListaPedidos.jsx
// Lista de pedidos del día con acciones
// =============================================

import { useState, useMemo } from 'react'
import {
  ChefHat,
  PackageCheck,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wheat,
  Flame,
  DollarSign,
  Clock,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import {
  actualizarEstado,
  actualizarPago,
  anularPedido,
  formatearPesos,
  claseBadgeEstado,
  LABELS_ESTADO,
} from '../services/supabaseClient'
import EditarPedido from './EditarPedido'

// ─── Confirmación de eliminación ─────────────────────────────────────────────
function ConfirmarEliminar({ pedido, onConfirmar, onCancelar, esAdmin }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
      <div className="modal-content max-w-sm">
        <div className="text-center py-2">
          <h3 className="font-bold text-gray-800 text-lg mb-1">
            {esAdmin ? '¿Anular pedido?' : '¿Eliminar pedido?'}
          </h3>
          <p className="text-sm text-gray-500 mb-1">
            {esAdmin ? '¿Seguro que deseas anular el pedido de' : '¿Seguro que deseas eliminar el pedido de'}
          </p>
          <p className="font-bold text-gray-700 mb-4">"{pedido.clientes?.nombre}"?</p>
          <p className="text-xs text-red-500 mb-6">
            {esAdmin 
              ? 'El pedido no sumará a la caja, pero quedará registrado como anulado.'
              : 'Esta acción no se puede deshacer.'}
          </p>
          <div className="flex gap-3">
            <button onClick={onCancelar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={() => onConfirmar(pedido.id)} className="flex-1 btn-danger !text-sm !py-2.5 !px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm">
              {esAdmin ? 'Sí, anular' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta individual de pedido ─────────────────────────────────────────────
function TarjetaPedido({ pedido, onActualizar, onEditar, onEliminar, esAdmin, usuarioActual }) {
  const [expandido, setExpandido] = useState(false)
  const [cargandoAccion, setCargandoAccion] = useState(null) // 'produciendo' | 'entregado' | 'pago'

  const hora = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(pedido.fecha_pedido))

  const sigEstado = {
    pendiente:   'produciendo',
    produciendo: 'listo',
    listo:       'entregado',
    entregado:   null,
  }[pedido.estado]

  const accionEstado = {
    produciendo: { label: 'Marcar produciendo', icon: ChefHat, clase: 'btn-info' },
    listo:       { label: 'Marcar listo',       icon: PackageCheck, clase: 'btn-success' },
    entregado:   { label: 'Marcar entregado',   icon: PackageCheck, clase: 'btn-success' },
  }[sigEstado] || null

  const handleCambiarEstado = async () => {
    if (!sigEstado || cargandoAccion) return
    setCargandoAccion('estado')
    try {
      const updated = await actualizarEstado(pedido.id, sigEstado, usuarioActual?.rol || 'vendedor')
      onActualizar(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoAccion(null)
    }
  }

  const handleTogglePago = async () => {
    if (cargandoAccion) return
    setCargandoAccion('pago')
    try {
      const updated = await actualizarPago(pedido.id, !pedido.pagado, usuarioActual?.rol || 'vendedor')
      onActualizar(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoAccion(null)
    }
  }

  return (
    <div className={`card animate-slide-in border-l-4 ${
      pedido.estado === 'anulado'   ? 'border-l-red-500 opacity-60 bg-red-50/30' :
      pedido.estado === 'entregado' ? 'border-l-gray-300 opacity-75' :
      pedido.estado === 'listo'     ? 'border-l-green-400' :
      pedido.estado === 'produciendo' ? 'border-l-blue-400' :
      'border-l-orange-400'
    }`}>

      {/* ── Fila principal ── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-gray-800 text-xl md:text-2xl lg:text-3xl truncate">
              {pedido.clientes?.nombre || 'Sin nombre'}
            </h3>
            <span className={`badge ${claseBadgeEstado(pedido.estado)}`}>
              {LABELS_ESTADO[pedido.estado] || pedido.estado}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Clock size={11} />
            <span>{hora}</span>
          </div>
        </div>

        {/* Botón expandir (ya no se usa para notas, pero lo dejamos para futuras expansiones) */}
        {/*
        <button
          onClick={() => setExpandido(v => !v)}
          className="btn-secondary !p-1.5 !rounded-lg flex-shrink-0"
          aria-label={expandido ? 'Colapsar' : 'Expandir'}
        >
          {expandido
            ? <ChevronUp size={16} />
            : <ChevronDown size={16} />
          }
        </button>
        */}
      </div>

      {/* ── Info rápida: items del pedido ── */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(pedido.pedido_items?.length > 0) ? (
          pedido.pedido_items.map(item => (
            <div key={item.id} className="bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1 text-sm md:text-base lg:text-lg font-semibold">
              {item.cantidad}× {item.productos?.nombre || 'Producto'}
            </div>
          ))
        ) : (
          <>
            {pedido.cantidad_panes > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1 text-sm md:text-base lg:text-lg font-semibold">
                <Wheat size={15} className="md:w-5 md:h-5" />
                <span>{pedido.cantidad_panes} pan{pedido.cantidad_panes !== 1 ? 'es' : ''}</span>
              </div>
            )}
            {pedido.cantidad_sopaipillas > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 text-orange-700 rounded-lg px-2.5 py-1 text-sm md:text-base lg:text-lg font-semibold">
                <Flame size={15} className="md:w-5 md:h-5" />
                <span>{pedido.cantidad_sopaipillas} sopaipilla{pedido.cantidad_sopaipillas !== 1 ? 's' : ''}</span>
              </div>
            )}
          </>
        )}
        {pedido.monto_pesos > 0 && (
          <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2.5 py-1 text-sm md:text-base lg:text-lg font-semibold">
            <DollarSign size={15} className="md:w-5 md:h-5" />
            <span>{formatearPesos(pedido.monto_pesos)}</span>
          </div>
        )}
      </div>

      {/* ── Badge pago ── */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleTogglePago}
          disabled={!!cargandoAccion}
          className={`badge ${pedido.pagado ? 'badge-pagado' : 'badge-debe'} cursor-pointer hover:opacity-80 transition-opacity`}
        >
          {cargandoAccion === 'pago' ? (
            <Loader2 size={11} className="animate-spin" />
          ) : pedido.pagado ? (
            <CheckCircle2 size={11} />
          ) : (
            <XCircle size={11} />
          )}
          {pedido.pagado ? `Pagado (${pedido.metodo_pago === 'transferencia' ? '📱 Transf.' : '💵 Efect.'})` : 'Debe'}
        </button>
      </div>

      {/* ── Botones de acción rápida ── */}
      <div className="flex flex-wrap gap-2">
        {/* Avanzar estado */}
        {accionEstado && (
          <button
            onClick={handleCambiarEstado}
            disabled={!!cargandoAccion}
            className={`${accionEstado.clase}`}
          >
            {cargandoAccion === 'estado'
              ? <Loader2 size={13} className="animate-spin" />
              : <accionEstado.icon size={13} />
            }
            {accionEstado.label}
          </button>
        )}

        {/* Editar */}
        <button
          onClick={() => onEditar(pedido)}
          className="btn-orange"
          disabled={!!cargandoAccion}
        >
          <Pencil size={13} />
          Editar
        </button>

        {/* Anular/Eliminar */}
        <button
          onClick={() => onEliminar(pedido)}
          className="btn-danger bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
          disabled={!!cargandoAccion}
        >
          <Trash2 size={13} />
          {esAdmin ? 'Anular' : 'Eliminar'}
        </button>
      </div>

      {/* ── Sección Notas Permanentes ── */}
      {pedido.notas && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs md:text-sm lg:text-base font-semibold text-gray-500 mb-1">Notas del cliente:</p>
          <p className="text-sm md:text-base lg:text-lg font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100 uppercase tracking-wide">
            {esAdmin ? pedido.notas : pedido.notas.replace(/⚠️.*?(\n|$)/g, '').trim()}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Lista principal ──────────────────────────────────────────────────────────
const FILTROS = [
  { value: 'todos',       label: 'Todos'        },
  { value: 'pendiente',   label: 'Pendientes'   },
  { value: 'produciendo', label: 'Produciendo'  },
  { value: 'listo',       label: 'Listos'       },
  { value: 'entregado',   label: 'Entregados'   },
  { value: 'anulado',     label: 'Anulados'     },
]

export default function ListaPedidos({ pedidos, cargando, onPedidosActualizar, usuarioActual, onActualizar }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pedidoEditar, setPedidoEditar] = useState(null)
  const [pedidoEliminar, setPedidoEliminar] = useState(null)
  
  const esAdmin = usuarioActual?.rol === 'admin'
  const filtrosActivos = esAdmin ? FILTROS : FILTROS.filter(f => f.value !== 'anulado')

  // ── Filtrar y buscar pedidos ──
  const pedidosFiltrados = useMemo(() => {
    let lista = pedidos || []

    // Si no es admin, ocultar los anulados globalmente
    if (!esAdmin) {
      lista = lista.filter(p => p.estado !== 'anulado')
    }

    if (filtroEstado === 'todos') {
      // En la pestaña "Todos", ocultamos la basura (anulados) y los ya terminados (entregados)
      lista = lista.filter(p => p.estado !== 'anulado' && p.estado !== 'entregado')
    } else {
      lista = lista.filter(p => p.estado === filtroEstado)
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(p =>
        p.clientes?.nombre?.toLowerCase().includes(q) ||
        p.notas?.toLowerCase().includes(q)
      )
    }

    return lista
  }, [pedidos, filtroEstado, busqueda])

  // ── Actualizar un pedido en la lista (preserva pedido_items si el nuevo no los trae) ──
  const handleActualizar = (pedidoActualizado) => {
    const nuevaLista = (pedidos || []).map(p => {
      if (p.id !== pedidoActualizado.id) return p
      return {
        ...pedidoActualizado,
        pedido_items: pedidoActualizado.pedido_items ?? p.pedido_items,
      }
    })
    onPedidosActualizar(nuevaLista)
  }

  // ── Confirmar anulación ──
  const handleConfirmarEliminar = async (pedidoId) => {
    try {
      const updated = await anularPedido(pedidoId, usuarioActual?.rol || 'vendedor')
      handleActualizar(updated)
    } catch (err) {
      console.error('Error al eliminar:', err)
    } finally {
      setPedidoEliminar(null)
    }
  }

  // ── Handle edición completada ──
  const handlePedidoEditado = (pedidoActualizado) => {
    handleActualizar(pedidoActualizado)
    setPedidoEditar(null)
  }

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto">

      {/* ── Título y Botón Actualizar ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pedidos de Hoy</h2>
          <p className="text-sm text-gray-500">
            {(pedidos || []).filter(p => p.estado !== 'anulado').length} pedido(s) válido(s) hoy
          </p>
        </div>
        {onActualizar && (
          <button
            onClick={onActualizar}
            className="flex items-center gap-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        )}
      </div>

      {/* ── Buscador ── */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          className="input-field !pl-9 !py-2.5"
        />
      </div>

      {/* ── Filtros de estado ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {filtrosActivos.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${filtroEstado === f.value
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {f.label}
            {f.value !== 'todos' && (
              <span className={`ml-1 ${filtroEstado === f.value ? 'text-white/80' : 'text-gray-400'}`}>
                ({(pedidos || []).filter(p => p.estado === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Skeleton loading ── */}
      {cargando && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Sin pedidos ── */}
      {!cargando && pedidosFiltrados.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-bold text-gray-700 mb-1">
            {busqueda || filtroEstado !== 'todos'
              ? 'No hay pedidos con ese filtro'
              : 'Sin pedidos hoy'
            }
          </h3>
          <p className="text-sm text-gray-400">
            {busqueda
              ? 'Intenta con otro nombre de cliente.'
              : filtroEstado !== 'todos'
              ? 'Prueba con otro estado.'
              : 'Agrega el primer pedido del día.'
            }
          </p>
        </div>
      )}

      {/* ── Lista de pedidos ── */}
      {!cargando && pedidosFiltrados.length > 0 && (
        <div className="space-y-3">
          {pedidosFiltrados.map(pedido => (
            <TarjetaPedido
              key={pedido.id}
              pedido={pedido}
              onActualizar={handleActualizar}
              onEditar={setPedidoEditar}
              onEliminar={setPedidoEliminar}
              esAdmin={esAdmin}
              usuarioActual={usuarioActual}
            />
          ))}
        </div>
      )}

      {/* ── Modal editar ── */}
      {pedidoEditar && (
        <EditarPedido
          pedido={pedidoEditar}
          onCerrar={() => setPedidoEditar(null)}
          onPedidoEditado={handlePedidoEditado}
        />
      )}

      {/* ── Modal confirmar eliminar ── */}
      {pedidoEliminar && (
        <ConfirmarEliminar
          pedido={pedidoEliminar}
          onConfirmar={handleConfirmarEliminar}
          onCancelar={() => setPedidoEliminar(null)}
          esAdmin={esAdmin}
        />
      )}
    </div>
  )
}
