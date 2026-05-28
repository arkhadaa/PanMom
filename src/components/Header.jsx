// =============================================
// Header.jsx
// Barra superior + nav inferior mobile (5 tabs)
// =============================================

import { useState, useRef, useEffect } from 'react'
import { Menu, ShoppingBag, LayoutDashboard, ClipboardList, PlusCircle, Package, ChefHat, Wifi, WifiOff, CreditCard, Archive, ShieldCheck } from 'lucide-react'

// Tabs de la barra principal (5 max)
const TABS_PRINCIPALES = [
  { id: 'dashboard', label: 'Inicio', Icon: LayoutDashboard },
  { id: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { id: 'agregar', label: 'Agregar', Icon: PlusCircle },
  { id: 'produccion', label: 'Hornear', Icon: ChefHat },
  { id: 'deudas', label: 'Fiados', Icon: CreditCard },
]

const TABS_MENU_ADMIN = [
  { id: 'historial', label: 'Cierres', Icon: Archive },
  { id: 'costos', label: 'Config', Icon: Package },
]

const TABS_MENU_SUPERADMIN = [
  { id: 'historial', label: 'Cierres', Icon: Archive },
  { id: 'costos', label: 'Config', Icon: Package },
  { id: 'auditoria', label: 'Auditoría', Icon: ShieldCheck },
]

export default function Header({ tabActivo, setTabActivo, conectado, usuarioActual, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  // Cerrar menú al tocar fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const esAdmin      = ['admin', 'superadmin'].includes(usuarioActual?.rol)
  const esSuperAdmin = usuarioActual?.rol === 'superadmin'
  const tabsMenu     = esSuperAdmin ? TABS_MENU_SUPERADMIN : TABS_MENU_ADMIN

  const tabsVisibles = TABS_PRINCIPALES.filter(t => {
    if (!esAdmin) {
      return ['dashboard', 'pedidos', 'agregar', 'deudas'].includes(t.id)
    }
    return true
  })

  return (
    <>
      {/* ── HEADER SUPERIOR ── */}
      <header className="header-gradient text-white sticky top-0 z-30 shadow-lg" ref={menuRef}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón menú hamburguesa (Solo admins) */}
            {esAdmin && (
              <div className="relative">
                <button
                  onClick={() => setMenuAbierto(!menuAbierto)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors active:scale-95"
                >
                  <Menu size={24} className="text-white" />
                </button>

                {/* Dropdown Menú */}
                {menuAbierto && (
                  <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden text-gray-800 animate-fade-up">
                    <div className="p-2">
                      <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Opciones</p>
                      {tabsMenu.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          onClick={() => { setTabActivo(id); setMenuAbierto(false) }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors
                            ${tabActivo === id ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          <Icon size={18} className={tabActivo === id ? 'text-orange-500' : 'text-gray-400'} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-xl p-1.5 hidden sm:block">
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">InesBread</h1>
                <p className="text-white/70 text-xs leading-tight">Gestión familiar</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {conectado ? (
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1">
                <Wifi size={12} className="text-green-300" />
                <span className="text-xs text-white/90 font-medium">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500/30 rounded-full px-2.5 py-1">
                <WifiOff size={12} className="text-red-200" />
                <span className="text-xs text-white/90 font-medium">Offline</span>
              </div>
            )}

            {usuarioActual && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                <span className="text-xs font-medium text-white/90 hidden sm:inline-block">
                  Hola, <b>{usuarioActual.nombre}</b>
                </span>
                <span className="text-xs font-medium text-white/90 sm:hidden">
                  <b>{usuarioActual.nombre}</b>
                </span>
                <button
                  onClick={onLogout}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── NAV DESKTOP ── */}
        <nav className="hidden md:flex max-w-4xl mx-auto px-4 gap-1 pb-2">
          {tabsVisibles.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTabActivo(id)}
              className={`
                flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${tabActivo === id ? 'bg-white text-orange-600' : 'text-white/80 hover:bg-white/15'}
              `}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="bottom-nav md:hidden">
        {tabsVisibles.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTabActivo(id)}
            className={`bottom-nav-item ${tabActivo === id ? 'active' : ''}`}
          >
            <Icon
              size={id === 'agregar' ? 26 : 21}
              strokeWidth={tabActivo === id ? 2.5 : 1.75}
              className={id === 'agregar' && tabActivo !== id ? 'text-orange-400' : ''}
            />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
