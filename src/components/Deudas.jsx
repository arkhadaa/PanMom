// =============================================
// Deudas.jsx
// Cuenta corriente por cliente: historial de
// cargos y abonos con saldo acumulado.
// =============================================

import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { listarCuentasClientes, registrarPagoCliente, formatearPesos } from '../services/supabaseClient'
import { obtenerLimitesDiaNegocio } from '../services/helpers'

// ─── Tarjeta de cliente ───────────────────────────────────────────────────────
function TarjetaCliente({ cliente, onPagoRegistrado }) {
  const [expandido, setExpandido] = useState(false)
  const [mostraPago, setMostraPago] = useState(false)
  const [monto, setMonto] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

  const formatFecha = (ts) =>
    new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts))

  const handlePagar = async (metodo_pago) => {
    const montoNum = parseInt(monto.replace(/\D/g, ''), 10)
    if (!montoNum || montoNum <= 0) { setError('Ingresa un monto válido'); return }
    if (montoNum > cliente.saldo) { setError(`El monto no puede superar ${formatearPesos(cliente.saldo)}`); return }
    setProcesando(true)
    setError(null)
    try {
      await registrarPagoCliente({ clienteId: cliente.id, monto: montoNum, metodo_pago })
      setMonto('')
      setMostraPago(false)
      onPagoRegistrado()
    } catch (e) {
      setError('Error al registrar pago')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="card !p-0 overflow-hidden border border-gray-100 shadow-sm">

      {/* ── Cabecera ── */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-800 text-xl truncate">{cliente.nombre}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {cliente.movimientos.filter(m => m.tipo === 'cargo').length} pedido(s) pendiente(s)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-extrabold text-red-500">{formatearPesos(cliente.saldo)}</span>
            <button
              onClick={() => setExpandido(v => !v)}
              className="btn-secondary !p-1.5 !rounded-lg"
            >
              {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Botón cobrar */}
        {!mostraPago ? (
          <button
            onClick={() => setMostraPago(true)}
            className="mt-3 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            💰 Registrar pago
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium flex-shrink-0">$</span>
              <input
                type="number"
                inputMode="numeric"
                value={monto}
                onChange={e => { setMonto(e.target.value); setError(null) }}
                placeholder={`Máx. ${formatearPesos(cliente.saldo)}`}
                className="input-field !py-2 flex-1 text-lg font-bold"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handlePagar('efectivo')}
                disabled={procesando}
                className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {procesando ? <Loader2 size={14} className="animate-spin" /> : '💵'}
                Efectivo
              </button>
              <button
                onClick={() => handlePagar('transferencia')}
                disabled={procesando}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {procesando ? <Loader2 size={14} className="animate-spin" /> : '📱'}
                Transf.
              </button>
              <button
                onClick={() => { setMostraPago(false); setMonto(''); setError(null) }}
                disabled={procesando}
                className="px-3 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Historial de Facturas (Pedidos impagos) ── */}
      {expandido && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Pedidos pendientes</p>
          <div className="space-y-3">
            {cliente.movimientos.map((mov, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-800 text-sm font-bold truncate">Pedido #{mov.id}</p>
                  <p className="text-gray-500 text-xs truncate mb-1">{mov.descripcion}</p>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider">{formatFecha(mov.fecha)}</p>
                </div>
                <div className="text-right flex-shrink-0 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <span className="font-semibold block text-gray-600 text-xs mb-0.5">
                    Total: {formatearPesos(mov.monto_total)}
                  </span>
                  {mov.monto_abonado > 0 && (
                    <span className="text-xs text-green-600 font-bold block mb-0.5">
                      Abonado: {formatearPesos(mov.monto_abonado)}
                    </span>
                  )}
                  <span className="text-sm text-red-500 font-extrabold block">
                    Debe: {formatearPesos(mov.pendiente)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Saldo final */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-gray-200 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Deuda Total</span>
            <span className="font-extrabold text-xl text-red-500">{formatearPesos(cliente.saldo)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Lista principal ──────────────────────────────────────────────────────────
export default function Deudas({ onRecargar }) {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try {
      const data = await listarCuentasClientes()
      setCuentas(data)
    } catch (e) {
      console.error('Error cargando cuentas:', e)
    } finally {
      if (!silencioso) setCargando(false)
    }
  }

  const handlePagoRegistrado = () => {
    cargar(true)
    onRecargar?.()
  }

  useEffect(() => {
    cargar()
    // Recargar cuando la pantalla vuelve a estar visible (PWA background → foreground)
    const onVisible = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const { inicio } = obtenerLimitesDiaNegocio()
  const inicioLocalMs = inicio.getTime()

  let deudaHoy = 0
  let deudaAtrasada = 0

  cuentas.forEach(c => {
    c.movimientos.forEach(m => {
      const fechaMs = new Date(m.fecha).getTime()
      if (fechaMs >= inicioLocalMs) {
        deudaHoy += m.pendiente
      } else {
        deudaAtrasada += m.pendiente
      }
    })
  })

  const totalGlobal = deudaHoy + deudaAtrasada

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-400 font-medium">Cargando deudores...</p>
      </div>
    )
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Deudas</h2>
          <p className="text-sm text-gray-500">
            {cuentas.length} cliente{cuentas.length !== 1 ? 's' : ''} con deuda
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Total global */}
      {cuentas.length > 0 && (
        <div className="rounded-2xl p-4 shadow-md bg-gradient-to-br from-red-500 to-rose-600 text-white mb-4">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Deuda Total Acumulada</p>
          <p className="text-4xl font-extrabold">{formatearPesos(totalGlobal)}</p>
          
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center text-sm">
            <div>
              <p className="opacity-80">Deuda de hoy</p>
              <p className="font-bold">{formatearPesos(deudaHoy)}</p>
            </div>
            <div className="text-right">
              <p className="opacity-80">Días anteriores</p>
              <p className="font-bold">{formatearPesos(deudaAtrasada)}</p>
            </div>
          </div>
        </div>
      )}

      {cuentas.length === 0 ? (
        <div className="text-center py-10 card bg-gray-50 border-dashed border-2 border-gray-200">
          <div className="text-4xl mb-3">🙌</div>
          <h3 className="font-bold text-gray-700">¡Nadie debe nada!</h3>
          <p className="text-sm text-gray-400">Todos los pedidos están pagados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cuentas.map(cliente => (
            <TarjetaCliente
              key={cliente.id}
              cliente={cliente}
              onPagoRegistrado={handlePagoRegistrado}
            />
          ))}
        </div>
      )}
    </div>
  )
}
