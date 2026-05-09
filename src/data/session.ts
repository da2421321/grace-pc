export interface InternalUser {
  id: string
  name: string
  dept: string
  email: string
  phone: string
}

const STORAGE_KEY = 'miniapp_internal_session_user'
const PASSWORD_KEY = 'miniapp_internal_session_password'
const INITIAL_PASSWORD = '123456'

export const DEFAULT_USER: InternalUser = {
  id: 'U-10086',
  name: '张品检',
  dept: '品质管理部',
  email: 'qc@company.internal',
  phone: '13800138000',
}

export const ADMIN_CONTACT = {
  name: '系统管理员',
  phone: '400-000-0000',
  email: 'admin@company.internal',
  wechat: 'gracer-admin',
}

function readJson<T>(key: string): T | undefined {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw || typeof raw !== 'string')
      return undefined
    return JSON.parse(raw) as T
  }
  catch {
    return undefined
  }
}

export function getCurrentUser(): InternalUser {
  return readJson<InternalUser>(STORAGE_KEY) ?? DEFAULT_USER
}

export function setCurrentUser(user: InternalUser) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(user))
}

export function verifyInternalPassword(plain: string): boolean {
  const stored = uni.getStorageSync(PASSWORD_KEY)
  const effective = typeof stored === 'string' && stored ? stored : INITIAL_PASSWORD
  return plain === effective
}

export function updateInternalPassword(plain: string) {
  uni.setStorageSync(PASSWORD_KEY, plain)
}

export function clearInternalSession() {
  uni.removeStorageSync(STORAGE_KEY)
  uni.removeStorageSync(PASSWORD_KEY)
}
