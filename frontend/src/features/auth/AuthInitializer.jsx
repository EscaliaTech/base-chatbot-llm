import { useEffect, useState } from 'react'
import { authApi } from '../../api/endpoints/auth.js'
import { useAuthStore } from '../../stores/authStore.js'

export function AuthInitializer({ children }) {
  const [ready, setReady] = useState(false)
  const { accessToken, setAuth } = useAuthStore()

  useEffect(() => {
    // Already have a token in memory (e.g. same tab, no reload)
    if (accessToken) {
      setReady(true)
      return
    }

    // Try to restore session using the httpOnly refresh token cookie
    authApi.refresh()
      .then(({ data }) => {
        setAuth(data.accessToken, data.user)
      })
      .catch(() => {
        // No valid session — user will be redirected to /login by RequireAuth
      })
      .finally(() => setReady(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null

  return children
}
