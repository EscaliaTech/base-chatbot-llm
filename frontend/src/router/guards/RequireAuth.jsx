import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore.js'

export function RequireAuth({ children, roles }) {
  const { accessToken, user } = useAuthStore()
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
