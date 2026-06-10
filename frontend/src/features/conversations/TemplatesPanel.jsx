import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { adminApi } from '../../api/endpoints/admin.js'

function PreviewDialog({ template, onUse, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-neutral-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-0.5">Vista previa</p>
          <p className="text-sm font-bold text-neutral-900">{template.title}</p>
        </div>
        <div className="px-5 py-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {template.body}
          </div>
          {template.body.includes('{') && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ Contiene variables entre <code className="font-mono bg-amber-50 px-1 rounded">{'{}'}</code> — reemplazalas antes de enviar.
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onUse(template.body); onClose() }}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Usar plantilla
          </button>
        </div>
      </div>
    </div>
  )
}

export function TemplatesPanel({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(null)

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => adminApi.getTemplates().then(r => r.data),
  })

  const filtered = search.trim()
    ? templates.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.body.toLowerCase().includes(search.toLowerCase())
      )
    : templates

  return (
    <>
      {preview && (
        <PreviewDialog
          template={preview}
          onUse={(body) => { onSelect(body) }}
          onClose={() => setPreview(null)}
        />
      )}

      <div className="border-t border-neutral-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="text-xs font-semibold text-neutral-700">Plantillas</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">{filtered.length}</span>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 text-sm leading-none px-1"
              title="Cerrar (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plantilla..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* List */}
        <div className="max-h-52 overflow-y-auto px-2 pb-2 space-y-1">
          {filtered.map(t => (
            <div
              key={t.id}
              className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all"
            >
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => setPreview(t)}
              >
                <p className="text-xs font-semibold text-neutral-800 truncate">{t.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{t.body}</p>
              </button>
              <button
                onClick={() => onSelect(t.body)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-xs bg-neutral-900 text-white px-2.5 py-1 rounded-md hover:bg-neutral-700 transition-all"
                title="Usar directamente"
              >
                Usar
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-neutral-400 text-center py-4">
              {search ? `Sin resultados para "${search}"` : 'No hay plantillas'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
