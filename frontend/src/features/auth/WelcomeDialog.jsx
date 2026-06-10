import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const WA_NUMBER = '14155238886'
const WA_TEXT = 'join symbol-line'
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`
const SESSION_KEY = 'mvp_welcome_shown'

export function useWelcomeDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true)
    }
  }, [])

  return { open, show: () => setOpen(true), hide: () => setOpen(false) }
}

export function WelcomeDialog({ open, onClose }) {
  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
      role="dialog"
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">MVP de presentación</p>
          <h2 className="text-lg font-bold text-neutral-900">Bienvenido al panel de demostración</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex gap-6">
          {/* Text */}
          <div className="flex-1 space-y-4 text-sm text-neutral-700 leading-relaxed">
            <p>
              Este es un <strong>MVP de presentación para clientes</strong>. Si usted desea probar el flujo completo por sí mismo, debe enviar un mensaje a este número de WhatsApp:
            </p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
              <p className="text-xs text-neutral-400 mb-1 font-medium">Número de WhatsApp Sandbox</p>
              <p className="text-xl font-bold tracking-wide text-neutral-900">+1 (415) 523-8886</p>
            </div>
            <p>
              Y colocar como primer mensaje:
            </p>
            <div className="bg-neutral-900 text-green-400 font-mono text-sm rounded-xl px-4 py-3 select-all">
              join symbol-line
            </div>
            <p className="text-xs text-neutral-400">
              ⚠️ Este entorno de prueba puede durar como máximo <strong>72 horas</strong>.
            </p>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center justify-start gap-2 shrink-0">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2.5 border-2 border-neutral-200 rounded-xl hover:border-green-400 transition-colors"
              title="Abrir WhatsApp"
            >
              <QRCodeSVG
                value={WA_URL}
                size={130}
                bgColor="#ffffff"
                fgColor="#111111"
                level="M"
              />
            </a>
            <p className="text-xs text-neutral-400 text-center">Escaneá para<br/>abrir WhatsApp</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={dismiss}
            className="bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
