import axiosRetry from 'axios-retry'
import type { AxiosRequestConfig } from 'axios'
import { axiosUniAdapter } from './adapter'
import { Api, HttpClient } from './services'

import { tokenInterceptor } from './interceptors/request/token'
import { codeInterceptor } from './interceptors/response/code'
import { errorInterceptor } from './interceptors/response/error'
import { RetryError } from './types'

const config: AxiosRequestConfig = {
  baseURL:
    import.meta.env.VITE_APP_BASE_URL || 'https://vue.ruoyi.vip/prod-api',
  timeout: 30000,
  adapter: axiosUniAdapter,
}

const http = new HttpClient(config)
axiosRetry(http.instance, {
  retries: 1,
  retryCondition: (error: unknown) => error instanceof RetryError,
})

// 拦截器
http.instance.interceptors.request.use(tokenInterceptor)
http.instance.interceptors.response.use(codeInterceptor, errorInterceptor)

export const apis = new Api(http)

export default apis
export * from './services'
