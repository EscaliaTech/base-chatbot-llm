import { apiClient } from '../client.js'

export const authApi = {
  login: (email, password) => apiClient.post('/api/auth/login', { email, password }),
  refresh: () => apiClient.post('/api/auth/refresh'),
  logout: () => apiClient.post('/api/auth/logout'),
}
