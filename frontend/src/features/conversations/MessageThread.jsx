import { useEffect, useRef } from 'react'

const FROM_TYPE_CONFIG = {
  user: { label: 'Cliente', className: 'bg-neutral-100 text-neutral-900 self-start' },
  bot: { label: 'Bot', className: 'bg-blue-50 text-blue-900 self-start border border-blue-100' },
  agent: { label: 'Asesor', className: 'bg-neutral-900 text-white self-end' },
}

const STATUS_LABEL = {
  open: 'Abierta',
  in_progress: 'En progreso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
}

function SessionDivider({ session }) {
  const date = new Date(session.createdAt).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return (
    <div className="flex items-center gap-3 py-2 select-none">
      <div className="flex-1 h-px bg-neutral-200" />
      <span className="text-xs text-neutral-400 whitespace-nowrap">
        {date} · {STATUS_LABEL[session.status] ?? session.status}
      </span>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  )
}

function Message({ msg }) {
  const config = FROM_TYPE_CONFIG[msg.fromType] || FROM_TYPE_CONFIG.user
  return (
    <div className={`flex flex-col max-w-[75%] ${msg.fromType === 'agent' ? 'self-end items-end' : 'self-start items-start'}`}>
      <span className="text-xs text-neutral-400 mb-1">{config.label}</span>
      <div className={`rounded-2xl px-4 py-2 text-sm ${config.className}`}>
        {msg.body}
      </div>
      <span className="text-xs text-neutral-400 mt-1">
        {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// sessions: [{ conversationId, status, createdAt, isCurrent, messages }]
export function MessageThread({ sessions, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">Cargando mensajes...</div>
  }

  const nonEmpty = sessions.filter(s => s.messages.length > 0)

  if (nonEmpty.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">Sin mensajes aún</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {nonEmpty.map((session, idx) => (
        <div key={session.conversationId} className="flex flex-col gap-3">
          {idx > 0 && <SessionDivider session={session} />}
          {session.messages.map(msg => (
            <Message key={msg.id} msg={msg} />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
