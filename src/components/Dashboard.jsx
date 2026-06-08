import { useMemo, useState, useEffect } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, RefreshCw,
  ArrowDownCircle, UserMinus, CreditCard, Briefcase, Loader2,
  X, CheckCircle, Lock
} from 'lucide-react'
import { formatearPesos, listarCuentasClientes, obtenerLimitesDiaNegocio, registrarCierreCaja } from '../services/supabaseClient'

// ─── Componentes Rápidos ──────────────────────────────────────────────
function BotonAccion({ icon: Icon, label, colorCls, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform ${colorCls}`}
    >
      <Icon size={24} className="mb-1.5" />
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </button>
  )
}

// ─── Modal Básico ────────────────────────────────────────────────────────────
function ModalSimple({ titulo, isOpen, onClose, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{titulo}</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Formulario de Movimiento Unificado ──────────────────────────────────────
function FormMovimiento({ onRegistrarGasto, onRegistrarRetiro, onClose }) {
  const [tipo, setTipo] = useState('Compra insumos')
  const [desc, setDesc] = useState('')
  const [monto, setMonto] = useState('')
  const [cargando, setCarg] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = Number(monto)
    if (!v || v <= 0 || cargando) return
    setCarg(true)
    try {
      if (tipo === 'Retiro personal') {
        await onRegistrarRetiro({ monto: v, descripcion: desc.trim() || null })
      } else {
        const descFinal = desc.trim() ? `${tipo} - ${desc.trim()}` : tipo
        await onRegistrarGasto({ monto: v, descripcion: descFinal })
      }
      setMonto('')
      setDesc('')
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setCarg(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tipo de Movimiento</label>
        <select 
          value={tipo} 
          onChange={e => setTipo(e.target.value)}
          className="input-field w-full !bg-white"
        >
          <option value="Compra insumos">🥖 Compra de insumos</option>
          <option value="Bencina">⛽ Bencina</option>
          <option value="Gasto negocio">🏠 Gasto del negocio</option>
          <option value="Retiro personal">💸 Retiro personal</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={tipo === 'Compra insumos' ? 'Ej. Margarina x5' : 'Opcional...'}
          maxLength={100}
          autoFocus
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Monto ($)</label>
        <input
          type="number"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          placeholder="Ej. 10000"
          min={1}
          className="input-field text-lg font-bold"
        />
      </div>
      <button
        type="submit"
        disabled={!monto || cargando}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        {cargando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar'}
      </button>
    </form>
  )
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function Dashboard({
  pedidos, cajaHoy = { ingresos_efectivo: 0, ingresos_transferencia: 0, total_gastos: 0, total_retiros: 0, caja_efectivo_final: 0 },
  cargando, onRefresh,
  onRegistrarGasto, onRegistrarRetiro,
  usuarioActual,
}) {
  const [cuentas, setCuentas] = useState([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  
  // Estados de modales
  const [modalGasto, setModalGasto] = useState(false)
  const [modalCierre, setModalCierre] = useState(false)
  const [cargandoCierre, setCargandoCierre] = useState(false)
  const [exitoCierre, setExitoCierre] = useState(false)

  // Cargar cuentas para deudas históricas
  const cargarDeudas = async () => {
    setCargandoCuentas(true)
    try {
      const data = await listarCuentasClientes()
      setCuentas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoCuentas(false)
    }
  }

  useEffect(() => {
    cargarDeudas()
  }, [])

  // ── Cálculos del día ──
  const statsDia = useMemo(() => {
    const hoy = (pedidos || []).filter(p => p.estado !== 'anulado')
    
    const ventasTotales = hoy.reduce((s, p) => s + (p.monto_pesos || 0), 0)
    
    // Pendientes exactos de pedidos de HOY
    const pendientesHoy = hoy.reduce((s, p) => {
      const pagos = p.pagos_cliente || []
      const abonado = pagos.reduce((sum, pago) => sum + (pago.monto_efectivo || 0) + (pago.monto_transferencia || 0), 0)
      return s + Math.max(0, (p.monto_pesos || 0) - abonado)
    }, 0)

    // Desglose de quién debe de hoy
    const deudoresHoyList = []
    hoy.forEach(p => {
      const pagos = p.pagos_cliente || []
      const abonado = pagos.reduce((sum, pago) => sum + (pago.monto_efectivo || 0) + (pago.monto_transferencia || 0), 0)
      const debe = Math.max(0, (p.monto_pesos || 0) - abonado)
      if (debe > 0) {
        deudoresHoyList.push({ nombre: p.clientes?.nombre || 'Desconocido', monto: debe })
      }
    })

    // Agrupar por nombre (por si alguien hizo 2 pedidos hoy)
    const agrupado = deudoresHoyList.reduce((acc, d) => {
      acc[d.nombre] = (acc[d.nombre] || 0) + d.monto
      return acc
    }, {})

    const deudoresHoy = Object.entries(agrupado)
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)

    return {
      ventasTotales,
      pendientesHoy,
      deudoresHoy
    }
  }, [pedidos])

  // ── Cálculos Históricos ──
  const statsHistorico = useMemo(() => {
    const { inicio } = obtenerLimitesDiaNegocio()
    const inicioLocalMs = inicio.getTime()

    let deudaHistoricaAtrasada = 0
    let deudaTotalGlobal = 0

    cuentas.forEach(c => {
      deudaTotalGlobal += c.saldo
      c.movimientos.forEach(m => {
        const fechaMs = new Date(m.fecha).getTime()
        if (fechaMs < inicioLocalMs) {
          deudaHistoricaAtrasada += m.pendiente
        }
      })
    })

    return {
      deudaTotalGlobal,
      deudaHistoricaAtrasada
    }
  }, [cuentas])

  const handleCerrarCaja = async () => {
    if (cargandoCierre) return
    setCargandoCierre(true)
    try {
      await registrarCierreCaja({
        total_gastos: cajaHoy.total_gastos || 0,
        total_retiros: cajaHoy.total_retiros || 0,
        total_ingresos_efectivo: cajaHoy.ingresos_efectivo || 0,
        total_ingresos_transferencia: cajaHoy.ingresos_transferencia || 0,
        total_ventas: statsDia.ventasTotales || 0,
        total_deuda_generada: statsDia.pendientesHoy || 0,
        notas: null
      })
      setExitoCierre(true)
      setTimeout(() => {
        setExitoCierre(false)
        setModalCierre(false)
      }, 2000)
    } catch (e) {
      console.error(e)
      alert("Error al cerrar caja: " + e.message)
    } finally {
      setCargandoCierre(false)
    }
  }

  const isLoading = cargando || cargandoCuentas

  const capitalTotal = cajaHoy.caja_efectivo_final + statsHistorico.deudaTotalGlobal
  const totalDisponible = cajaHoy.caja_efectivo_final + cajaHoy.ingresos_transferencia
  const resultadoDia = statsDia.ventasTotales - cajaHoy.total_gastos

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto pb-24">
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={() => { onRefresh(); cargarDeudas(); }}
          disabled={isLoading}
          className={`btn-secondary gap-1.5 !px-3 !py-1.5 ${isLoading ? 'opacity-50' : ''}`}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-orange-500">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p className="font-semibold text-gray-500">Calculando números...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* 1. CAPITAL DEL NEGOCIO */}
          <div className="rounded-2xl p-5 shadow-lg bg-gray-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Briefcase size={80} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1 flex items-center gap-1.5">
              <Briefcase size={14} /> Capital del negocio
            </p>
            <p className="text-4xl font-black mb-4">{formatearPesos(capitalTotal)}</p>
            
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-60">Caja física</p>
                <p className="font-bold text-lg text-emerald-400">{formatearPesos(cajaHoy.caja_efectivo_final)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-60">Fiados Totales</p>
                <p className="font-bold text-lg text-orange-400">{formatearPesos(statsHistorico.deudaTotalGlobal)}</p>
              </div>
            </div>
          </div>

          {/* 2. RESUMEN DE HOY */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" /> Resumen de hoy
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Ventas</span>
                <span className="font-bold text-gray-800">{formatearPesos(statsDia.ventasTotales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Gastos registrados</span>
                <span className="font-bold text-red-500">− {formatearPesos(cajaHoy.total_gastos)}</span>
              </div>
              
              <div className="pt-3 border-t border-dashed border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-800">Resultado del día</span>
                  <span className={`font-black text-lg ${resultadoDia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {resultadoDia > 0 ? '+' : ''}{formatearPesos(resultadoDia)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 text-right uppercase tracking-wide">
                  Ventas de hoy − Gastos registrados hoy
                </p>
              </div>
            </div>
          </section>

          {/* 3. PLATA DISPONIBLE */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Wallet size={16} className="text-emerald-500" /> Plata disponible
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Caja física (Efectivo)</span>
                <span className="font-bold text-gray-800">{formatearPesos(cajaHoy.caja_efectivo_final)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Débito / Transferencia</span>
                <span className="font-bold text-blue-600">{formatearPesos(cajaHoy.ingresos_transferencia)}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total disponible</span>
                  <span className="font-black text-lg text-emerald-600">{formatearPesos(totalDisponible)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. PENDIENTES / DEUDAS */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <UserMinus size={16} className="text-orange-500" /> Pendientes
            </h3>
            
            {/* Fiados de hoy */}
            <div className="mb-4">
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl mb-2">
                <span className="font-bold text-orange-800 text-sm">Pendiente de hoy</span>
                <span className="font-black text-orange-600 text-lg">{formatearPesos(statsDia.pendientesHoy)}</span>
              </div>
              
              {statsDia.deudoresHoy.length > 0 ? (
                <div className="space-y-1.5 px-2">
                  {statsDia.deudoresHoy.slice(0, 5).map(d => (
                    <div key={d.nombre} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate mr-2">↳ {d.nombre}</span>
                      <span className="font-semibold text-gray-800">{formatearPesos(d.monto)}</span>
                    </div>
                  ))}
                  {statsDia.deudoresHoy.length > 5 && (
                    <p className="text-xs text-gray-400 mt-2 italic">
                      + {statsDia.deudoresHoy.length - 5} personas más...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic px-2">Nadie quedó debiendo hoy. 🎉</p>
              )}
            </div>

            {/* Deuda histórica */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600 text-sm">Deuda histórica pendiente</span>
                <span className="font-bold text-red-500">{formatearPesos(statsHistorico.deudaHistoricaAtrasada)}</span>
              </div>
              
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('cambiarTab', { detail: 'deudas' }))}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200"
              >
                ➡️ Ver todas las deudas
              </button>
            </div>
          </section>

      {/* 5. BOTONES RÁPIDOS */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <BotonAccion
          icon={TrendingUp}
          label="Nueva Venta"
          colorCls="text-emerald-500 hover:bg-emerald-50"
          onClick={() => window.dispatchEvent(new CustomEvent('cambiarTab', { detail: 'agregar' }))}
        />
        <BotonAccion
          icon={TrendingDown}
          label="Gasto / Retiro"
          colorCls="text-red-500 hover:bg-red-50"
          onClick={() => setModalGasto(true)}
        />
      </div>

      {/* 6. ZONA SUPERADMIN */}
      {usuarioActual?.rol === 'superadmin' && (
        <div className="pt-6">
          <button
            onClick={() => setModalCierre(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all active:scale-95 shadow-md"
          >
            <Lock size={18} className="text-gray-400" />
            Cerrar Caja (Día)
          </button>
        </div>
      )}

    </div>
  )}

  {/* MODALES */}
  <ModalSimple
    titulo="Registrar Movimiento"
    isOpen={modalGasto}
    onClose={() => setModalGasto(false)}
  >
    <FormMovimiento
      onRegistrarGasto={onRegistrarGasto}
      onRegistrarRetiro={onRegistrarRetiro}
      onClose={() => setModalGasto(false)}
    />
  </ModalSimple>

  <ModalSimple
    titulo="Cierre de Caja"
    isOpen={modalCierre}
    onClose={() => !cargandoCierre && setModalCierre(false)}
  >
    {exitoCierre ? (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
        <CheckCircle size={64} className="text-emerald-500 mb-4" />
        <h3 className="text-xl font-black text-gray-800">¡Caja Cerrada!</h3>
        <p className="text-gray-500 mt-2">Los datos se han guardado en el historial.</p>
      </div>
    ) : (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Al cerrar la caja, se guardará un registro histórico con el resumen financiero actual del día.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Ventas:</span>
            <span className="font-bold text-gray-800">{formatearPesos(statsDia.ventasTotales)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Gastos/Retiros:</span>
            <span className="font-bold text-red-500">-{formatearPesos(cajaHoy.total_gastos + cajaHoy.total_retiros)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
            <span className="font-bold text-gray-800">Caja Física Final:</span>
            <span className="font-black text-emerald-600 text-lg">{formatearPesos(cajaHoy.caja_efectivo_final)}</span>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => setModalCierre(false)}
            disabled={cargandoCierre}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCerrarCaja}
            disabled={cargandoCierre}
            className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {cargandoCierre ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Cierre'}
          </button>
        </div>
      </div>
    )}
  </ModalSimple>

</div>
  )
}
