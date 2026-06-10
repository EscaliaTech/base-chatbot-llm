import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../../api/endpoints/admin.js'

const templateSchema = z.object({
  title: z.string().min(2, 'Título requerido'),
  body: z.string().min(5, 'Cuerpo requerido'),
})

export function TemplatesManager() {
  const queryClient = useQueryClient()

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => adminApi.getTemplates().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(templateSchema),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Plantillas de Respuesta</h2>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <p className="text-sm font-semibold mb-3">Nueva plantilla</p>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
          <div>
            <input {...register('title')} placeholder="Título (ej: Saludo inicial)"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title.message}</p>}
          </div>
          <div>
            <textarea {...register('body')} placeholder="Cuerpo del mensaje..." rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
            {errors.body && <p className="text-xs text-red-500 mt-0.5">{errors.body.message}</p>}
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 disabled:opacity-50">
            {createMutation.isPending ? 'Creando...' : 'Crear plantilla'}
          </button>
        </form>
      </div>

      {/* Templates list */}
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{t.body}</p>
            </div>
            <button
              onClick={() => deleteMutation.mutate(t.id)}
              className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Eliminar
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">No hay plantillas creadas</div>
        )}
      </div>
    </div>
  )
}
