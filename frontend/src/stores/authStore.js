import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, user: null }),
      isAuthenticated: () => !!useAuthStore.getState().accessToken,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // only persist user, not token
    }
  )
)
