import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../../api/endpoints/admin.js'

const createUserSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['admin', 'supervisor', 'asesor']),
})

const columnHelper = createColumnHelper()

const ROLE_LABELS = { admin: 'Admin', supervisor: 'Supervisor', asesor: 'Asesor' }

export function UsersTable() {
  const [showCreate, setShowCreate] = useState(false)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.getUsers().then(r => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.updateUser(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      reset()
    },
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'asesor' },
  })

  const columns = useMemo(() => [
    columnHelper.accessor('name', { header: 'Nombre' }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('role', {
      header: 'Rol',
      cell: info => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700">
          {ROLE_LABELS[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('isActive', {
      header: 'Estado',
      cell: info => (
        <button
          onClick={() => toggleMutation.mutate({ id: info.row.original.id, isActive: !info.getValue() })}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            info.getValue() ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {info.getValue() ? 'Activo' : 'Inactivo'}
        </button>
      ),
    }),
  ], [])

  const table = useReactTable({ data: users, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Create user dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold mb-4">Crear usuario</h3>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
              {[
                { name: 'name', label: 'Nombre', type: 'text' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'password', label: 'Contraseña', type: 'password' },
              ].map(field => (
                <div key={field.name}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <input {...register(field.name)} type={field.type}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
                  {errors[field.name] && <p className="text-xs text-red-500 mt-0.5">{errors[field.name].message}</p>}
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Rol</label>
                <select {...register('role')}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                  <option value="asesor">Asesor</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 disabled:opacity-50">
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); reset() }}
                  className="flex-1 py-2 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50">
                  Cancelar
                </button>
              </div>
              {createMutation.isError && (
                <p className="text-xs text-red-500 text-center">Error al crear el usuario</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-neutral-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
