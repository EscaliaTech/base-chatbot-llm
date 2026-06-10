import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { adminApi } from '../../api/endpoints/admin.js'

const templateSchema = z.object({
  title: z.string().min(2, 'Título requerido'),
  body: z.string().min(5, 'Cuerpo requerido'),
})

function PreviewDialog({ template, onDelete, onClose, isDeleting }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">Plantilla</p>
          <h2 className="text-base font-bold text-neutral-900">{template.title}</h2>
        </div>
        <div className="px-6 py-5">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap min-h-20">
            {template.body}
          </div>
          {template.body.includes('{') && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <span>⚠</span>
              <span>Contiene variables entre <code className="font-mono bg-amber-50 px-1 rounded">{'{llaves}'}</code> — deben reemplazarse antes de enviar.</span>
            </p>
          )}
        </div>
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => { onDelete(template.id); onClose() }}
            disabled={isDeleting}
            className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export function TemplatesManager() {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => adminApi.getTemplates().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createTemplate(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(templateSchema),
  })

  const filtered = search.trim()
    ? templates.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.body.toLowerCase().includes(search.toLowerCase())
      )
    : templates

  return (
    <div className="space-y-6">
      {preview && (
        <PreviewDialog
          template={preview}
          onDelete={(id) => deleteMutation.mutate(id)}
          onClose={() => setPreview(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plantillas de Respuesta</h2>
        <span className="text-xs text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
          {templates.length} plantillas
        </span>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <p className="text-sm font-semibold mb-3">Nueva plantilla</p>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
          <div>
            <input
              {...register('title')}
              placeholder="Título (ej: Saludo inicial)"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title.message}</p>}
          </div>
          <div>
            <textarea
              {...register('body')}
              placeholder="Cuerpo del mensaje... Usá {variable} para partes a reemplazar."
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
            />
            {errors.body && <p className="text-xs text-red-500 mt-0.5">{errors.body.message}</p>}
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear plantilla'}
          </button>
        </form>
      </div>

      {/* Search */}
      {templates.length > 4 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar plantillas..."
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
        />
      )}

      {/* Templates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => setPreview(t)}
            className="group text-left bg-white rounded-xl border border-neutral-200 px-4 py-3 hover:border-neutral-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-800 truncate flex-1">{t.title}</p>
              <span className="shrink-0 text-xs text-neutral-300 group-hover:text-neutral-500 transition-colors">Ver →</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{t.body}</p>
            {t.body.includes('{') && (
              <span className="inline-block mt-2 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                Tiene variables
              </span>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-sm text-neutral-400 py-10">
            {search ? `Sin resultados para "${search}"` : 'No hay plantillas creadas'}
          </div>
        )}
      </div>
    </div>
  )
}
