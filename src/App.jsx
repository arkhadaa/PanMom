// =============================================
// App.jsx
// Estado global, seed automático, real-time,
// routing entre tabs y composición de vistas
// =============================================

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import AgregarPedido from './components/AgregarPedido'
import ListaPedidos from './components/ListaPedidos'
import Insumos from './components/Insumos'
import Recetas from './components/Recetas'
import Produccion from './components/Produccion'
import LoginPIN from './components/LoginPIN'
import Deudas from './components/Deudas'
import HistorialCierres from './components/HistorialCierres'
import Finanzas from './components/Finanzas'
import Auditoria from './components/Auditoria'
import {
  listarPedidosHoy,
  listarProduccionHoy,
  listarGastosHoy,
  listarRetirosHoy,
  obtenerCajaHoy,
  registrarRetiro,
  eliminarRetiro,
  registrarGasto,
  eliminarGasto,
  suscribirPedidos,
  calcularCostosUnitarios,
  seedDatosIniciales,
  obtenerSesionLocal,
  guardarSesionLocal,
  obtenerPedidoConDetalle,
  registrarApertura,
} from './services/supabaseClient'

// ─── Toast de notificación ────────────────────────────────────────────────────
function Toast({ mensaje, visible, onClose }) {
  if (!visible) return null
  return (
    <div className="toast flex items-center justify-between gap-3 shadow-lg">
      <span className="flex-1 font-medium">{mensaje}</span>
      <button 
        onClick={onClose} 
        className="bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors flex-shrink-0"
        title="Cerrar"
      >
        <X size={14} className="text-white" />
      </button>
    </div>
  )
}

// ─── Sonido de Notificación ───────────────────────────────────────────────────
function reproducirSonidoNotificacion() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    
    // Tono 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime) // Nota A5
    gain1.gain.setValueAtTime(0.5, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.2)

    // Tono 2 (más agudo, retardo)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15) // Nota C#6
    gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.4)
  } catch (e) {
    console.warn('Audio no soportado o bloqueado', e)
  }
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
  const [cajaHoy, setCajaHoy]       = useState({ ingresos_efectivo: 0, ingresos_transferencia: 0, total_gastos: 0, total_retiros: 0, caja_efectivo_final: 0 })

  // Auth State
  const [usuarioActual, setUsuarioActual] = useState(obtenerSesionLocal())

  // Toasts
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

  const cargarPedidos = useCallback(async (silencioso = false) => {
    if (!supabaseConfigurado) return
    if (!silencioso) setCargando(true)
    try {
      const data = await listarPedidosHoy()
      setPedidos(data)
      setConectado(true)
    } catch (err) {
      console.error('Error al cargar pedidos:', err)
      setConectado(false)
    } finally {
      if (!silencioso) setCargando(false)
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

  const cargarCajaHoy = useCallback(async () => {
    if (!supabaseConfigurado) return
    try {
      const data = await obtenerCajaHoy()
      setCajaHoy(data)
    } catch (err) {
      console.warn('CajaHoy:', err.message)
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
    const verProduccion = ['productor', 'superadmin'].includes(usuarioActual?.rol)
    const verCostos = usuarioActual?.rol === 'superadmin'

    seedDatosIniciales().then(() => {
      if (verCostos) cargarCostos()
      if (verProduccion) cargarProduccion()
    })
    cargarPedidos()
    cargarGastos()
    cargarRetiros()
    cargarCajaHoy()
  }, [supabaseConfigurado, cargarPedidos, cargarCostos, cargarProduccion, cargarGastos, cargarRetiros, cargarCajaHoy, usuarioActual?.rol])

  // ── Auto-Refresh al volver a la app (Background -> Foreground) ──
  useEffect(() => {
    const esAdmin = ['admin', 'superadmin'].includes(usuarioActual?.rol)
    const refrescarSilencioso = () => {
      cargarPedidos(true)
      if (esAdmin) cargarProduccion()
      cargarGastos()
      cargarRetiros()
      cargarCajaHoy()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refrescarSilencioso()
    }

    // pageshow cubre el caso PWA en iOS cuando vuelves desde otra app
    const handlePageShow = (e) => {
      if (e.persisted || document.visibilityState === 'visible') refrescarSilencioso()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [usuarioActual?.rol, cargarPedidos, cargarProduccion, cargarGastos, cargarRetiros, cargarCajaHoy])

  // Escuchar eventos globales para atajos de navegación
  useEffect(() => {
    const handleCambioTab = (e) => setTabActivo(e.detail)
    window.addEventListener('cambiarTab', handleCambioTab)
    return () => window.removeEventListener('cambiarTab', handleCambioTab)
  }, [])

  const forzarRecarga = () => {
    mostrarToast('🔄 Actualizando...')
    cargarPedidos()
    cargarProduccion()
    cargarGastos()
    cargarRetiros()
    cargarCajaHoy()
  }

  // ── Suscripción real-time ──
  useEffect(() => {
    if (!supabaseConfigurado) return

    const cancelar = suscribirPedidos(async (payload) => {
      const { eventType, new: nuevo, old: viejo } = payload
      try {
        if (eventType === 'INSERT') {
          const pedido = await obtenerPedidoConDetalle(nuevo.id)
          // Deduplicar: si ya lo agregamos desde este dispositivo, solo actualiza
          let eraNuevo = false
          setPedidos(prev => {
            if (prev.some(p => p.id === pedido.id)) {
              return prev.map(p => p.id === pedido.id ? pedido : p)
            }
            eraNuevo = true
            return [pedido, ...prev]
          })
          // Solo notificar si vino de otro dispositivo
          if (eraNuevo) {
            mostrarToast('🛒 Nuevo pedido recibido')
            reproducirSonidoNotificacion()
          }
        } else if (eventType === 'UPDATE') {
          const pedido = await obtenerPedidoConDetalle(nuevo.id)
          setPedidos(prev => prev.map(p => p.id === pedido.id ? pedido : p))
          mostrarToast('✏️  Pedido actualizado')
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

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded-2xl mb-4" />
        <h2 className="text-xl font-bold text-gray-400">Cargando sistema...</h2>
      </div>
    )
  }

  // ── Bloqueo por PIN si no hay sesión ──
  if (!usuarioActual) {
    return (
      <LoginPIN 
        onLoginExitoso={(usuario) => {
          guardarSesionLocal(usuario)
          setUsuarioActual(usuario)
        }} 
      />
    )
  }

  const handleLogout = () => {
    guardarSesionLocal(null)
    setUsuarioActual(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 pb-20 md:pb-0">
      <Header 
        tabActivo={tabActivo} 
        setTabActivo={setTabActivo} 
        conectado={conectado} 
        usuarioActual={usuarioActual}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto md:p-4">
        {tabActivo === 'dashboard' && (
          <Dashboard
            pedidos={pedidos}
            produccion={produccion}
            gastos={gastos}
            retiros={retiros}
            cajaHoy={cajaHoy}
            onPedidosChange={setPedidos}
            onGastosChange={setGastos}
            onRetirosChange={setRetiros}
            usuarioActual={usuarioActual}
            cargando={cargando}
            onRefresh={() => { cargarPedidos(); cargarProduccion(); cargarGastos(); cargarRetiros(); cargarCajaHoy() }}
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
            onRegistrarGasto={async (data) => {
              await registrarGasto(data)
              await cargarGastos()
              mostrarToast('📦 Gasto registrado')
            }}
            onEliminarGasto={async (id) => {
              await eliminarGasto(id)
              await cargarGastos()
              mostrarToast('🗑️ Gasto eliminado')
            }}
            onRegistrarApertura={async (monto) => {
              await registrarApertura(monto, usuarioActual?.nombre)
              await cargarCajaHoy()
              mostrarToast('🏦 Caja abierta')
            }}
          />
        )}

        {tabActivo === 'pedidos' && (
          <ListaPedidos
            pedidos={pedidos}
            onActualizar={forzarRecarga}
            cargando={cargando}
            onPedidosActualizar={setPedidos}
            usuarioActual={usuarioActual}
            onIrADeudas={() => setTabActivo('deudas')}
          />
        )}

        {tabActivo === 'agregar' && usuarioActual?.rol === 'productor' && (
          <div className="p-4 safe-bottom max-w-lg mx-auto">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-gray-800">Agregar Compras</h2>
              <p className="text-sm text-gray-500">Registra las materias primas que compraste</p>
            </div>
            <Insumos />
          </div>
        )}

        {tabActivo === 'agregar' && usuarioActual?.rol !== 'productor' && (
          <AgregarPedido
            pedidos={pedidos}
            produccion={produccion}
            onPedidoCreado={async (pedidoBasico) => {
              try {
                // Agregar con joins completos sin recargar toda la lista
                const pedidoCompleto = await obtenerPedidoConDetalle(pedidoBasico.id)
                setPedidos(prev => {
                  if (prev.some(p => p.id === pedidoCompleto.id)) {
                    // Si ya llegó por real-time, solo actualizamos por si acaso
                    return prev.map(p => p.id === pedidoCompleto.id ? pedidoCompleto : p)
                  }
                  return [pedidoCompleto, ...prev]
                })
              } catch {
                cargarPedidos() // fallback si falla el detalle
              }
            }}
            onIrAPedidos={() => setTabActivo('pedidos')}
            usuarioActual={usuarioActual}
          />
        )}

        {tabActivo === 'produccion' && ['productor', 'superadmin'].includes(usuarioActual?.rol) && (
          <Produccion
            onProduccionRegistrada={() => {
              cargarProduccion()
              if (usuarioActual?.rol === 'superadmin') cargarCostos()
            }}
          />
        )}

        {tabActivo === 'finanzas' && usuarioActual?.rol === 'superadmin' && (
          <Finanzas
            cajaHoy={cajaHoy}
            usuarioActual={usuarioActual}
          />
        )}

        {tabActivo === 'deudas' && (
          <Deudas onRecargar={() => {
            cargarCajaHoy()
            cargarPedidos()
          }} />
        )}

        {tabActivo === 'historial' && usuarioActual?.rol === 'superadmin' && (
          <HistorialCierres />
        )}

        {tabActivo === 'auditoria' && ['productor', 'superadmin'].includes(usuarioActual?.rol) && (
          <Auditoria />
        )}

        {tabActivo === 'costos' && usuarioActual?.rol === 'superadmin' && (
          <div className="p-4 pb-0 max-w-lg mx-auto">
            <div className="flex gap-2 mb-4">
              {[
                { id: 'insumos', label: '🧂 Costos/Insumos' },
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

      <Toast 
        visible={toast.visible} 
        mensaje={toast.mensaje} 
        onClose={() => setToast({ visible: false, mensaje: '' })}
      />
    </div>
  )
}
