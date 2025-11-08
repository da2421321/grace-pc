import { AxiosError, type AxiosResponse } from 'axios'

export interface ApiResult<D = unknown> {
  success: boolean
  code: string
  message: string
  data?: D
}

export class RetryError extends Error {}

export function getErrorMessage(
  res: AxiosResponse<ApiResult>,
): string | undefined {
  if (!res)
    return '网络异常'
  const { data } = res
  return data.message
}

export class ApiError<T extends ApiResult> extends AxiosError {
  response: AxiosResponse<ApiResult>

  constructor(response: AxiosResponse<T>) {
    const message = getErrorMessage(response)
    super(message)
    this.response = response
  }
}
