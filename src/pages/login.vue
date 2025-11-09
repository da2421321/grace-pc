<script setup lang="ts">
import type { LoginRequest } from '@/api'
import { onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'
import apis from '@/api'
import { useUserStore } from '@/store/user'

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

const userStore = useUserStore()
const codeUrl = ref('')
const captchaEnabled = ref(true)
const registerEnabled = ref(false)
const appInfo = {
  logo: import.meta.env.VITE_APP_LOGO,
  agreements: parseAgreements(import.meta.env.VITE_APP_AGREEMENTS),
}

const loginForm = reactive<LoginRequest & { code: string }>({
  username: 'admin',
  password: 'admin123',
  code: '',
  uuid: '',
})

async function fetchCaptcha() {
  const res = await apis.auth.getCaptcha()
  captchaEnabled.value = res.captchaEnabled ?? true
  if (captchaEnabled.value) {
    codeUrl.value = `data:image/gif;base64,${res.img}`
    loginForm.uuid = res.uuid
  }
}

function navigateToAgreement(index: number) {
  const site = appInfo.agreements[index]
  if (site) {
    uni.navigateTo({
      url: `/pages/common/webview/index?title=${site.title}&url=${site.url}`,
    })
  }
}

function showError(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

async function handleLogin() {
  if (!loginForm.username) {
    showError('请输入账号')
    return
  }
  if (!loginForm.password) {
    showError('请输入密码')
    return
  }
  if (captchaEnabled.value && !loginForm.code) {
    showError('请输入验证码')
    return
  }
  try {
    uni.showLoading({ title: '登录中，请耐心等待...', icon: 'none' })
    await userStore.login(loginForm)
    await userStore.fetchProfile()
    uni.reLaunch({ url: '/pages/index' })
  }
  catch (error) {
    if (captchaEnabled.value) {
      fetchCaptcha()
    }
    console.error(error)
  }
  finally {
    uni.hideLoading()
  }
}

function handleUserRegister() {
  uni.redirectTo({ url: '/pages/register' })
}

function handlePrivacy() {
  navigateToAgreement(0)
}

function handleUserAgrement() {
  navigateToAgreement(1)
}

fetchCaptcha().catch(() => {
  captchaEnabled.value = false
})

// #ifdef H5
onLoad(() => {
  if (userStore.token) {
    uni.reLaunch({ url: '/pages/index' })
  }
})
// #endif
</script>

<template>
  <view class="min-h-screen bg-white pb-10">
    <view class="flex flex-col items-center pt-[15%] text-center space-y-4">
      <image
        class="w-[100rpx] h-[100rpx] rounded"
        :src="appInfo.logo"
        mode="widthFix"
      />
      <text class="text-lg text-gray-800">
        若依移动端登录
      </text>
    </view>
    <view class="mx-auto mt-[15%] w-4/5 space-y-5">
      <view class="flex h-[45px] items-center rounded-full bg-[#f5f6f7] px-4 gap-3">
        <uni-icons
          type="person-filled"
          size="22"
          color="#999999"
        />
        <input
          v-model="loginForm.username"
          class="flex-1 text-sm"
          type="text"
          placeholder="请输入账号"
          :maxlength="30"
        >
      </view>
      <view class="flex h-[45px] items-center rounded-full bg-[#f5f6f7] px-4 gap-3">
        <uni-icons
          type="locked"
          size="22"
          color="#999999"
        />
        <input
          v-model="loginForm.password"
          type="text"
          :password="true"
          class="flex-1 text-sm"
          placeholder="请输入密码"
          :maxlength="20"
        >
      </view>
      <view
        v-if="captchaEnabled"
        class="flex h-[45px] items-center rounded-full bg-[#f5f6f7] px-4 gap-3 mx-auto"
      >
        <uni-icons
          type="scan"
          size="20"
          color="#999999"
        />
        <input
          v-model="loginForm.code"
          type="number"
          class="flex-1 text-sm"
          placeholder="请输入验证码"
          :maxlength="4"
        >
        <image
          :src="codeUrl"
          class="h-[38px] w-[200rpx] rounded ml-2"
          @click="fetchCaptcha"
        />
      </view>
      <button
        class="mt-4 h-[45px] w-full rounded-full bg-blue-500 text-sm text-white flex items-center justify-center"
        @click="handleLogin"
      >
        登录
      </button>
      <view
        v-if="registerEnabled"
        class="text-center text-sm text-gray-500"
      >
        <text>
          没有账号？
        </text>
        <text
          class="text-blue-500"
          @click="handleUserRegister"
        >
          立即注册
        </text>
      </view>
      <view class="text-center text-sm text-gray-600 mt-2">
        <text>
          登录即代表同意
        </text>
        <text
          class="text-blue-500"
          @click="handleUserAgrement"
        >
          《用户协议》
        </text>
        <text
          class="text-blue-500"
          @click="handlePrivacy"
        >
          《隐私协议》
        </text>
      </view>
    </view>
  </view>
</template>
