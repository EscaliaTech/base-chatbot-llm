import { apiClient } from '../client.js'

export const conversationsApi = {
  list: () => apiClient.get('/api/conversations'),
  getMessages: (id) => apiClient.get(`/api/conversations/${id}/messages`),
  sendMessage: (id, body) => apiClient.post(`/api/conversations/${id}/messages`, { body }),
  updateStatus: (id, status) => apiClient.patch(`/api/conversations/${id}/status`, { status }),
  assign: (id, agentId) => apiClient.patch(`/api/conversations/${id}/assign`, { agentId }),
}
