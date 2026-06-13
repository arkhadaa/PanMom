// =============================================
// Header.jsx
// Barra superior + nav inferior mobile (5 tabs)
// =============================================

import { useState, useRef, useEffect } from 'react'
import { Menu, ShoppingBag, LayoutDashboard, ClipboardList, PlusCircle, Package, ChefHat, Wifi, WifiOff, CreditCard, Archive, ShieldCheck, PieChart } from 'lucide-react'
import SyncBadge from './SyncBadge'

// Tabs de la barra principal (5 max)
const TABS_PRINCIPALES = [
  { id: 'dashboard', label: 'Inicio', Icon: LayoutDashboard },
  { id: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { id: 'agregar', label: 'Agregar', Icon: PlusCircle },
  { id: 'produccion', label: 'Hornear', Icon: ChefHat },
  { id: 'deudas', label: 'Deudas', Icon: CreditCard },
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

  const esVendedor = usuarioActual?.rol === 'vendedor'
  const esProductor = usuarioActual?.rol === 'productor'
  const esSuperAdmin = usuarioActual?.rol === 'superadmin'

  const verProduccion = esProductor || esSuperAdmin
  const verCostos = esSuperAdmin
  const verFinanzas = esSuperAdmin
  const verAuditoria = esProductor || esSuperAdmin
  const verHistorial = esSuperAdmin
  const verVentas = esProductor || esSuperAdmin

  const tabsMenu = []
  if (verVentas) tabsMenu.push({ id: 'ventas', label: 'Ventas', Icon: ShoppingBag })
  if (verFinanzas) {
    tabsMenu.push({ id: 'finanzas', label: 'Finanzas', Icon: PieChart })
    tabsMenu.push({ id: 'superadmin', label: 'Super Admin (Beta)', Icon: PieChart })
  }
  if (verHistorial) tabsMenu.push({ id: 'historial', label: 'Cierres', Icon: Archive })
  if (verCostos) tabsMenu.push({ id: 'costos', label: 'Config', Icon: Package })
  if (verAuditoria) tabsMenu.push({ id: 'auditoria', label: 'Auditoría', Icon: ShieldCheck })

  const mostrarHamburguesa = tabsMenu.length > 0

  const tabsVisibles = TABS_PRINCIPALES.filter(t => {
    if (t.id === 'produccion' && !verProduccion) return false
    return true
  })

  return (
    <>
      {/* ── HEADER SUPERIOR ── */}
      <header className="header-gradient text-white sticky top-0 z-30 shadow-lg" ref={menuRef}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón menú hamburguesa */}
            {mostrarHamburguesa && (
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

          <div className="flex items-center gap-1.5 sm:gap-2">
            <SyncBadge />

            {/* Solo mostramos el Wifi si no hay conexión y la cola está vacía, para no saturar si ya dice 'Sincronizado' */}
            {!conectado && (
              <div className="flex items-center bg-red-500/30 rounded-full px-1.5 py-1" title="Sin conexión">
                <WifiOff size={14} className="text-red-200" />
              </div>
            )}

            {usuarioActual && (
              <div className="flex items-center gap-2 ml-1 pl-1 sm:ml-2 sm:pl-2 border-l border-white/20">
                <span className="text-xs font-medium text-white/90 inline-block truncate max-w-[65px] sm:max-w-[100px]">
                  <b>{usuarioActual.nombre}</b>
                </span>
                <button
                  onClick={onLogout}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
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
