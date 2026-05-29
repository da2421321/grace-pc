import type { AxiosResponse } from 'axios'
import { ApiError, getErrorMessage, type ApiResult } from '../../types'
import { showToastAsync } from '@/utils/promisify'
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

function shouldShowErrorMsg(response: AxiosResponse<ApiResult>) {
  return ((response.config as { showErrorMsg?: boolean } | undefined)?.showErrorMsg ?? true)
}

export async function codeInterceptor(response: AxiosResponse<ApiResult>) {
  const { data } = response
  if (!data || typeof data !== 'object') return response

  const code = normalizeCode(data.code)
  if (code === undefined || code === 200) return response

  if (code === 401) {
    await showToastAsync({
      title: data.msg || '用户未登录或登录已过期',
      icon: 'none',
      duration: 2000,
    })
    const store = useUserStore()
    store.reset()
    uni.reLaunch({ url: '/pages/login' })
    throw new ApiError(response)
  }

  if (code === 500 && isTokenInvalidMessage(data.msg)) {
    await showToastAsync({ title: '登录状态已过期，请重新登录', icon: 'none' })
    const store = useUserStore()
    store.reset()
    uni.reLaunch({ url: '/pages/login' })
    throw new ApiError(response)
  }

  if (shouldShowErrorMsg(response)) {
    await showToastAsync({
      title: getErrorMessage(response),
      icon: 'none',
      duration: 2000,
    })
  }

  throw new ApiError(response)
}
