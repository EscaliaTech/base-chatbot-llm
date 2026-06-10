import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { adminApi } from '../../api/endpoints/admin.js'

function TemplateItem({ template, onSelect, index }) {
  const ref = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return draggable({
      element: el,
      getInitialData: () => ({ id: template.id, index }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [template.id, index])

  return (
    <div
      ref={ref}
      className={`flex items-start gap-2 p-3 rounded-lg border border-neutral-200 cursor-grab hover:border-neutral-400 transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex-1 min-w-0" onClick={() => onSelect(template.body)}>
        <p className="text-xs font-semibold text-neutral-700 truncate">{template.title}</p>
        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{template.body}</p>
      </div>
    </div>
  )
}

export function TemplatesPanel({ onSelect, onClose }) {
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => adminApi.getTemplates().then(r => r.data),
  })

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 max-h-48 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-600">Plantillas</span>
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-700">✕</button>
      </div>
      <div className="space-y-1.5">
        {templates.map((t, i) => (
          <TemplateItem key={t.id} template={t} onSelect={onSelect} index={i} />
        ))}
        {templates.length === 0 && (
          <p className="text-xs text-neutral-400 text-center py-2">No hay plantillas</p>
        )}
      </div>
    </div>
  )
}
