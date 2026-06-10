import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { conversationsApi } from '../../api/endpoints/conversations.js'
import { ConversationStatusBadge } from './ConversationStatusBadge.jsx'

export function ConversationList({ onSelect, activeId }) {
  const [search, setSearch] = useState('')

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  // Group by contact, keep latest conversation per contact (last in sorted array)
  const contacts = useMemo(() => {
    const map = new Map()
    for (const conv of conversations) {
      const key = conv.contactPhone
      const existing = map.get(key)
      if (!existing || new Date(conv.createdAt) > new Date(existing.createdAt)) {
        map.set(key, conv)
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [conversations])

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase()
    return contacts.filter(c =>
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.contactPhone || '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">Cargando...</div>
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-100">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(conv => {
          const isActive = conv.id === activeId
          return (
            <button
              key={conv.contactPhone}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${isActive ? 'bg-neutral-100' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">
                  {conv.contactName || conv.contactPhone}
                </span>
                <ConversationStatusBadge status={conv.status} />
              </div>
              {conv.contactName && (
                <span className="text-xs text-neutral-400 block mt-0.5">{conv.contactPhone}</span>
              )}
              <span className="text-xs text-neutral-400 mt-0.5 block">
                {new Date(conv.createdAt).toLocaleDateString('es-AR')}
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">Sin conversaciones</div>
        )}
      </div>
    </div>
  )
}
