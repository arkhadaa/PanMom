// =============================================
// App.jsx
// Estado global, seed automático, real-time,
// routing entre tabs y composición de vistas
// =============================================

import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import AgregarPedido from './components/AgregarPedido'
import ListaPedidos from './components/ListaPedidos'
import Insumos from './components/Insumos'
import Recetas from './components/Recetas'
import Produccion from './components/Produccion'
import {
  listarPedidosHoy,
  listarProduccionHoy,
  listarGastosHoy,
  listarRetirosHoy,
  registrarRetiro,
  eliminarRetiro,
  suscribirPedidos,
  calcularCostosUnitarios,
  seedDatosIniciales,
} from './services/supabaseClient'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ mensaje, visible }) {
  if (!visible) return null
  return <div className="toast">{mensaje}</div>
}

// ─── Pantalla de configuración necesaria ──────────────────────────────────────
function PantallaConfiguracion() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center py-8 px-6">
        <div className="text-6xl mb-4">⚙️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Configuración necesaria</h2>
        <p className="text-gray-500 text-sm mb-6">
          Crea un archivo <code className="bg-gray-100 px-1.5 py-0.5 rounded text-orange-600 text-xs">.env.local</code> con:
        </p>
        <div className="text-left bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono space-y-1 mb-6">
          <p className="text-gray-500"># .env.local</p>
          <p>VITE_SUPABASE_URL=https://xxxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJhbGc...</p>
        </div>
        <p className="text-xs text-gray-400">Mira el <strong>README.md</strong> para instrucciones paso a paso.</p>
      </div>
    </div>
  )
}

// ─── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [tabActivo, setTabActivo]   = useState('dashboard')
  const [pedidos, setPedidos]       = useState([])
  const [produccion, setProduccion] = useState([])
  const [gastos, setGastos]         = useState([])
  const [retiros, setRetiros]       = useState([])
  const [cargando, setCargando]     = useState(true)
  const [conectado, setConectado]   = useState(true)
  const [toast, setToast]           = useState({ visible: false, mensaje: '' })
  const [costos, setCostos]         = useState(null)
  const [tabCostos, setTabCostos]   = useState('insumos')

  const supabaseConfigurado =
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'

  const mostrarToast = useCallback((mensaje) => {
    setToast({ visible: true, mensaje })
    setTimeout(() => setToast({ visible: false, mensaje: '' }), 3000)
  }, [])

  const cargarPedidos = useCallback(async () => {
    if (!supabaseConfigurado) return
    setCargando(true)
    try {
      const data = await listarPedidosHoy()
      setPedidos(data)
      setConectado(true)
    } catch (err) {
      console.error('Error al cargar pedidos:', err)
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [supabaseConfigurado])

  const cargarProduccion = useCallback(async () => {
    if (!supabaseConfigurado) return
    try {
      const data = await listarProduccionHoy()
      setProduccion(data)
    } catch (err) {
      console.warn('Producción no disponible:', err.message)
    }
  }, [supabaseConfigurado])

  const cargarCostos = useCallback(async () => {
    if (!supabaseConfigurado) return
    try {
      const data = await calcularCostosUnitarios()
      setCostos(data)
    } catch (err) {
      console.warn('Costos no disponibles aún:', err.message)
    }
  }, [supabaseConfigurado])

  const cargarGastos = useCallback(async () => {
    if (!supabaseConfigurado) return
    try {
      const data = await listarGastosHoy()
      setGastos(data)
    } catch (err) {
      console.warn('Gastos:', err.message)
    }
  }, [supabaseConfigurado])

  const cargarRetiros = useCallback(async () => {
    if (!supabaseConfigurado) return
    try {
      const data = await listarRetirosHoy()
      setRetiros(data)
    } catch (err) {
      console.warn('Retiros:', err.message)
    }
  }, [supabaseConfigurado])

  // ── Seed automático + carga inicial ──
  useEffect(() => {
    if (!supabaseConfigurado) return
    seedDatosIniciales().then(() => {
      cargarCostos()
      cargarProduccion()
    })
    cargarPedidos()
    cargarGastos()
    cargarRetiros()
  }, [supabaseConfigurado, cargarPedidos, cargarCostos, cargarProduccion, cargarGastos, cargarRetiros])

  // ── Suscripción real-time a pedidos ──
  useEffect(() => {
    if (!supabaseConfigurado) return
    const cancelar = suscribirPedidos(async (payload) => {
      const { eventType, old: viejo } = payload
      try {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const actualizados = await listarPedidosHoy()
          setPedidos(actualizados)
          mostrarToast(eventType === 'INSERT' ? '🛒 Nuevo pedido recibido' : '✏️  Pedido actualizado')
        } else if (eventType === 'DELETE') {
          setPedidos(prev => prev.filter(p => p.id !== viejo.id))
          mostrarToast('🗑️  Pedido eliminado')
        }
      } catch (err) {
        console.warn('Real-time pedidos:', err.message)
      }
    })
    return cancelar
  }, [supabaseConfigurado, mostrarToast])

  if (!supabaseConfigurado) return <PantallaConfiguracion />

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      <Header tabActivo={tabActivo} setTabActivo={setTabActivo} conectado={conectado} />

      <main className="pb-20 md:pb-6">

        {tabActivo === 'dashboard' && (
          <Dashboard
            pedidos={pedidos}
            produccion={produccion}
            gastos={gastos}
            retiros={retiros}
            cargando={cargando}
            onRefresh={() => { cargarPedidos(); cargarProduccion(); cargarGastos(); cargarRetiros() }}
            costos={costos}
            onIrACostos={() => setTabActivo('costos')}
            onIrAProduccion={() => setTabActivo('produccion')}
            onRegistrarRetiro={async (data) => {
              await registrarRetiro(data)
              await cargarRetiros()
              mostrarToast('💸 Retiro registrado')
            }}
            onEliminarRetiro={async (id) => {
              await eliminarRetiro(id)
              await cargarRetiros()
              mostrarToast('🗑️ Retiro eliminado')
            }}
          />
        )}

        {tabActivo === 'pedidos' && (
          <ListaPedidos
            pedidos={pedidos}
            cargando={cargando}
            onPedidosActualizar={setPedidos}
          />
        )}

        {tabActivo === 'agregar' && (
          <AgregarPedido
            onPedidoCreado={cargarPedidos}
            onIrAPedidos={() => setTabActivo('pedidos')}
          />
        )}

        {tabActivo === 'produccion' && (
          <Produccion
            onProduccionRegistrada={() => {
              cargarProduccion()
              cargarCostos()
            }}
          />
        )}

        {tabActivo === 'costos' && (
          <div className="p-4 pb-0 max-w-lg mx-auto">
            <div className="flex gap-2 mb-4">
              {[
                { id: 'insumos', label: '🧂 Insumos' },
                { id: 'recetas', label: '📋 Recetas' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTabCostos(id)}
                  className={`
                    flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${tabCostos === id
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
            {tabCostos === 'insumos' && <Insumos />}
            {tabCostos === 'recetas' && (
              <Recetas onCostosActualizados={cargarCostos} />
            )}
          </div>
        )}
      </main>

      <Toast visible={toast.visible} mensaje={toast.mensaje} />
    </div>
  )
}
