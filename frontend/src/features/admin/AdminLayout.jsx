import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuthStore } from '../../stores/authStore.js'
import { MetricsDashboard } from './MetricsDashboard.jsx'
import { UsersTable } from './UsersTable.jsx'
import { BotConfigEditor } from './BotConfigEditor.jsx'
import { TemplatesManager } from './TemplatesManager.jsx'
import { Link } from 'react-router-dom'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'supervisor'] },
  { id: 'users', label: 'Usuarios', roles: ['admin'] },
  { id: 'bot-config', label: 'Bot Config', roles: ['admin'] },
  { id: 'templates', label: 'Plantillas', roles: ['admin', 'supervisor'] },
]

export function AdminLayout() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { user } = useAuthStore()

  const visibleTabs = TABS.filter(t => t.roles.includes(user?.role))

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <MetricsDashboard />
      case 'users': return <UsersTable />
      case 'bot-config': return <BotConfigEditor />
      case 'templates': return <TemplatesManager />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top nav */}
      <header className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm">GFH Admin</span>
          <nav className="flex items-center gap-1">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{user?.name} · {user?.role}</span>
          <Link to="/" className="text-xs text-neutral-500 hover:text-neutral-900">← CRM</Link>
        </div>
      </header>

      {/* Content with animation */}
      <main className="p-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
