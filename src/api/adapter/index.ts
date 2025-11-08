import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig, type Method } from 'axios'
import axios from 'axios'

export function axiosUniAdapter(config: AxiosRequestConfig) {
  return new Promise<AxiosResponse>((resolve, reject) => {
    let task: UniApp.RequestTask | null = uni.request({
      url: axios.getUri(config),
      header: { ...config.headers },
      data: config.data,
      method: (config.method as Method).toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE',
      timeout: config.timeout,
      dataType: config.responseType,
      responseType: config.responseType !== 'arraybuffer' ? 'text' : 'arraybuffer',
      // withCredentials: config.withCredentials,
      success: (res) => {
        const response = {
          data: res.data,
          status: res.statusCode,
          statusText: '', // uni 无法获取到statusText，不过貌似也没啥用
          headers: res.header,
          config: config as InternalAxiosRequestConfig,
        }

        const validateStatus = response.config.validateStatus
        if (!response.status || !validateStatus || validateStatus(response.status)) {
          resolve(response)
        }
        else {
          reject(new AxiosError(
            `Request failed with status code ${response.status}`,
            [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
            response.config,
            undefined,
            response,
          ))
        }
      },
      fail(err) {
        console.error(err)
        reject(err)
      },
    })

    // 适配取消请求
    if (config.cancelToken) {
      // Handle cancellation
      // 若在外层执行了取消请求的方法，则这里将当前的请求取消掉
      config.cancelToken.promise.then((cancel) => {
        if (!task)
          return
        // xhr中使用abort方法取消当前请求
        task.abort()
        reject(cancel)
        // Clean up request
        task = null
      })
    }
  })
}
