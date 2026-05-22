import type { AxiosResponse } from 'axios'
import { ApiError, type ApiResult } from '../../types'
import { showModalAsync, showToastAsync } from '@/utils/promisify'
import { useUserStore } from '@/store/user'

function normalizeCode(code?: number | string) {
  if (code === undefined || code === null) return undefined
  const num = Number(code)
  return Number.isNaN(num) ? undefined : num
}

function isTokenInvalidMessage(msg?: string) {
  if (!msg) return false
  const normalizedMsg = msg.toLowerCase()
  return normalizedMsg.includes('loginuser') || (normalizedMsg.includes('token') && normalizedMsg.includes('bearer'))
}

export async function codeInterceptor(response: AxiosResponse<ApiResult>) {
  const { data } = response
  if (!data || typeof data !== 'object') return response

  const code = normalizeCode(data.code)
  if (code === undefined || code === 200) return response

  if (code === 401) {
    try {
      await showModalAsync({
        title: '提示',
        content: '登录状态已过期，您可以继续留在该页面，或者重新登录?',
        cancelText: '取消',
        confirmText: '确定',
      })
      const store = useUserStore()
      store.reset()
      uni.reLaunch({ url: '/pages/login' })
    }
    catch {
      // user canceled, swallow rejection but still throw ApiError to keep flow consistent
    }
    throw new ApiError(response)
  }

  if (code === 500 && isTokenInvalidMessage(data.msg)) {
    await showToastAsync({ title: '登录状态已过期，请重新登录', icon: 'none' })
    const store = useUserStore()
    store.reset()
    uni.reLaunch({ url: '/pages/login' })
    throw new ApiError(response)
  }

  throw new ApiError(response)
}
