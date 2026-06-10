import { useQuery } from '@tanstack/react-query'
import { conversationsApi } from '../../api/endpoints/conversations.js'
import { MessageThread } from './MessageThread.jsx'
import { MessageInput } from './MessageInput.jsx'
import { CustomerSidebar } from './CustomerSidebar.jsx'
import { ConversationStatusBadge } from './ConversationStatusBadge.jsx'
import { StatusTransition } from './StatusTransition.jsx'

export function ConversationView({ conversationId, onBack }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId).then(r => r.data),
    enabled: !!conversationId,
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list().then(r => r.data),
  })

  const conversation = conversations.find(c => c.id === conversationId)

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Chat column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 bg-white">
          <button onClick={onBack} className="md:hidden text-neutral-500 hover:text-neutral-900">←</button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {conversation?.contactName || conversation?.contactPhone || '...'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {conversation && <ConversationStatusBadge status={conversation.status} />}
            </div>
          </div>
          {conversation && <StatusTransition conversation={conversation} />}
        </div>

        {/* Messages */}
        <MessageThread messages={messages} isLoading={isLoading} />

        {/* Input */}
        <MessageInput conversationId={conversationId} />
      </div>

      {/* Sidebar */}
      <CustomerSidebar conversation={conversation} />
    </div>
  )
}
