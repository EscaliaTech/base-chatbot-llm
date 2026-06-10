const STATUS_CONFIG = {
  open: { label: 'Abierta', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En atención', className: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resuelta', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrada', className: 'bg-neutral-100 text-neutral-500' },
}

export function ConversationStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
