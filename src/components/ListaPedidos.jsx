// =============================================
// ListaPedidos.jsx
// Lista de pedidos del día con acciones
// =============================================

import { useState, useMemo, useEffect } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import {
  actualizarEstado,
  anularPedido,
  formatearPesos,
  claseBadgeEstado,
  LABELS_ESTADO,
} from '../services/supabaseClient'
import { listarPedidosPorFecha } from '../services/pedidos'
import EditarPedido from './EditarPedido'

// ─── Timer Dinámico ───────────────────────────────────────────────────────────
function TimerPedido({ fechaPedido, fechaEntrega, estado }) {
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    // Solo actualizar si está pendiente o listo
    if (estado === 'entregado' || estado === 'anulado') return
    const timer = setInterval(() => setAhora(new Date()), 30000) // cada 30 seg
    return () => clearInterval(timer)
  }, [estado])

  if (estado === 'entregado' || estado === 'anulado') return null

  if (fechaEntrega) {
    const fEntrega = new Date(fechaEntrega)
    const diffMin = Math.round((fEntrega - ahora) / 60000)

    if (diffMin > 60) {
      const horas = Math.floor(diffMin / 60)
      const mins = diffMin % 60
      return <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 text-[10px]">Faltan {horas}h {mins}m</span>
    } else if (diffMin > 0) {
      return <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 text-[10px]">Faltan {diffMin} min</span>
    } else if (diffMin === 0) {
      return <span className="font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded ml-1 text-[10px]">¡Es hora!</span>
    } else {
      return <span className="font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded ml-1 text-[10px]">Atrasado {Math.abs(diffMin)} min</span>
    }
  }

  // Pedido normal
  const fPedido = new Date(fechaPedido)
  const diffMin = Math.max(0, Math.floor((ahora - fPedido) / 60000))
  
  let color = 'text-gray-500 bg-gray-100'
  if (diffMin >= 30) color = 'text-red-600 bg-red-100'
  else if (diffMin >= 15) color = 'text-orange-600 bg-orange-100'

  return (
    <span className={`font-bold px-1.5 py-0.5 rounded ml-1 text-[10px] ${color}`}>
      ⏳ {diffMin} min
    </span>
  )
}


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
function TarjetaPedido({ pedido, onActualizar, onEditar, onEliminar, esAdmin, usuarioActual, onIrADeudas, esHistorial }) {
  const [expandido, setExpandido] = useState(false)
  const [cargandoAccion, setCargandoAccion] = useState(null) // 'estado'

  const pagos = pedido.pagos_cliente || []
  const abonado = pagos.reduce((s, p) => s + (p.monto_efectivo || 0) + (p.monto_transferencia || 0), 0)
  const ef = pagos.reduce((s, p) => s + (p.monto_efectivo || 0), 0)
  const tr = pagos.reduce((s, p) => s + (p.monto_transferencia || 0), 0)
  const pagado = (pedido.monto_pesos || 0) > 0 && abonado >= pedido.monto_pesos
  const deudaPendiente = Math.max(0, (pedido.monto_pesos || 0) - abonado)

  const hora = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(pedido.fecha_pedido))

  const sigEstado = {
    pendiente: 'listo',
    listo:     'entregado',
    entregado: null,
  }[pedido.estado]

  const accionEstado = {
    listo:     { label: 'Marcar listo',     icon: PackageCheck, clase: 'btn-success' },
    entregado: { label: 'Marcar entregado', icon: PackageCheck, clase: 'btn-success' },
  }[sigEstado] || null

  const puedeEditar = esAdmin || (!pedido.estado.includes('entregado') && !pedido.estado.includes('anulado'))

  const handleCambiarEstado = async () => {
    if (!sigEstado || cargandoAccion) return
    setCargandoAccion('estado')
    try {
      const updated = await actualizarEstado(pedido.id, sigEstado, usuarioActual?.nombre || 'sistema')
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
      pedido.estado === 'produciendo' ? 'border-l-blue-400' : // legacy
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
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 flex-wrap">
            <Clock size={11} />
            <span>Creado: {hora}</span>
            <TimerPedido fechaPedido={pedido.fecha_pedido} fechaEntrega={pedido.fecha_entrega} estado={pedido.estado} />
            
            {pedido.fecha_entrega && (
              <>
                <span className="mx-1 hidden sm:inline">•</span>
                <span className="font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0">
                  <Clock size={12} className="inline-block" />
                  Entrega: {new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(pedido.fecha_entrega))}
                </span>
              </>
            )}
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
          pedido.pedido_items.map((item, i) => (
            <div key={item.id || i} className="bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1 text-sm md:text-base lg:text-lg font-semibold">
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
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {pagado ? (
          <span className="badge badge-pagado">
            <CheckCircle2 size={11} />
            {ef > 0 && tr > 0
              ? `Pagado (💵 $${ef.toLocaleString('es-CL')} + 📱 $${tr.toLocaleString('es-CL')})`
              : tr > 0 ? 'Pagado (📱 Transf.)'
              : 'Pagado (💵 Efect.)'
            }
          </span>
        ) : (
          <>
            <span className="badge badge-debe">
              <XCircle size={11} />
              {abonado > 0 ? `Abono $${abonado.toLocaleString('es-CL')} (Debe $${deudaPendiente.toLocaleString('es-CL')})` : 'Fiado'}
            </span>
            {onIrADeudas && (
              <button
                onClick={onIrADeudas}
                className="text-xs text-orange-500 font-bold underline underline-offset-2 flex items-center gap-0.5"
              >
                Cobrar en Deudas →
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Acciones (ocultas en historial) ── */}
      {!esHistorial && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {accionEstado && (
            <button
              onClick={handleCambiarEstado}
              disabled={cargandoAccion === 'estado'}
              className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors shadow-sm ${accionEstado.clase} disabled:opacity-50`}
            >
              {cargandoAccion === 'estado' ? <Loader2 size={15} className="animate-spin" /> : <accionEstado.icon size={15} />}
              {accionEstado.label}
            </button>
          )}

          {puedeEditar && (
            <button
              onClick={() => onEditar(pedido)}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} />
              Editar
            </button>
          )}
        </div>
      )}

      {/* Botón de anular/eliminar (solo superadmin o si no está listo/entregado, oculto en historial) */}
      {!esHistorial && (puedeEditar || esAdmin) && (
        <div className="mt-2 text-right">
          <button
            onClick={() => onEliminar(pedido)}
            className="text-[10px] text-gray-400 hover:text-red-500 uppercase tracking-wider font-bold transition-colors flex items-center gap-1 ml-auto"
          >
            <Trash2 size={13} />
            {esAdmin ? 'Anular' : 'Eliminar'}
          </button>
        </div>
      )}

      {/* ── Sección Notas Permanentes ── */}
      {pedido.notas && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs md:text-sm lg:text-base font-semibold text-gray-500 mb-1">Notas del cliente:</p>
          <p className="text-sm md:text-base lg:text-lg font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100 uppercase tracking-wide whitespace-pre-wrap">
            {pedido.notas}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Lista principal ──────────────────────────────────────────────────────────
const FILTROS = [
  { value: 'todos',     label: 'Todos'      },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'listo',     label: 'Listos'     },
  { value: 'entregado', label: 'Entregados' },
  { value: 'anulado',   label: 'Anulados'   },
]

export default function ListaPedidos({ pedidos, cargando, onPedidosActualizar, usuarioActual, onActualizar, onIrADeudas }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pedidoEditar, setPedidoEditar] = useState(null)
  const [pedidoEliminar, setPedidoEliminar] = useState(null)
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [pedidosHistoricos, setPedidosHistoricos] = useState([])
  const [cargandoHistorico, setCargandoHistorico] = useState(false)
  
  const esAdmin = usuarioActual?.rol === 'superadmin'
  const filtrosActivos = esAdmin ? FILTROS : FILTROS.filter(f => f.value !== 'anulado')

  // ── Cargar historial ──
  useEffect(() => {
    if (!fechaFiltro) {
      setPedidosHistoricos([])
      return
    }
    let isActive = true
    const fetchHistorico = async () => {
      setCargandoHistorico(true)
      try {
        const data = await listarPedidosPorFecha(fechaFiltro)
        if (isActive) setPedidosHistoricos(data)
      } catch (err) {
        console.error('Error fetching historial:', err)
      } finally {
        if (isActive) setCargandoHistorico(false)
      }
    }
    fetchHistorico()
    return () => { isActive = false }
  }, [fechaFiltro])

  const pedidosActivos = fechaFiltro ? pedidosHistoricos : pedidos
  const esHistorial = !!fechaFiltro
  const isLoading = esHistorial ? cargandoHistorico : cargando

  // ── Filtrar y buscar pedidos ──
  const pedidosFiltrados = useMemo(() => {
    let lista = pedidosActivos || []

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
  }, [pedidosActivos, filtroEstado, busqueda, esAdmin])

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
      const updated = await anularPedido(pedidoId, usuarioActual?.nombre || 'sistema')
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
          <h2 className="text-xl font-bold text-gray-800">
            {esHistorial ? 'Historial de Pedidos' : 'Pedidos de Hoy'}
          </h2>
          <p className="text-sm text-gray-500">
            {(pedidosActivos || []).filter(p => p.estado !== 'anulado').length} pedido(s) válido(s) {esHistorial ? 'en fecha' : 'hoy'}
          </p>
        </div>
        {onActualizar && !esHistorial && (
          <button
            onClick={onActualizar}
            className="flex items-center gap-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        )}
      </div>

      {/* ── Buscador y Filtro de Fecha ── */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            className="input-field !pl-9 !py-2.5 w-full"
          />
        </div>
        <input 
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          max={new Date().toISOString().split('T')[0]} // no permitir fechas futuras
          className="input-field !py-2.5 !px-3 text-sm text-gray-600 bg-white w-auto"
          title="Ver historial de otro día"
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
                {(pedidosActivos || []).filter(p => p.estado === f.value).length > 0 
                  ? `(${(pedidosActivos || []).filter(p => p.estado === f.value).length})`
                  : ''}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Skeleton loading ── */}
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Aviso de Historial ── */}
      {esHistorial && !isLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700">
          <Clock size={18} className="flex-shrink-0" />
          <p className="text-sm font-medium">Estás viendo el historial (modo lectura). Para editar, debes volver al día de Hoy borrando la fecha.</p>
        </div>
      )}

      {/* ── Sin pedidos ── */}
      {!isLoading && pedidosFiltrados.length === 0 && (
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
      {!isLoading && pedidosFiltrados.length > 0 && (
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
              onIrADeudas={onIrADeudas}
              esHistorial={esHistorial}
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
          usuarioActual={usuarioActual}
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
