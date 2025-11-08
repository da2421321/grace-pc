import type { AxiosResponse } from 'axios'
import { ApiError, type ApiResult } from '../../types'
import { showModalAsync } from '@/utils/promisify'
import { useUserStore } from '@/store/user'

function normalizeCode(code?: number | string) {
  if (code === undefined || code === null) return undefined
  const num = Number(code)
  return Number.isNaN(num) ? undefined : num
}

export async function codeInterceptor(response: AxiosResponse<ApiResult>) {
  const { data } = response
  if (!data || typeof data !== 'object') return response

  const code = normalizeCode(data.code)
  if (code === undefined || code === 200) return response

  if (code === 401) {
    const result = await showModalAsync({
      title: '提示',
      content: '登录状态已过期，您可以继续留在该页面，或者重新登录?',
      cancelText: '取消',
      confirmText: '确定',
    })
    if (result.confirm) {
      const store = useUserStore()
      store.reset()
      uni.reLaunch({ url: '/pages/login' })
    }
    throw new ApiError(response)
  }

  throw new ApiError(response)
}
