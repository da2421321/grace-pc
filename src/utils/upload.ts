import { useUserStore } from '@/store/user'
import { showModalAsync, showToastAsync, uploadFile } from '@/utils/promisify'

const errorCode: Record<number | 'default', string> = {
  401: '认证失败，无法访问系统资源',
  403: '当前操作没有权限',
  404: '访问资源不存在',
  default: '系统未知错误，请反馈给管理员',
}

type UploadHeaders = Record<string, string | number | boolean | undefined> & {
  isToken?: boolean
}

export interface UploadRequestConfig {
  url: string
  filePath: string
  name?: string
  formData?: Record<string, unknown>
  params?: Record<string, unknown>
  headers?: UploadHeaders
  timeout?: number
}

type UploadResponse<T = unknown> = T & {
  code?: number
  msg?: string
}

const DEFAULT_TIMEOUT = 10000
const baseUrl = import.meta.env.VITE_APP_BASE_URL

function tansParams(params: Record<string, unknown>): string {
  let result = ''

  Object.keys(params).forEach((propName) => {
    const value = params[propName]
    const part = `${encodeURIComponent(propName)}=`
    if (value === null || value === '' || typeof value === 'undefined') {
      return
    }

    if (typeof value === 'object' && value !== null) {
      const nested = value as Record<string, unknown>
      Object.keys(nested).forEach((key) => {
        const nestedValue = nested[key]
        if (
          nestedValue !== null &&
          nestedValue !== '' &&
          typeof nestedValue !== 'undefined'
        ) {
          const paramKey = `${propName}[${key}]`
          const subPart = `${encodeURIComponent(paramKey)}=`
          result += `${subPart + encodeURIComponent(String(nestedValue))}&`
        }
      })
      return
    }

    result += `${part + encodeURIComponent(String(value))}&`
  })

  return result
}

function appendQuery(url: string, params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) {
    return url
  }
  const queryString = tansParams(params).replace(/&$/, '')
  return `${url}?${queryString}`
}

function resolveErrorMessage(code: number, fallback?: string) {
  const systemMessage =
    (errorCode as Record<number, string>)[code] || errorCode.default
  return fallback || systemMessage
}

function isUniError(
  error: unknown,
): error is UniApp.GeneralCallbackResult {
  return Boolean(error)
    && typeof error === 'object'
    && 'errMsg' in (error as Record<string, unknown>)
}

export default async function upload<T = unknown>(config: UploadRequestConfig) {
  const header: UploadHeaders = { ...(config.headers || {}) }
  const shouldAttachToken = header.isToken !== false
  if (shouldAttachToken) {
    const store = useUserStore()
    if (store.token) header.Authorization = `Bearer ${store.token}`
  }
  delete header.isToken

  const requestUrl = appendQuery(config.url, config.params)

  try {
    const res = await uploadFile({
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      url: baseUrl + requestUrl,
      filePath: config.filePath,
      name: config.name || 'file',
      header,
      formData: config.formData,
    })
    const result = JSON.parse(res.data) as UploadResponse<T>
    const code = result.code ?? 200
    const msg = resolveErrorMessage(code, result.msg)
    if (code === 200) {
      return result
    }
    if (code === 401) {
      try {
        await showModalAsync({
          title: '提示',
          content: '登录状态已过期，您可以重新登录?',
          cancelText: '取消',
          confirmText: '确定',
        })
        useUserStore().reset()
        uni.reLaunch({ url: '/pages/login' })
      } catch {
        // ignore if user cancels the modal
      }
      throw new Error('无效的会话或会话已过期')
    }
    await showToastAsync({ title: msg, icon: 'none' })
    throw new Error(String(code))
  } catch (error) {
    const err = error as UniApp.GeneralCallbackResult | Error
    if (isUniError(err)) {
      let message = err.errMsg || '网络错误'
      if (message === 'Network Error') {
        message = '后端接口连接异常'
      } else if (message.includes('timeout')) {
        message = '系统接口请求超时'
      } else if (message.includes('status code')) {
        message = `系统接口${message.slice(-3)}异常`
      }
      await showToastAsync({ title: message, icon: 'none' })
    } else if (err instanceof Error) {
      await showToastAsync({ title: err.message || '网络错误', icon: 'none' })
    }
    throw err
  }
}

export function uploadAvatar(filePath: string, name = 'avatarfile') {
  return upload<{ imgUrl: string }>({
    url: '/system/user/profile/avatar',
    filePath,
    name,
  })
}
