import { create } from 'zustand'

export const useWsStore = create((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}))
