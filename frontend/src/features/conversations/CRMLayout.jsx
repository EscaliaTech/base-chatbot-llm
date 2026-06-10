import { useWebSocket } from '../../hooks/useWebSocket.js'
import { useConversationStore } from '../../stores/conversationStore.js'
import { ConversationList } from './ConversationList.jsx'
import { ConversationView } from './ConversationView.jsx'
import { useWsStore } from '../../stores/wsStore.js'
import { WelcomeDialog, useWelcomeDialog } from '../auth/WelcomeDialog.jsx'
import { useAuthStore } from '../../stores/authStore.js'
import { authApi } from '../../api/endpoints/auth.js'
import { useNavigate, Link } from 'react-router-dom'

export function CRMLayout() {
  useWebSocket()
  const { activeConversationId, setActiveConversation } = useConversationStore()
  const { connected } = useWsStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const welcome = useWelcomeDialog()

  async function handleLogout() {
    await authApi.logout().catch(() => {})
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <WelcomeDialog open={welcome.open} onClose={welcome.hide} />
      {/* Sidebar */}
      <aside className={`w-80 shrink-0 border-r border-neutral-200 bg-white flex flex-col ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="font-semibold text-sm">Conversaciones</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} title={connected ? 'Conectado' : 'Desconectado'} />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 bg-neutral-50">
          <span className="text-xs text-neutral-500 truncate">{user?.name || user?.email || '—'}</span>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              onClick={welcome.show}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Ver QR de WhatsApp"
            >
              QR
            </button>
            {(user?.role === 'admin' || user?.role === 'supervisor') && (
              <>
                <span className="text-neutral-200">|</span>
                <Link
                  to="/admin"
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="Panel administrativo"
                >
                  Admin
                </Link>
              </>
            )}
            <span className="text-neutral-200">|</span>
            <button
              onClick={handleLogout}
              className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
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
