import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import hotkeys from 'hotkeys-js'
import { LayoutTemplate, SendHorizonal } from 'lucide-react'
import { conversationsApi } from '../../api/endpoints/conversations.js'
import { TemplatesPanel } from './TemplatesPanel.jsx'

export function MessageInput({ conversationId }) {
  const [body, setBody] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const textareaRef = useRef(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (text) => conversationsApi.sendMessage(conversationId, text),
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
  })

  const handleSend = () => {
    const trimmed = body.trim()
    if (!trimmed || mutation.isPending) return
    mutation.mutate(trimmed)
  }

  useEffect(() => {
    hotkeys('ctrl+enter,command+enter', (e) => {
      e.preventDefault()
      handleSend()
    })
    hotkeys('ctrl+t,command+t', (e) => {
      e.preventDefault()
      setShowTemplates(prev => !prev)
    })
    return () => {
      hotkeys.unbind('ctrl+enter,command+enter')
      hotkeys.unbind('ctrl+t,command+t')
    }
  }, [body, conversationId])

  const handleTemplateSelect = (templateBody) => {
    setBody(templateBody)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t border-neutral-200 bg-white">
      {showTemplates && (
        <TemplatesPanel onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
      )}
      <div className="flex items-end gap-2 p-3">
        <button
          onClick={() => setShowTemplates(prev => !prev)}
          className={`shrink-0 p-2 rounded-md transition-colors ${showTemplates ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}`}
          title="Plantillas (⌘T)"
        >
          <LayoutTemplate size={16} />
        </button>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Escribí un mensaje... (⌘+Enter para enviar)"
          rows={1}
          className="flex-1 resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 max-h-32 overflow-y-auto"
          style={{ height: 'auto' }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || mutation.isPending}
          className="shrink-0 rounded-md bg-neutral-900 text-white px-3 py-2 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
          title="Enviar (⌘Enter)"
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  )
}
