import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage.jsx'
import { RequireAuth } from './guards/RequireAuth.jsx'
import { CRMLayout } from '../features/conversations/CRMLayout.jsx'

import { AdminLayout } from '../features/admin/AdminLayout.jsx'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <RequireAuth><CRMLayout /></RequireAuth>,
  },
  {
    path: '/admin',
    element: <RequireAuth roles={['admin', 'supervisor']}><AdminLayout /></RequireAuth>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
