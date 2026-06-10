import { useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsApi } from '../../api/endpoints/conversations.js'

const NEXT_ACTIONS = {
  open: null,
  in_progress: { label: 'Resolver', nextStatus: 'resolved' },
  resolved: { label: 'Cerrar', nextStatus: 'closed' },
  closed: null,
}

export function StatusTransition({ conversation }) {
  const queryClient = useQueryClient()
  const action = NEXT_ACTIONS[conversation?.status]

  const mutation = useMutation({
    mutationFn: (status) => conversationsApi.updateStatus(conversation.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  if (!action) return null

  return (
    <button
      onClick={() => mutation.mutate(action.nextStatus)}
      disabled={mutation.isPending}
      className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
    >
      {mutation.isPending ? '...' : action.label}
    </button>
  )
}
