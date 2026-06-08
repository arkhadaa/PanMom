import { useState, useEffect, useMemo } from 'react'
import { DollarSign, Wallet, TrendingUp, TrendingDown, Users, AlertCircle, ShoppingBag, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { formatearPesos, obtenerFlujoSemanal, obtenerRetirosMensuales, listarCuentasClientes, obtenerInversionInsumosMes } from '../services/supabaseClient'

export default function Finanzas({ cajaHoy = {}, usuarioActual }) {
  const cajaFisica = cajaHoy.caja_efectivo_final || 0
  const debitoEsperado = cajaHoy.ingresos_transferencia || 0
  const totalEsperado = cajaFisica + debitoEsperado
  const [flujoSemana, setFlujoSemana] = useState(null)
  const [retirosMes, setRetirosMes] = useState(null)
  const [inversionInsumos, setInversionInsumos] = useState({ total: 0, compras: [] })
  const [topDeudores, setTopDeudores] = useState([])
  const [totalDeuda, setTotalDeuda] = useState(0)
  const [cargando, setCargando] = useState(true)

  // Estados para Cuadratura
  const [efectivoReal, setEfectivoReal] = useState('')
  const [debitoReal, setDebitoReal] = useState('')

  // Estados de acordeones
  const [mostrarAnalisis, setMostrarAnalisis] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const [flujo, retiros, cuentas, inversion] = await Promise.all([
          obtenerFlujoSemanal(),
          obtenerRetirosMensuales(),
          listarCuentasClientes(),
          obtenerInversionInsumosMes().catch(() => ({ total: 0, compras: [] }))
        ])
        
        setFlujoSemana(flujo)
        setRetirosMes(retiros)
        setInversionInsumos(inversion)
        
        const adeudados = cuentas.filter(c => c.saldo > 0)
        setTotalDeuda(adeudados.reduce((acc, c) => acc + c.saldo, 0))
        setTopDeudores(adeudados.slice(0, 3)) // Top 3

      } catch (err) {
        console.error('Error cargando finanzas:', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    )
  }

  const capitalTeorico = cajaFisica + totalDeuda

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto space-y-6">
      
      {/* ── BLOQUE A: CAPITAL DEL NEGOCIO ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          🏦 Capital del Negocio
        </h3>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-sm font-semibold opacity-90 mb-1">Capital Actual</p>
          <p className="text-4xl font-black mb-4">{formatearPesos(capitalTeorico)}</p>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mt-2">
            <div>
              <p className="text-xs opacity-80 font-medium">Caja Física Actual</p>
              <p className="text-lg font-bold">{formatearPesos(cajaFisica)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">Dinero real para retirar</p>
            </div>
            <div>
              <p className="text-xs opacity-80 font-medium">Plata en la Calle (Fíados)</p>
              <p className="text-lg font-bold">{formatearPesos(totalDeuda)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">Dinero pendiente de cobro</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOQUE: VERIFICACIÓN DE CAJA ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          💰 Verificación de Caja
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-4 space-y-4">
          
          {/* NIVEL 1: TOTALES */}
          <div className="flex justify-between items-center text-center">
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">App dice</p>
              <p className="font-bold text-gray-800 text-xl">{formatearPesos(totalEsperado)}</p>
            </div>
            <div className="px-2 text-gray-300">
              <ChevronRight size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Realmente hay</p>
              <p className="font-black text-blue-600 text-2xl">
                {formatearPesos((Number(efectivoReal) || 0) + (Number(debitoReal) || 0))}
              </p>
            </div>
          </div>

          {/* DIFERENCIA */}
          <div className="pt-3 border-t-2 border-dashed border-gray-200">
            {(() => {
              if (efectivoReal === '' && debitoReal === '') {
                return <p className="text-sm text-gray-400 text-center italic">Ingresa tus montos abajo para calcular.</p>
              }
              const totalR = (Number(efectivoReal) || 0) + (Number(debitoReal) || 0)
              const diff = totalR - totalEsperado
              if (diff === 0) {
                return (
                  <div className="flex justify-between items-center text-green-600 bg-green-50 p-2.5 rounded-xl">
                    <span className="font-bold text-sm uppercase tracking-wide">Diferencia:</span>
                    <span className="font-black text-lg">$0 (Cuadrado ✅)</span>
                  </div>
                )
              }
              const sobra = diff > 0
              return (
                <div className={`flex justify-between items-center p-2.5 rounded-xl ${sobra ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                  <span className="font-bold text-sm uppercase tracking-wide">Diferencia:</span>
                  <span className="font-black text-lg">
                    {sobra ? '+' : ''}{formatearPesos(diff)} {sobra ? '🎉' : '⚠️'}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* NIVEL 2: DETALLES */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-3">Detalle de Ingreso</p>
            <div className="grid grid-cols-2 gap-4">
              {/* App Esperaba */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">App esperaba</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between"><span className="opacity-70">Efectivo:</span> <span className="font-semibold">{formatearPesos(cajaFisica)}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Débito:</span> <span className="font-semibold">{formatearPesos(debitoEsperado)}</span></div>
                </div>
              </div>
              
              {/* Yo Conté */}
              <div>
                <p className="text-xs font-semibold text-gray-800 mb-2">Yo conté</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400 w-14">Efectivo</span>
                    <input 
                      type="number" 
                      value={efectivoReal} 
                      onChange={e => setEfectivoReal(e.target.value)} 
                      className="input-field !py-1 !px-2 text-xs w-full font-semibold" 
                      placeholder="Ej. 60000" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400 w-14">Débito</span>
                    <input 
                      type="number" 
                      value={debitoReal} 
                      onChange={e => setDebitoReal(e.target.value)} 
                      className="input-field !py-1 !px-2 text-xs w-full font-semibold" 
                      placeholder="Ej. 4200" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOQUE B: TOP DEUDORES ── */}
      {topDeudores.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-400" />
            Top 3 Deudores (Prioridad Cobro)
          </h3>
          <div className="bg-white rounded-xl border border-red-100 divide-y divide-gray-100 overflow-hidden shadow-sm">
            {topDeudores.map((d, i) => (
              <div key={d.id} className="flex justify-between items-center p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-700">{d.nombre}</span>
                </div>
                <span className="font-bold text-red-600">{formatearPesos(d.saldo)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── BLOQUE C: ANÁLISIS SEMANAL (EXPANDIBLE) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button 
          onClick={() => setMostrarAnalisis(!mostrarAnalisis)}
          className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            <span className="font-bold text-gray-800">Ver análisis semanal</span>
          </div>
          {mostrarAnalisis ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        
        {mostrarAnalisis && (
          <div className="p-4 border-t border-gray-200 space-y-5">
            
            {/* Flujo Compacto */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ventas Totales</span>
                <span className="font-semibold">{formatearPesos(flujoSemana?.ventas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ingresos Reales</span>
                <span className="font-semibold text-green-600">{formatearPesos(flujoSemana?.ingresos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 ml-4 border-l-2 pl-2 border-green-200 text-xs">↳ Deudas cobradas</span>
                <span className="font-semibold text-emerald-600 text-xs">{formatearPesos(flujoSemana?.deudasCobradas)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-gray-600">Gastos</span>
                <span className="font-semibold text-red-500">− {formatearPesos(flujoSemana?.gastos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Retiros</span>
                <span className="font-semibold text-orange-500">− {formatearPesos(flujoSemana?.retiros)}</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-white">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold">📈 Resultado Semanal</span>
                <span className="text-xl font-black">{formatearPesos(flujoSemana?.disponible)}</span>
              </div>
              <p className="text-[10px] text-gray-300 uppercase tracking-wide">
                Plata limpia a favor (Ingresos reales − Gastos − Retiros)
              </p>
            </div>

            {/* Historial de Retiros movido aquí adentro */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                💸 Distribución de Retiros
              </p>
              <div className="space-y-3 mb-4">
                {retirosMes?.resumen.map(r => (
                  <div key={r.usuario} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-orange-400" />
                      <span className="font-semibold text-gray-700 text-sm">{r.usuario}</span>
                    </div>
                    <span className="font-bold text-sm">{formatearPesos(r.total)}</span>
                  </div>
                ))}
                {retirosMes?.resumen.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sin retiros este mes.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </section>

    </div>
  )
}
