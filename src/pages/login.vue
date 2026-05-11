<script setup lang="ts">
import type { LoginRequest } from '@/api'
import { useUserStore } from '@/store/user'
import { onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'

const userStore = useUserStore()
const appInfo = {
  logo: import.meta.env.VITE_APP_LOGO,
}

const loginForm = reactive<LoginRequest>({
  username: '',
  password: '',
})

const submitting = ref(false)
const showPassword = ref(false)

function showError(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function handleLogin() {
  if (!loginForm.username.trim()) {
    showError('请输入账号')
    return
  }
  if (!loginForm.password) {
    showError('请输入密码')
    return
  }

  try {
    submitting.value = true
    uni.showLoading({ title: '登录中...', mask: true })
    await userStore.login(loginForm)
    await userStore.fetchProfile()
    uni.reLaunch({ url: '/pages/index' })
  }
  catch (error) {
    console.error(error)
  }
  finally {
    submitting.value = false
    uni.hideLoading()
  }
}

onLoad(() => {
  if (userStore.token) {
    uni.reLaunch({ url: '/pages/index' })
  }
})
</script>

<template>
  <view class="min-h-screen bg-white px-8 pb-10">
    <view class="flex flex-col items-center pt-[18%] text-center">
      <image
        class="h-[112rpx] w-[112rpx] rounded"
        :src="appInfo.logo"
        mode="widthFix"
      />
      <text class="mt-4 text-xl font-semibold text-gray-900">
        PC质检小程序
      </text>
      <text class="mt-2 text-sm text-gray-500">
        使用后台账号密码登录
      </text>
    </view>

    <view class="mt-[18%] space-y-5">
      <view class="flex h-[48px] items-center gap-3 rounded-lg bg-[#f5f6f7] px-4">
        <uni-icons
          type="person-filled"
          size="22"
          color="#999999"
        />
        <input
          v-model="loginForm.username"
          class="min-w-0 flex-1 text-sm"
          type="text"
          placeholder="请输入账号"
          :maxlength="30"
        >
      </view>

      <view class="flex h-[48px] items-center gap-3 rounded-lg bg-[#f5f6f7] px-4">
        <uni-icons
          type="locked-filled"
          size="22"
          color="#999999"
        />
        <input
          v-model="loginForm.password"
          class="min-w-0 flex-1 text-sm"
          type="text"
          :password="!showPassword"
          placeholder="请输入密码"
          :maxlength="50"
          confirm-type="done"
          @confirm="handleLogin"
        >
        <uni-icons
          :type="showPassword ? 'eye-filled' : 'eye-slash-filled'"
          size="20"
          color="#999999"
          @click="togglePassword"
        />
      </view>

      <button
        class="mt-7 flex h-[48px] w-full items-center justify-center rounded-lg bg-blue-500 text-base text-white"
        :disabled="submitting"
        :loading="submitting"
        @click="handleLogin"
      >
        登录
      </button>
    </view>
  </view>
</template>
