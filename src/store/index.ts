import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()

const uniStorage = {
  getItem: (key: string): string | null => {
    const value = uni.getStorageSync(key)
    if (value === undefined || value === null) return null
    return typeof value === 'string' ? value : JSON.stringify(value)
  },
  setItem: (key: string, value: string): void => {
    uni.setStorageSync(key, value)
  },
  removeItem: (key: string): void => {
    uni.removeStorageSync(key)
  },
}

const persistedPlugin = createPersistedState({
  storage: uniStorage,
})

pinia.use(persistedPlugin)

export { pinia }