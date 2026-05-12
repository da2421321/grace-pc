import type {
  AxiosInstance,
  AxiosRequestConfig,
  HeadersDefaults,
  ResponseType,
} from 'axios'
import axios from 'axios'

export type QueryParamsType = Record<string | number, any>

type AxiosRequestConfigExtended = AxiosRequestConfig & { skipAuth?: boolean }

export interface FullRequestParams
  extends Omit<
    AxiosRequestConfigExtended,
    'data' | 'params' | 'url' | 'responseType'
  > {
  secure?: boolean
  path: string
  type?: ContentType
  query?: QueryParamsType
  format?: ResponseType
  body?: unknown
}

export type RequestParams = Omit<
  FullRequestParams,
  'body' | 'method' | 'query' | 'path'
>

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfigExtended, 'data' | 'cancelToken'> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void
  secure?: boolean
  format?: ResponseType
}

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance
  private securityData: SecurityDataType | null = null
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker']
  private secure?: boolean
  private format?: ResponseType

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || '',
    })
    this.secure = secure
    this.format = format
    this.securityWorker = securityWorker
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data
  }

  protected mergeRequestParams(
    params1: AxiosRequestConfigExtended,
    params2?: AxiosRequestConfigExtended,
  ): AxiosRequestConfigExtended {
    const method = params1.method || (params2 && params2.method)

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method
          && this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ])
          || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    }
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === 'object' && formItem !== null) {
      return JSON.stringify(formItem)
    }
    else {
      return `${formItem}`
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key]
      const propertyContent: any[]
        = Array.isArray(property) ? property : [property]

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        )
      }

      return formData
    }, new FormData())
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    skipAuth,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams
      = ((typeof secure === 'boolean' ? secure : this.secure)
        && this.securityWorker
        && (await this.securityWorker(this.securityData)))
      || {}
    const requestParams = this.mergeRequestParams(params, secureParams)
    const responseFormat = format || this.format || undefined

    if (
      type === ContentType.FormData
      && body
      && body !== null
      && typeof body === 'object'
    ) {
      body = this.createFormData(body as Record<string, unknown>)
    }

    if (
      type === ContentType.Text
      && body
      && body !== null
      && typeof body !== 'string'
    ) {
      body = JSON.stringify(body)
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { 'Content-Type': type }
            : {}),
        },
        params: query,
        responseType: responseFormat,
        data: body,
        url: path,
        ...(skipAuth !== undefined ? { skipAuth } : {}),
      })
      .then(response => response.data)
  }
}

export interface LoginRequest {
  username: string
  password: string
  code?: string
  uuid?: string
}

export interface LoginResponse {
  token: string
}

export interface RegisterRequest {
  username: string
  password: string
  confirmPassword: string
  code?: string
  uuid?: string
}

export interface CaptchaResponse {
  captchaEnabled: boolean
  img: string
  uuid: string
}

export interface UserProfileForm {
  nickName: string
  phonenumber: string
  email: string
  sex: string
  [key: string]: unknown
}

export interface UserProfileResponse {
  data: UserProfileForm & Record<string, unknown>
  roleGroup: string
  postGroup: string
}

export interface UpdatePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface WechatLoginBody {
  spread_spid?: number
  nickName?: string
  sex?: number
  avatar?: string
}

export interface WechatLoginResponse {
  token?: string
  type: string
  key?: string
  data?: any
}

export interface WechatBindPhoneRequest {
  key: string
  encryptedData: string
  iv: string
  code: string
  type: string
  isCustomer: string
}

export interface UserInfoResponse {
  user: {
    userId: string
    userName: string
    avatar: string
  } & Record<string, unknown>
  roles: string[]
  permissions: string[]
}

export type DictQuery = Record<string, string | number | undefined>

export interface PcQualityImageItem {
  id: string
  enabled: boolean
  imageUrl: string
  varietyName: string
  varietyCode: string
  categoryPath: string[]
  topCategory: string
  groupKey?: string
  description?: string
}

export interface PcQualityImageResponse {
  items: PcQualityImageItem[]
}

export interface PcQualityCategoryNode {
  code: string
  name: string
  path: string
  children?: PcQualityCategoryNode[]
}

export interface PcQualityVarietyOption {
  code: string
  name: string
  topCategory: string
  categoryPath: string[]
  groupKey?: string
}

export interface PcQualityCategoryVarietyResponse {
  categories: PcQualityCategoryNode[]
  varieties: PcQualityVarietyOption[]
}

export interface PcQualityReportCreateRequest {
  imageId: string | number
  remark: string
}

export interface PcQualityReportStatusRequest {
  status: number
}

export interface PcQualityReportItem {
  reportId: string | number
  userId?: string | number
  username?: string
  imageId: string | number
  imageUrl?: string
  remark?: string
  status?: number
  createTime?: string
  updateTime?: string
  [key: string]: unknown
}

export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http
  }

  auth = {
    login: (data: LoginRequest, params: RequestParams = {}) =>
      this.http.request<LoginResponse>({
        path: '/pc/login',
        method: 'POST',
        body: data,
        type: ContentType.Json,
        skipAuth: true,
        ...params,
      }),
    register: (data: RegisterRequest, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/register',
        method: 'POST',
        body: data,
        type: ContentType.Json,
        skipAuth: true,
        ...params,
      }),
    getInfo: (params: RequestParams = {}) =>
      this.http.request<UserInfoResponse>({
        path: '/getInfo',
        method: 'GET',
        ...params,
      }),
    logout: (params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/logout',
        method: 'POST',
        ...params,
      }),
    getCaptcha: (params: RequestParams = {}) =>
      this.http.request<CaptchaResponse>({
        path: '/captchaImage',
        method: 'GET',
        skipAuth: true,
        ...params,
      }),
    sendCode: (data: { phone: string }, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/front/wechat/sendCode',
        method: 'POST',
        body: data,
        type: ContentType.Json,
        skipAuth: true,
        ...params,
      }),
    wechatLogin: (code: string, body: WechatLoginBody, params: RequestParams = {}) =>
      this.http.request<WechatLoginResponse>({
        path: '/front/wechat/authorize/program/login',
        method: 'POST',
        query: { code },
        body,
        type: ContentType.Json,
        skipAuth: true,
        ...params,
      }),
    wechatBindPhone: (data: WechatBindPhoneRequest, params: RequestParams = {}) =>
      this.http.request<LoginResponse>({
        path: '/front/wechat/register/binding/phone',
        method: 'POST',
        body: data,
        type: ContentType.Json,
        skipAuth: true,
        ...params,
      }),
  }

  user = {
    updatePassword: (data: UpdatePasswordRequest, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/user/profile/updatePwd',
        method: 'PUT',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
    getProfile: (params: RequestParams = {}) =>
      this.http.request<UserProfileResponse>({
        path: '/system/user/profile',
        method: 'GET',
        ...params,
      }),
    updateProfile: (data: UserProfileForm, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/user/profile',
        method: 'PUT',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
  }

  dictData = {
    list: (query?: DictQuery, params: RequestParams = {}) =>
      this.http.request<any>({
        path: '/system/dict/data/list',
        method: 'GET',
        query,
        ...params,
      }),
    get: (dictCode: string | number, params: RequestParams = {}) =>
      this.http.request<any>({
        path: `/system/dict/data/${dictCode}`,
        method: 'GET',
        ...params,
      }),
    getByType: (dictType: string, params: RequestParams = {}) =>
      this.http.request<any>({
        path: `/system/dict/data/type/${dictType}`,
        method: 'GET',
        ...params,
      }),
    create: (data: Record<string, unknown>, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/dict/data',
        method: 'POST',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
    update: (data: Record<string, unknown>, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/dict/data',
        method: 'PUT',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
    remove: (dictCode: string | number, params: RequestParams = {}) =>
      this.http.request<void>({
        path: `/system/dict/data/${dictCode}`,
        method: 'DELETE',
        ...params,
      }),
  }

  dictType = {
    list: (query?: DictQuery, params: RequestParams = {}) =>
      this.http.request<any>({
        path: '/system/dict/type/list',
        method: 'GET',
        query,
        ...params,
      }),
    get: (dictId: string | number, params: RequestParams = {}) =>
      this.http.request<any>({
        path: `/system/dict/type/${dictId}`,
        method: 'GET',
        ...params,
      }),
    create: (data: Record<string, unknown>, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/dict/type',
        method: 'POST',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
    update: (data: Record<string, unknown>, params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/dict/type',
        method: 'PUT',
        type: ContentType.Json,
        body: data,
        ...params,
      }),
    remove: (dictId: string | number, params: RequestParams = {}) =>
      this.http.request<void>({
        path: `/system/dict/type/${dictId}`,
        method: 'DELETE',
        ...params,
      }),
    refreshCache: (params: RequestParams = {}) =>
      this.http.request<void>({
        path: '/system/dict/type/refreshCache',
        method: 'DELETE',
        ...params,
      }),
    optionSelect: (params: RequestParams = {}) =>
      this.http.request<any>({
        path: '/system/dict/type/optionselect',
        method: 'GET',
        ...params,
      }),
  }

  pcQc = {
    qualityImages: (
      query?: {
        topCategory?: string
        categoryPath?: string
        varietyCode?: string
        keyword?: string
      },
      params: RequestParams = {},
    ) =>
      this.http.request<any>({
        path: '/front/pc/qc/quality-images',
        method: 'GET',
        query,
        ...params,
      }),
    categoryVarieties: (
      query?: {
        topCategory?: string
        categoryPath?: string
        keyword?: string
      },
      params: RequestParams = {},
    ) =>
      this.http.request<PcQualityCategoryVarietyResponse>({
        path: '/front/pc/qc/category-varieties',
        method: 'GET',
        query,
        ...params,
      }),
    createReport: (data: PcQualityReportCreateRequest, params: RequestParams = {}) =>
      this.http.request<PcQualityReportItem>({
        path: '/front/pc/qc/reports',
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
    myReports: (params: RequestParams = {}) =>
      this.http.request<PcQualityReportItem[]>({
        path: '/front/pc/qc/reports',
        method: 'GET',
        ...params,
      }),
    reportDetail: (reportId: string | number, params: RequestParams = {}) =>
      this.http.request<PcQualityReportItem>({
        path: `/front/pc/qc/reports/${reportId}`,
        method: 'GET',
        ...params,
      }),
    updateReportStatus: (
      reportId: string | number,
      data: PcQualityReportStatusRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<any>({
        path: `/front/pc/qc/reports/${reportId}/status`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  }
}
