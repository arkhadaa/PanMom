// =============================================
// LoginPIN.jsx
// Pantalla de bloqueo. Requiere un PIN de 4 dígitos.
// =============================================

import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { validarPIN } from '../services/supabaseClient'

export default function LoginPIN({ onLoginExitoso }) {
  const [pin, setPin] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)

  const handleTecla = async (numero) => {
    if (cargando) return
    setError(false)
    
    const nuevoPin = pin + numero
    setPin(nuevoPin)

    // Autoevaluar al llegar a 4 dígitos
    if (nuevoPin.length === 4) {
      setCargando(true)
      const usuario = await validarPIN(nuevoPin)
      
      if (usuario) {
        // PIN correcto
        onLoginExitoso(usuario)
      } else {
        // PIN incorrecto
        setError(true)
        setPin('')
        setCargando(false)
      }
    }
  }

  const borrar = () => {
    setPin(pin.slice(0, -1))
    setError(false)
  }

  // Teclado numérico
  const teclas = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['C', 0, '←']
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white animate-fade-up">
      <div className="max-w-xs w-full text-center">
        
        <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
          <Lock size={32} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Ingresar al Sistema</h1>
        <p className="text-gray-400 text-sm mb-8">Digita tu PIN de 4 números</p>

        {/* Indicadores de PIN (los puntitos) */}
        <div className="flex justify-center gap-4 mb-8 h-8">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > i ? 'bg-orange-500 scale-110' : 'bg-gray-700'
              } ${error ? 'bg-red-500' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm font-semibold mb-6 animate-bounce">
            PIN incorrecto. Intenta de nuevo.
          </p>
        )}
        
        {cargando && !error && (
          <div className="flex justify-center mb-6">
            <Loader2 className="animate-spin text-orange-500" size={24} />
          </div>
        )}

        {/* Teclado */}
        <div className="grid grid-cols-3 gap-4">
          {teclas.map((fila, i) => 
            fila.map((tecla) => (
              <button
                key={tecla}
                onClick={() => {
                  if (tecla === 'C') {
                    setPin('')
                    setError(false)
                  }
                  else if (tecla === '←') borrar()
                  else handleTecla(tecla)
                }}
                disabled={cargando}
                className={`
                  h-16 rounded-2xl text-2xl font-semibold flex items-center justify-center
                  transition-all active:scale-95
                  ${typeof tecla === 'number' 
                    ? 'bg-gray-800 hover:bg-gray-700 text-white shadow-sm' 
                    : 'bg-gray-800/50 hover:bg-gray-700 text-gray-400 text-lg'
                  }
                `}
              >
                {tecla}
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
