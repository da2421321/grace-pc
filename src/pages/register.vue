<script setup lang="ts">
import type { RegisterRequest } from '@/api'
import { reactive, ref } from 'vue'
import apis from '@/api'

interface AgreementInfo {
  title: string
  url: string
}

function parseAgreements(raw?: string): AgreementInfo[] {
  if (!raw) {
    return [
      { title: '隐私政策', url: 'https://ruoyi.vip/protocol.html' },
      { title: '用户服务协议', url: 'https://ruoyi.vip/protocol.html' },
    ]
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => ({
          title: item.title || '',
          url: item.url || '',
        }))
        .filter(item => item.title && item.url)
    }
    return []
  }
  catch {
    return []
  }
}

const codeUrl = ref('')
const captchaEnabled = ref(true)
const appInfo = {
  logo: import.meta.env.VITE_APP_LOGO,
  agreements: parseAgreements(import.meta.env.VITE_APP_AGREEMENTS),
}

const registerForm = reactive<RegisterRequest & { code: string }>({
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  uuid: '',
})

async function fetchCaptcha() {
  const res = await apis.auth.getCaptcha()
  captchaEnabled.value = res.captchaEnabled ?? true
  if (captchaEnabled.value) {
    codeUrl.value = `data:image/gif;base64,${res.img}`
    registerForm.uuid = res.uuid
  }
}

function showError(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

async function handleRegister() {
  if (!registerForm.username) {
    showError('请输入您的账号')
    return
  }
  if (!registerForm.password) {
    showError('请输入您的密码')
    return
  }
  if (!registerForm.confirmPassword) {
    showError('请再次输入您的密码')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    showError('两次输入的密码不一致')
    return
  }
  if (captchaEnabled.value && !registerForm.code) {
    showError('请输入验证码')
    return
  }
  try {
    uni.showLoading({ title: '注册中，请耐心等待...', icon: 'none' })
    await apis.auth.register(registerForm)
    uni.hideLoading()
    uni.showModal({
      title: '系统提示',
      content: `恭喜你，您的账号 ${registerForm.username} 注册成功！`,
      success(res) {
        if (res.confirm) {
          uni.redirectTo({ url: '/pages/login' })
        }
      },
    })
  }
  catch (error) {
    if (captchaEnabled.value) {
      fetchCaptcha()
    }
    uni.hideLoading()
    console.error(error)
  }
}

function handleUserLogin() {
  uni.navigateTo({ url: '/pages/login' })
}

fetchCaptcha().catch(() => {
  captchaEnabled.value = false
})
</script>

<template>
  <view class="min-h-screen bg-white pb-10">
    <view class="flex flex-col items-center pt-[15%] space-y-4 text-center">
      <image
        class="h-[100rpx] w-[100rpx] rounded"
        :src="appInfo.logo"
        mode="widthFix"
      />
      <text class="text-lg text-gray-800">
        若依移动端注册
      </text>
    </view>
    <view class="mx-auto mt-[15%] w-4/5 space-y-5">
      <view class="flex h-[45px] items-center gap-3 rounded-full bg-[#f5f6f7] px-4">
        <uni-icons type="person-filled" size="22" color="#999999" />
        <input
          v-model="registerForm.username"
          class="flex-1 text-sm"
          type="text"
          placeholder="请输入账号"
          :maxlength="30"
        >
      </view>
      <view class="flex h-[45px] items-center gap-3 rounded-full bg-[#f5f6f7] px-4">
        <uni-icons type="locked" size="22" color="#999999" />
        <input
          v-model="registerForm.password"
          type="text"
          :password="true"
          class="flex-1 text-sm"
          placeholder="请输入密码"
          :maxlength="20"
        >
      </view>
      <view class="flex h-[45px] items-center gap-3 rounded-full bg-[#f5f6f7] px-4">
        <uni-icons type="locked" size="22" color="#999999" />
        <input
          v-model="registerForm.confirmPassword"
          type="text"
          :password="true"
          class="flex-1 text-sm"
          placeholder="请输入重复密码"
          :maxlength="20"
        >
      </view>
      <view
        v-if="captchaEnabled"
        class="mx-auto flex h-[45px] w-3/5 items-center gap-3 rounded-full bg-[#f5f6f7] px-4"
      >
        <uni-icons type="scan" size="20" color="#999999" />
        <input
          v-model="registerForm.code"
          type="number"
          class="flex-1 text-sm"
          placeholder="请输入验证码"
          :maxlength="4"
        >
        <image
          :src="codeUrl"
          class="ml-2 h-[38px] w-[200rpx] rounded"
          @click="fetchCaptcha"
        />
      </view>
      <button
        class="mt-4 h-[45px] w-full rounded-full bg-blue-500 text-sm text-white flex items-center justify-center"
        @click="handleRegister"
      >
        注册
      </button>
    </view>
    <view class="mt-6 text-center text-sm text-blue-500 mt-2">
      <text @click="handleUserLogin">
        使用已有账号登录
      </text>
    </view>
  </view>
</template>
