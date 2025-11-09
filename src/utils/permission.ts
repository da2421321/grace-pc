import { useUserStore } from '@/store/user'

const ALL_PERMISSION = '*:*:*'
const SUPER_ADMIN = 'admin'

export function checkPermi(value: string[]): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    console.error(
      "need roles! Like checkPermi=\"['system:user:add','system:user:edit']\"",
    )
    return false
  }
  const store = useUserStore()
  const permissions = store.permissions || []
  return permissions.some(
    (permission) =>
      permission === ALL_PERMISSION || value.includes(permission),
  )
}

export function checkRole(value: string[]): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    console.error("need roles! Like checkRole=\"['admin','editor']\"")
    return false
  }
  const store = useUserStore()
  const roles = store.roles || []
  return roles.some((role) => role === SUPER_ADMIN || value.includes(role))
}
