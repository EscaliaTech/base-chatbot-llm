import { useQuery } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { conversationsApi } from '../../api/endpoints/conversations.js'
import { ConversationStatusBadge } from './ConversationStatusBadge.jsx'

export function ConversationList({ onSelect, activeId }) {
  const [globalFilter, setGlobalFilter] = useState('')

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const columns = useMemo(() => [
    {
      id: 'contact',
      accessorFn: row => row.contactName || row.contactPhone,
      header: 'Contacto',
    },
    {
      accessorKey: 'status',
      header: 'Estado',
    },
  ], [])

  const table = useReactTable({
    data: conversations,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">Cargando...</div>
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-100">
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {table.getRowModel().rows.map(row => {
          const conv = row.original
          const isActive = conv.id === activeId
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${isActive ? 'bg-neutral-100' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {conv.contactName || conv.contactPhone}
                </span>
                <ConversationStatusBadge status={conv.status} />
              </div>
              <span className="text-xs text-neutral-400 mt-0.5 block">
                {new Date(conv.createdAt).toLocaleDateString('es-AR')}
              </span>
            </button>
          )
        })}
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">Sin conversaciones</div>
        )}
      </div>
    </div>
  )
}
