<script setup lang="ts">
import type { LoginRequest } from '@/api'
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const submitting = ref(false)
const showPassword = ref(false)
const navBarHeight = ref(88)
const navMenuTop = ref(40)
const navMenuHeight = ref(48)

const loginForm = reactive<LoginRequest>({
  username: '',
  password: '',
})

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

const navTitleStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
  height: `${navMenuHeight.value}px`,
  lineHeight: `${navMenuHeight.value}px`,
}))

onMounted(() => {
  initNavBar()
})

onLoad(() => {
  if (userStore.token) {
    uni.reLaunch({ url: '/pages/index' })
  }
})

function initNavBar() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 0

    // #ifdef MP-WEIXIN
    const menuButton = uni.getMenuButtonBoundingClientRect()
    const navGap = Math.max(menuButton.top - statusBarHeight, 0)
    navMenuTop.value = menuButton.top
    navMenuHeight.value = menuButton.height
    navBarHeight.value = menuButton.bottom + navGap
    return undefined
    // #endif

    navMenuTop.value = statusBarHeight
    navMenuHeight.value = 44
    navBarHeight.value = statusBarHeight + 44
  }
  catch {
    navMenuTop.value = 40
    navMenuHeight.value = 48
    navBarHeight.value = 88
  }
}

function showError(title: string) {
  uni.showToast({
    title,
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
</script>

<template>
  <view class="login-page">
    <image
      class="login-bg"
      src="/static/images/figma/mine/mine-bg.svg"
      mode="scaleToFill"
    />

    <view
      class="login-nav"
      :style="navBarStyle"
    >
      <text
        class="login-nav-title"
        :style="navTitleStyle"
      >
        登录
      </text>
    </view>

    <view class="login-title">
      <text class="login-title-welcome">欢迎登录</text>
      <text class="login-title-name">品检图例小程序</text>
    </view>

    <view class="login-form">
      <view class="login-field">
        <uni-icons
          type="person-filled"
          size="22"
          color="#777978"
        />
        <input
          v-model="loginForm.username"
          class="login-input"
          type="text"
          placeholder="请输入账号"
          placeholder-class="login-placeholder"
          :maxlength="30"
        >
      </view>

      <view class="login-field">
        <uni-icons
          type="locked-filled"
          size="22"
          color="#777978"
        />
        <input
          v-model="loginForm.password"
          class="login-input"
          type="text"
          :password="!showPassword"
          placeholder="请输入密码"
          placeholder-class="login-placeholder"
          :maxlength="50"
          confirm-type="done"
          @confirm="handleLogin"
        >
        <uni-icons
          class="password-eye"
          :type="showPassword ? 'eye-filled' : 'eye-slash-filled'"
          size="20"
          color="#777978"
          @click="togglePassword"
        />
      </view>

      <button
        class="login-button"
        :disabled="submitting"
        :loading="submitting"
        hover-class="login-button-active"
        @click="handleLogin"
      >
        登录
      </button>
    </view>
  </view>
</template>

<style scoped>
.login-page {
  position: relative;
  box-sizing: border-box;
  width: 750rpx;
  max-width: 100vw;
  min-height: calc(100vh - var(--window-bottom, 0px));
  overflow-x: hidden;
  background: #f7f7f7;
  color: #25262b;
}

.login-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 750rpx;
  height: 421rpx;
}

.login-nav {
  position: relative;
  z-index: 1;
  width: 750rpx;
}

.login-nav-title {
  position: absolute;
  left: 66rpx;
  color: #1a2f4d;
  font-size: 36rpx;
  font-weight: 400;
}

.login-title {
  position: relative;
  z-index: 1;
  margin-top: 175rpx;
  text-align: center;
  letter-spacing: 2rpx;
}

.login-title-welcome,
.login-title-name {
  display: block;
  color: #25262b;
}

.login-title-welcome {
  height: 86rpx;
  font-size: 44rpx;
  font-weight: 500;
  line-height: 86rpx;
}

.login-title-name {
  height: 100rpx;
  font-size: 60rpx;
  font-weight: 700;
  line-height: 100rpx;
}

.login-form {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  margin: 112rpx 51rpx 0;
}

.login-field {
  display: flex;
  box-sizing: border-box;
  width: 648rpx;
  height: 92rpx;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 30rpx;
  padding: 0 34rpx;
  border-radius: 100rpx;
  background: #fff;
}

.login-input {
  flex: 1;
  min-width: 0;
  height: 92rpx;
  color: #25262b;
  font-size: 30rpx;
  line-height: 92rpx;
}

.login-placeholder {
  color: #b6b6b4;
  font-size: 30rpx;
}

.password-eye {
  flex-shrink: 0;
}

.login-button {
  width: 648rpx;
  height: 80rpx;
  margin: 60rpx 0 0;
  padding: 0;
  border: 0;
  border-radius: 100rpx;
  background: #25262b;
  color: #fff;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 80rpx;
  text-align: center;
}

.login-button-active {
  background: #33343a;
}

.login-button::after {
  border: 0;
}
</style>
