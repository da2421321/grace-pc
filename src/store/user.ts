import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apis, { type LoginRequest } from '@/api'
import defAva from '@/static/images/profile.jpg'

const baseUrl = import.meta.env.VITE_APP_BASE_URL
const ALL_PERMISSION = '*:*:*'
const SUPER_ADMIN = 'admin'

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref('')
    const id = ref('')
    const name = ref('')
    const avatar = ref('')
    const roles = ref<string[]>([])
    const permissions = ref<string[]>([])

    const isLoggedIn = computed(() => Boolean(token.value))

    async function login(payload: LoginRequest) {
      const username = payload.username.trim()
      const response = await apis.auth.login({
        ...payload,
        username,
      })
      token.value = response.token
    }

    async function fetchProfile() {
      const res = await apis.auth.getInfo()
      const user = res.user
      const userId = user?.userId ?? ''
      const userName = user?.userName ?? ''
      let avatarUrl = user?.avatar ?? ''
      if (!avatarUrl) {
        avatarUrl = defAva
      } else if (!/^https?:\/\//.test(avatarUrl)) {
        avatarUrl = `${baseUrl}${avatarUrl}`
      }
      if (res.roles && res.roles.length > 0) {
        roles.value = [...res.roles]
        permissions.value = res.permissions || []
      } else {
        roles.value = ['ROLE_DEFAULT']
        permissions.value = []
      }
      id.value = userId
      name.value = userName
      avatar.value = avatarUrl
      return res
    }

    async function logout() {
      if (token.value) {
        try {
          await apis.auth.logout()
        } catch {
          // ignore API errors during logout
        }
      }
      reset()
    }

    function setAvatar(avatarUrl: string) {
      avatar.value = avatarUrl
    }

    function reset() {
      token.value = ''
      roles.value = []
      permissions.value = []
      id.value = ''
      name.value = ''
      avatar.value = ''
    }

    function hasPermission(permission: string) {
      if (!permission) return false
      return permissions.value.some(
        (item) => item === ALL_PERMISSION || item === permission,
      )
    }

    function hasAnyPermission(required: string[]) {
      if (!Array.isArray(required) || required.length === 0) return false
      return required.some((item) => hasPermission(item))
    }

    function hasAllPermissions(required: string[]) {
      if (!Array.isArray(required) || required.length === 0) return false
      return required.every((item) => hasPermission(item))
    }

    function hasRole(role: string) {
      if (!role) return false
      return roles.value.some(
        (item) => item === SUPER_ADMIN || item === role,
      )
    }

    function hasAnyRole(required: string[]) {
      if (!Array.isArray(required) || required.length === 0) return false
      return required.some((item) => hasRole(item))
    }

    function hasAllRoles(required: string[]) {
      if (!Array.isArray(required) || required.length === 0) return false
      return required.every((item) => hasRole(item))
    }

    return {
      token,
      id,
      name,
      avatar,
      roles,
      permissions,
      isLoggedIn,
      login,
      fetchProfile,
      logout,
      setAvatar,
      reset,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
    }
  },
  {
    persist: {
      key: 'user-store',
      pick: ['token', 'id', 'name', 'avatar', 'roles', 'permissions'],
    },
  },
)
