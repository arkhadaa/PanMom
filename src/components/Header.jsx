// =============================================
// Header.jsx
// Barra superior + nav inferior mobile (5 tabs)
// =============================================

import { ShoppingBag, LayoutDashboard, ClipboardList, PlusCircle, Package, ChefHat, Wifi, WifiOff } from 'lucide-react'

const TABS = [
  { id: 'dashboard',  label: 'Inicio',   Icon: LayoutDashboard },
  { id: 'pedidos',    label: 'Pedidos',  Icon: ClipboardList   },
  { id: 'agregar',    label: 'Agregar',  Icon: PlusCircle      },
  { id: 'produccion', label: 'Hornear',  Icon: ChefHat         },
  { id: 'costos',     label: 'Config',   Icon: Package         },
]

export default function Header({ tabActivo, setTabActivo, conectado }) {
  return (
    <>
      {/* ── HEADER SUPERIOR ── */}
      <header className="header-gradient text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 rounded-xl p-1.5">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">Pan & Sopaipillas</h1>
              <p className="text-white/70 text-xs leading-tight">Gestión familiar</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {conectado ? (
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1">
                <Wifi size={12} className="text-green-300" />
                <span className="text-xs text-white/90 font-medium">En línea</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500/30 rounded-full px-2.5 py-1">
                <WifiOff size={12} className="text-red-200" />
                <span className="text-xs text-white/90 font-medium">Sin conexión</span>
              </div>
            )}
          </div>
        </div>

        {/* ── NAV DESKTOP ── */}
        <nav className="hidden md:flex max-w-4xl mx-auto px-4 gap-1 pb-2">
          {TABS.map(({ id, label, Icon }) => (
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
        {TABS.map(({ id, label, Icon }) => (
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
