// =============================================
// Auditoria.jsx
// Historial completo de movimientos (solo superadmin)
// =============================================

import { useState, useEffect } from 'react'
import { RefreshCw, Clock, User, FileText } from 'lucide-react'
import { listarAuditoriaHoy, formatearPesos } from '../services/supabaseClient'

const ICONO_ACCION = {
  'Pedido creado':           '🛒',
  'Pedido editado':          '✏️',
  'Pedido ANULADO':          '🚫',
  'Edición sospechosa':      '⚠️',
  'Marcado como pagado':     '💵',
  'Pago revertido (anulado pago)': '↩️',
}

function iconoAccion(accion = '') {
  for (const [clave, icono] of Object.entries(ICONO_ACCION)) {
    if (accion.includes(clave)) return icono
  }
  if (accion.startsWith('Estado:')) return '🔄'
  return '📋'
}

function colorAccion(accion = '') {
  if (accion.includes('ANULADO') || accion.includes('sospechosa')) return 'border-l-red-400 bg-red-50/40'
  if (accion.includes('pagado'))   return 'border-l-green-400 bg-green-50/40'
  if (accion.includes('creado'))   return 'border-l-orange-400 bg-orange-50/40'
  if (accion.startsWith('Estado:')) return 'border-l-blue-400 bg-blue-50/40'
  return 'border-l-gray-300 bg-white'
}

export default function Auditoria() {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await listarAuditoriaHoy()
      setMovimientos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const formatHora = (ts) =>
    new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(ts))

  return (
    <div className="p-4 max-w-2xl mx-auto safe-bottom">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Auditoría</h2>
          <p className="text-sm text-gray-500">{movimientos.length} movimiento(s) hoy</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {cargando && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="card text-center py-8 text-red-500">
          <p className="font-semibold">Error al cargar</p>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
        </div>
      )}

      {!cargando && !error && movimientos.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-bold text-gray-700">Sin movimientos hoy</h3>
          <p className="text-sm text-gray-400 mt-1">Los movimientos aparecerán aquí en tiempo real.</p>
        </div>
      )}

      {!cargando && movimientos.length > 0 && (
        <div className="space-y-2">
          {movimientos.map((m) => (
            <div
              key={m.id}
              className={`card !py-3 !px-4 border-l-4 ${colorAccion(m.accion)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-lg leading-none mt-0.5">{iconoAccion(m.accion)}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{m.accion}</p>
                    {m.pedidos?.clientes?.nombre && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <User size={10} />
                        {m.pedidos.clientes.nombre}
                        {m.pedidos.monto_pesos > 0 && (
                          <span className="text-gray-400">· {formatearPesos(m.pedidos.monto_pesos)}</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <FileText size={10} />
                      por <span className="font-medium">{m.usuario}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <Clock size={10} />
                  {formatHora(m.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
