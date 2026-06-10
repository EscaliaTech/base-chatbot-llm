export function CustomerSidebar({ conversation }) {
  if (!conversation) return null

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-l border-neutral-200 bg-white flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-neutral-200">
        <p className="text-sm font-semibold">Perfil del cliente</p>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Contacto</p>
          <p className="text-sm font-medium">{conversation.contactName || 'Sin nombre'}</p>
          <p className="text-xs text-neutral-500">{conversation.contactPhone}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Conversación</p>
          <p className="text-xs text-neutral-600">Iniciada: {new Date(conversation.createdAt).toLocaleString('es-AR')}</p>
          {conversation.transferredAt && (
            <p className="text-xs text-neutral-600">Transferida: {new Date(conversation.transferredAt).toLocaleString('es-AR')}</p>
          )}
        </div>
      </div>
    </aside>
  )
}
