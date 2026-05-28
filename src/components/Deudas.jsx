// =============================================
// Deudas.jsx
// Control de fiados (pedidos pendientes de pago)
// agrupados por cliente.
// =============================================

import { useState, useEffect, useMemo } from 'react'
import { Loader2, DollarSign, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { listarDeudas, cobrarPedidos, formatearPesos } from '../services/supabaseClient'

export default function Deudas() {
  const [deudas, setDeudas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [expandido, setExpandido] = useState({}) // { nombreCliente: boolean }

  const cargar = async () => {
    setCargando(true)
    const data = await listarDeudas()
    setDeudas(data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  // Agrupar deudas por cliente
  const clientesConDeuda = useMemo(() => {
    const agrupado = deudas.reduce((acc, pedido) => {
      const nombre = pedido.clientes?.nombre || 'Desconocido'
      if (!acc[nombre]) {
        acc[nombre] = { nombre, total: 0, pedidos: [] }
      }
      acc[nombre].total += pedido.monto_pesos || 0
      acc[nombre].pedidos.push(pedido)
      return acc
    }, {})
    
    // Convertir a array y ordenar por el que más debe
    return Object.values(agrupado).sort((a, b) => b.total - a.total)
  }, [deudas])

  const totalGlobal = clientesConDeuda.reduce((sum, c) => sum + c.total, 0)

  const toggleExpandir = (nombre) => {
    setExpandido(prev => ({ ...prev, [nombre]: !prev[nombre] }))
  }

  const handleCobrar = async (cliente, metodo_pago) => {
    if (!window.confirm(`¿Marcar todos los pedidos de ${cliente.nombre} como pagados con ${metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}?`)) return
    
    setProcesando(true)
    try {
      const ids = cliente.pedidos.map(p => p.id)
      await cobrarPedidos(ids, metodo_pago)
      // Refrescar lista localmente
      setDeudas(prev => prev.filter(p => !ids.includes(p.id)))
    } catch (e) {
      console.error(e)
      alert('Error al cobrar')
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-400 font-medium">Buscando fiados...</p>
      </div>
    )
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Control de Deudas</h2>
        <p className="text-sm text-gray-500">Lista de clientes que deben dinero (fiados)</p>
      </div>

      {clientesConDeuda.length > 0 && (
        <div className="rounded-2xl p-4 shadow-md bg-gradient-to-br from-red-500 to-rose-600 text-white mb-6">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
            Total por Cobrar
          </p>
          <p className="text-4xl font-extrabold">{formatearPesos(totalGlobal)}</p>
          <p className="text-sm opacity-90 mt-1">
            {clientesConDeuda.length} cliente{clientesConDeuda.length !== 1 ? 's' : ''} con deuda
          </p>
        </div>
      )}

      {clientesConDeuda.length === 0 ? (
        <div className="text-center py-10 card bg-gray-50 border-dashed border-2 border-gray-200">
          <div className="text-4xl mb-3">🙌</div>
          <h3 className="font-bold text-gray-700">¡Nadie debe nada!</h3>
          <p className="text-sm text-gray-400">Todos los pedidos están pagados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientesConDeuda.map(cliente => (
            <div key={cliente.nombre} className="card !p-0 overflow-hidden border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div 
                className="flex items-center justify-between p-4 bg-white cursor-pointer"
                onClick={() => toggleExpandir(cliente.nombre)}
              >
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{cliente.nombre}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {cliente.pedidos.length} pedido{cliente.pedidos.length !== 1 ? 's' : ''} por cobrar
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold text-red-500">
                    {formatearPesos(cliente.total)}
                  </span>
                  {expandido[cliente.nombre] ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {expandido[cliente.nombre] && (
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                  <ul className="space-y-2 mb-4">
                    {cliente.pedidos.map(p => (
                      <li key={p.id} className="flex justify-between items-center text-sm border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="text-gray-600">
                            {new Date(p.fecha_pedido).toLocaleDateString('es-CL')} 
                            <span className="text-gray-400 ml-2">
                              {new Date(p.fecha_pedido).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </p>
                          {p.pedido_items?.length > 0 && (
                            <ul className="text-xs font-semibold text-gray-500 mt-0.5 space-y-0.5">
                              {p.pedido_items.map((item, idx) => (
                                <li key={idx}>
                                  {item.cantidad}x {item.productos?.nombre || 'Producto'}
                                </li>
                              ))}
                            </ul>
                          )}
                          {p.notas && <p className="text-xs text-orange-600 mt-0.5 font-medium">"{p.notas}"</p>}
                        </div>
                        <span className="font-bold text-gray-700">{formatearPesos(p.monto_pesos)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCobrar(cliente, 'efectivo')}
                      disabled={procesando}
                      className="btn-primary flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 border-none shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm flex flex-col items-center justify-center gap-1"
                    >
                      {procesando ? <Loader2 size={18} className="animate-spin" /> : <span className="text-xl">💵</span>}
                      <span className="text-xs">Efectivo</span>
                    </button>
                    <button
                      onClick={() => handleCobrar(cliente, 'transferencia')}
                      disabled={procesando}
                      className="btn-primary flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 border-none shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm flex flex-col items-center justify-center gap-1"
                    >
                      {procesando ? <Loader2 size={18} className="animate-spin" /> : <span className="text-xl">📱</span>}
                      <span className="text-xs">Transf.</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
