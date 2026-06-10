import axios from 'axios'
import { useAuthStore } from '../stores/authStore.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // for httpOnly refresh token cookie
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let refreshQueue = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
        const { accessToken } = data
        useAuthStore.getState().setAccessToken(accessToken)
        refreshQueue.forEach(({ resolve }) => resolve(accessToken))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (err) {
        refreshQueue.forEach(({ reject }) => reject(err))
        refreshQueue = []
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)
