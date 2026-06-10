import { useEffect, useRef } from 'react'

const FROM_TYPE_CONFIG = {
  user: { label: 'Cliente', className: 'bg-neutral-100 text-neutral-900 self-start' },
  bot: { label: 'Bot', className: 'bg-blue-50 text-blue-900 self-start border border-blue-100' },
  agent: { label: 'Asesor', className: 'bg-neutral-900 text-white self-end' },
}

export function MessageThread({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">Cargando mensajes...</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 flex flex-col">
      {messages.map(msg => {
        const config = FROM_TYPE_CONFIG[msg.fromType] || FROM_TYPE_CONFIG.user
        return (
          <div key={msg.id} className={`flex flex-col max-w-[75%] ${msg.fromType === 'agent' ? 'self-end items-end' : 'self-start items-start'}`}>
            <span className="text-xs text-neutral-400 mb-1">{config.label}</span>
            <div className={`rounded-2xl px-4 py-2 text-sm ${config.className}`}>
              {msg.body}
            </div>
            <span className="text-xs text-neutral-400 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
