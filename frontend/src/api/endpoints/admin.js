import { apiClient } from '../client.js'

export const adminApi = {
  getUsers: () => apiClient.get('/api/admin/users'),
  createUser: (data) => apiClient.post('/api/admin/users', data),
  updateUser: (id, data) => apiClient.patch(`/api/admin/users/${id}`, data),
  getBotConfig: () => apiClient.get('/api/admin/bot-config'),
  updateBotConfig: (key, value) => apiClient.put(`/api/admin/bot-config/${key}`, { value }),
  getTemplates: () => apiClient.get('/api/admin/templates'),
  createTemplate: (data) => apiClient.post('/api/admin/templates', data),
  deleteTemplate: (id) => apiClient.delete(`/api/admin/templates/${id}`),
}
