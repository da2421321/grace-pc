import { AxiosError, type AxiosResponse } from 'axios'

export interface ApiResult<D = unknown> {
  code?: number
  msg?: string
  message?: string
  data?: D
}

export class RetryError extends Error {}

export function getErrorMessage(
  res?: AxiosResponse<ApiResult>,
): string {
  if (!res)
    return '网络异常'
  const { data } = res
  return data.msg || data.message || '系统未知错误'
}

export class ApiError<T extends ApiResult> extends AxiosError {
  response?: AxiosResponse<ApiResult>

  constructor(response?: AxiosResponse<T>) {
    const message = getErrorMessage(response)
    super(message, undefined, response?.config, response?.request, response)
    this.response = response
  }
}
