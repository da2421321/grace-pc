import { isCancel } from 'axios'
import type { AxiosError, CanceledError } from 'axios'
import { ApiError, getErrorMessage, type ApiResult } from '../../types'
import { showToastAsync } from '@/utils/promisify'

async function tryShowErrorMsg(error: AxiosError<ApiResult>) {
  const message = error.response ? getErrorMessage(error.response) : error.message
  if (error.response?.status && error.response?.status >= 500) {
    await showToastAsync({
      title: message,
      icon: 'none',
      duration: 2000,
    })
    return
  }
  const shouldShow = ((error.response?.config as { showErrorMsg?: boolean } | undefined)?.showErrorMsg ?? true)
  if (shouldShow) {
    await showToastAsync({ title: message, icon: 'none', duration: 2000 })
  }
}

export async function errorInterceptor(
  responseError: AxiosError<ApiResult> | CanceledError<any>,
) {
  if (isCancel(responseError))
    throw responseError

  const apiError = new ApiError(
    (responseError as AxiosError<ApiResult>).response!,
  )

  // 错误消息提示
  await tryShowErrorMsg(apiError)

  throw apiError
}
