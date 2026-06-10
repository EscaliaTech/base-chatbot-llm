import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { adminApi } from '../../api/endpoints/admin.js'

const botConfigSchema = z.object({
  welcome_message: z.string().min(1, 'Requerido'),
  transfer_message: z.string().min(1, 'Requerido'),
  unknown_message: z.string().min(1, 'Requerido'),
  hours: z.string().min(1, 'Requerido'),
  branches: z.string().min(1, 'Requerido'),
})

const FIELD_LABELS = {
  welcome_message: { label: 'Mensaje de bienvenida', rows: 2 },
  transfer_message: { label: 'Mensaje al transferir a asesor', rows: 2 },
  unknown_message: { label: 'Respuesta para consultas no reconocidas', rows: 2 },
  hours: { label: 'Horarios de atención', rows: 3 },
  branches: { label: 'Información de sucursales', rows: 5 },
}

export function BotConfigEditor() {
  const queryClient = useQueryClient()

  const { data: config = {}, isLoading } = useQuery({
    queryKey: ['bot-config'],
    queryFn: () => adminApi.getBotConfig().then(r => r.data),
  })

  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm({
    resolver: zodResolver(botConfigSchema),
  })

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      reset(config)
    }
  }, [config, reset])

  const mutation = useMutation({
    mutationFn: async (data) => {
      await Promise.all(
        Object.entries(data).map(([key, value]) => adminApi.updateBotConfig(key, value))
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-config'] })
      reset(undefined, { keepValues: true })
    },
  })

  if (isLoading) return <div className="text-sm text-neutral-400">Cargando configuración...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Configuración del Bot</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Los cambios se aplican en tiempo real sin reiniciar el servidor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {Object.entries(FIELD_LABELS).map(([key, { label, rows }]) => (
          <div key={key} className="bg-white rounded-xl border border-neutral-200 p-4">
            <label className="text-sm font-medium text-neutral-700">{label}</label>
            <p className="text-xs text-neutral-400 mb-2">Clave: <code className="font-mono">{key}</code></p>
            <textarea
              {...register(key)}
              rows={rows}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none font-mono"
            />
            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key].message}</p>}
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 disabled:opacity-40"
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {mutation.isSuccess && (
            <span className="text-xs text-green-600">Guardado correctamente</span>
          )}
        </div>
      </form>
    </div>
  )
}
