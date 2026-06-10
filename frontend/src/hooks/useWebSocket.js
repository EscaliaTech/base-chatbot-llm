import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore.js'
import { useWsStore } from '../stores/wsStore.js'
import { useConversationStore } from '../stores/conversationStore.js'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const { accessToken } = useAuthStore()
  const { setConnected } = useWsStore()
  const { updateConversation } = useConversationStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!accessToken) return

    function connect() {
      ws.current = new WebSocket(`${WS_URL}/ws?token=${accessToken}`)

      ws.current.onopen = () => setConnected(true)

      ws.current.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      }

      ws.current.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    }

    function handleMessage(msg) {
      switch (msg.type) {
        case 'new_message':
          queryClient.invalidateQueries({ queryKey: ['messages', msg.data.conversationId] })
          queryClient.invalidateQueries({ queryKey: ['history'] })
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          break
        case 'conversation_transferred':
        case 'conversation_resolved':
        case 'conversation_status':
        case 'conversation_assigned':
          updateConversation(msg.data.conversationId, msg.data)
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          break
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [accessToken])
}
