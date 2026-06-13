import { useState, useEffect } from 'react'
import { DollarSign, Wallet, TrendingUp, AlertCircle, ShoppingBag, Plus, CheckCircle, ChevronDown, Calendar } from 'lucide-react'
import {
  obtenerLibroMayor,
  obtenerCapitalActual,
  obtenerEvolucionSemanal,
  registrarCierreDiario,
  listarCompromisos,
  completarCompromiso,
  registrarCompromiso,
  listarCuentasClientes
} from '../services/supabaseClient'
import { formatearPesos } from '../services/helpers'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function SuperAdmin() {
  const [capital, setCapital] = useState({ caja: 0, banco: 0, total: 0 })
  const [compromisos, setCompromisos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [deudaTotal, setDeudaTotal] = useState(0)
  const [evolucion, setEvolucion] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados modales
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false)
  const [mostrarModalCompromiso, setMostrarModalCompromiso] = useState(false)

  // Formulario Compromiso
  const [formCompromiso, setFormCompromiso] = useState({
    concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'Operación'
  })

  async function cargarTodo() {
    setCargando(true)
    try {
      const [cap, movs, comps, ev, clientes] = await Promise.all([
        obtenerCapitalActual(),
        obtenerLibroMayor(50),
        listarCompromisos(),
        obtenerEvolucionSemanal(),
        listarCuentasClientes()
      ])
      
      setCapital(cap)
      setMovimientos(movs)
      setCompromisos(comps.filter(c => c.estado === 'pendiente'))
      setEvolucion(ev)
      
      const deudas = clientes.filter(c => c.saldo > 0).reduce((acc, c) => acc + c.saldo, 0)
      setDeudaTotal(deudas)
    } catch (error) {
      console.error('Error cargando ERP', error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const totalCompromisos = compromisos.reduce((s, c) => s + c.monto, 0)
  const capitalNeto = capital.total + deudaTotal - totalCompromisos

  const handleCompletarCompromiso = async (id) => {
    await completarCompromiso(id)
    // El completarlo idealmente dispara un Gasto o Retiro en la BDD real, 
    // pero por ahora solo lo marca completado. En V7 se integrará al flujo.
    cargarTodo()
  }

  const handleRegistrarCompromiso = async (e) => {
    e.preventDefault()
    await registrarCompromiso(formCompromiso)
    setMostrarModalCompromiso(false)
    setFormCompromiso({ concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'Operación' })
    cargarTodo()
  }

  const handleCierreDiario = async () => {
    await registrarCierreDiario(capital.caja, capital.banco)
    setMostrarModalCierre(false)
    cargarTodo()
  }

  if (cargando) {
    return <div className="p-4 space-y-4"><div className="skeleton h-64 rounded-xl" /></div>
  }

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen pb-24">
      {/* TARJETA REINA */}
      <div className="card bg-gradient-to-br from-indigo-900 to-indigo-800 text-white shadow-xl shadow-indigo-900/20 border-0">
        <h2 className="text-indigo-200 font-medium text-sm tracking-widest uppercase mb-4">Capital Actual</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-indigo-200 text-sm">Caja Efectivo</p>
            <p className="text-2xl font-bold">{formatearPesos(capital.caja)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-sm">Banco</p>
            <p className="text-2xl font-bold">{formatearPesos(capital.banco)}</p>
          </div>
        </div>

        <div className="py-4 border-t border-indigo-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-indigo-200">Total Físico + Banco</span>
            <span className="font-bold">{formatearPesos(capital.total)}</span>
          </div>
          <div className="flex justify-between items-center mb-2 text-emerald-400">
            <span>+ Por Cobrar (Activos)</span>
            <span>{formatearPesos(deudaTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400">
            <span>- Compromisos (Pasivos)</span>
            <span>{formatearPesos(totalCompromisos)}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-indigo-700/50 mt-2">
          <p className="text-indigo-200 text-sm mb-1">Capital Neto (Lo que es realmente tuyo)</p>
          <p className="text-4xl font-black tracking-tight">{formatearPesos(capitalNeto)}</p>
        </div>
      </div>

      {/* EVOLUCIÓN */}
      <div className="card shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Evolución
          </h3>
          <button onClick={() => setMostrarModalCierre(true)} className="btn-secondary py-1.5 text-xs">
            Cerrar Día
          </button>
        </div>
        <div className="h-48 w-full">
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucion}>
                <XAxis dataKey="fecha" tickFormatter={(str) => str.substring(5,10)} fontSize={12} stroke="#9ca3af" />
                <Tooltip 
                  formatter={(value) => formatearPesos(value)} 
                  labelFormatter={(label) => `Fecha: ${label}`}
                  cursor={{fill: '#f3f4f6'}}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {evolucion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === evolucion.length - 1 ? '#6366f1' : '#a5b4fc'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              No hay cierres diarios registrados
            </div>
          )}
        </div>
      </div>

      {/* COMPROMISOS */}
      <div className="card shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" /> Compromisos
          </h3>
          <button onClick={() => setMostrarModalCompromiso(true)} className="btn-primary py-1.5 px-3 text-xs">
            + Añadir
          </button>
        </div>

        {compromisos.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No hay pagos pendientes.</p>
        ) : (
          <div className="space-y-3">
            {compromisos.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{c.concepto}</p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-700">
                      {c.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {c.fecha}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-600">{formatearPesos(c.monto)}</span>
                  <button onClick={() => handleCompletarCompromiso(c.id)} className="p-2 bg-white rounded-full shadow-sm hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIBRO MAYOR */}
      <div className="card shadow-sm flex flex-col h-[500px]">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 flex-shrink-0">
          <Wallet className="w-5 h-5 text-indigo-500" /> Movimientos
        </h3>
        
        <div className="space-y-0 overflow-y-auto flex-1 pr-2 pb-2">
          {movimientos.map((m, i) => (
            <div key={m.id_unico} className={`py-3 flex justify-between items-center ${i !== movimientos.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div>
                <p className="font-semibold text-gray-800 text-sm capitalize">{m.origen} <span className="text-gray-400 font-normal ml-1">· {m.concepto}</span></p>
                <div className="flex gap-2 text-xs mt-1">
                  <span className="text-gray-400">{new Date(m.fecha_movimiento).toLocaleDateString()}</span>
                  <span className={`px-1.5 rounded uppercase text-[9px] font-bold ${m.metodo_pago === 'efectivo' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {m.metodo_pago}
                  </span>
                </div>
              </div>
              <p className={`font-bold ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-800'}`}>
                {m.tipo === 'ingreso' ? '+' : '-'}{formatearPesos(m.monto)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modales */}
      {mostrarModalCompromiso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-xl">Nuevo Compromiso</h3>
            <form onSubmit={handleRegistrarCompromiso} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Concepto</label>
                <input required type="text" className="input-field" placeholder="Ej: Pago harina" value={formCompromiso.concepto} onChange={e => setFormCompromiso({...formCompromiso, concepto: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Monto</label>
                <input required type="number" className="input-field" placeholder="Ej: 30000" value={formCompromiso.monto} onChange={e => setFormCompromiso({...formCompromiso, monto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Límite</label>
                  <input required type="date" className="input-field" value={formCompromiso.fecha} onChange={e => setFormCompromiso({...formCompromiso, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tipo</label>
                  <select className="input-field" value={formCompromiso.tipo} onChange={e => setFormCompromiso({...formCompromiso, tipo: e.target.value})}>
                    <option value="Operación">Operación</option>
                    <option value="Insumo">Insumo</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setMostrarModalCompromiso(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalCierre && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-500">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl">¿Cerrar el Día?</h3>
            <p className="text-gray-500 text-sm">Se registrará una "foto" exacta de tus finanzas en este momento para el gráfico de evolución.</p>
            <div className="bg-gray-50 p-3 rounded-lg text-left">
              <p className="text-sm font-semibold flex justify-between"><span>Caja Fija:</span> <span>{formatearPesos(capital.caja)}</span></p>
              <p className="text-sm font-semibold flex justify-between"><span>Banco:</span> <span>{formatearPesos(capital.banco)}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMostrarModalCierre(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCierreDiario} className="btn-primary flex-1">Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
