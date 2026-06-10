import { useWebSocket } from '../../hooks/useWebSocket.js'
import { useConversationStore } from '../../stores/conversationStore.js'
import { ConversationList } from './ConversationList.jsx'
import { ConversationView } from './ConversationView.jsx'
import { useWsStore } from '../../stores/wsStore.js'

export function CRMLayout() {
  useWebSocket()
  const { activeConversationId, setActiveConversation } = useConversationStore()
  const { connected } = useWsStore()

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className={`w-80 shrink-0 border-r border-neutral-200 bg-white flex flex-col ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="font-semibold text-sm">Conversaciones</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} title={connected ? 'Conectado' : 'Desconectado'} />
        </div>
        <ConversationList onSelect={setActiveConversation} activeId={activeConversationId} />
      </aside>

      {/* Main chat area */}
      <main className={`flex-1 flex flex-col ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversationId ? (
          <ConversationView
            conversationId={activeConversationId}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
            Seleccioná una conversación
          </div>
        )}
      </main>
    </div>
  )
}
