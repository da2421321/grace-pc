import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/user'

type RequestConfig = AxiosRequestConfig & { skipAuth?: boolean }

export function tokenInterceptor(config: RequestConfig) {
  const userStore = useUserStore()
  config.headers = config.headers ?? {}

  if (!config.skipAuth && userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }

  return config as InternalAxiosRequestConfig
}
