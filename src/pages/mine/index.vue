<script setup lang="ts">
import type { InternalUser } from '@/data/session'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import apis from '@/api'
import {
  ADMIN_CONTACT,
  clearInternalSession,
  getCurrentUser,
  setCurrentUser,
} from '@/data/session'
import { useUserStore } from '@/store/user'

type SheetKind = 'info' | 'pwd' | 'admin' | ''

const userStore = useUserStore()
const user = ref<InternalUser>(getCurrentUser())
const sheet = ref<SheetKind>('')
const pwdOld = ref('')
const pwdNew = ref('')
const pwdAgain = ref('')
const passwordSubmitting = ref(false)

const initials = computed(() => {
  const name = user.value.name.trim()
  if (!name)
    return '?'
  return name.length <= 2 ? name : name.slice(-2)
})

onShow(() => {
  loadUserInfo()
})

async function loadUserInfo() {
  if (!userStore.token) {
    user.value = getCurrentUser()
    return
  }

  try {
    const response = await userStore.fetchProfile()
    const nextUser = normalizeUserInfo(response.user)
    setCurrentUser(nextUser)
    user.value = nextUser
  }
  catch {
    user.value = getCurrentUser()
  }
}

function normalizeUserInfo(raw: Record<string, unknown> = {}): InternalUser {
  const dept = raw.dept && typeof raw.dept === 'object'
    ? raw.dept as Record<string, unknown>
    : {}

  return {
    id: String(raw.userId ?? raw.id ?? ''),
    name: String(raw.nickName || raw.userName || raw.name || ''),
    dept: String(dept.deptName || raw.deptName || ''),
    email: String(raw.email || ''),
    phone: String(raw.phonenumber || raw.phone || ''),
  }
}

function openSheet(kind: SheetKind) {
  sheet.value = kind
  if (kind === 'pwd') {
    pwdOld.value = ''
    pwdNew.value = ''
    pwdAgain.value = ''
  }
}

function closeSheet() {
  sheet.value = ''
  pwdOld.value = ''
  pwdNew.value = ''
  pwdAgain.value = ''
}

function goReports() {
  uni.navigateTo({ url: '/pages/report/list' })
}

function goUserInfo() {
  openSheet('info')
}

async function submitPassword() {
  if (passwordSubmitting.value)
    return
  if (!pwdOld.value) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' })
    return
  }
  if (!pwdNew.value || pwdNew.value.length < 6) {
    uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
    return
  }
  if (pwdNew.value !== pwdAgain.value) {
    uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
    return
  }

  passwordSubmitting.value = true
  try {
    await apis.user.updatePassword({
      oldPassword: pwdOld.value,
      newPassword: pwdNew.value,
    })
    closeSheet()
    uni.showToast({ title: '密码已更新', icon: 'success' })
  }
  finally {
    passwordSubmitting.value = false
  }
}

function copyText(text: string, label: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: `已复制${label}`, icon: 'none' })
    },
  })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: async (res) => {
      if (!res.confirm)
        return
      await userStore.logout()
      clearInternalSession()
      user.value = getCurrentUser()
      uni.reLaunch({ url: '/pages/login' })
    },
  })
}
</script>

<template>
  <view class="mine-page">
    <!-- 顶部背景 -->
    <view class="bg-header" />

    <!-- 头像组 -->
    <view class="profile-section" @click="goUserInfo">
      <view class="avatar-wrapper">
        <view class="avatar">
          {{ initials }}
        </view>
      </view>
      <view class="profile-info">
        <text class="profile-name">{{ user.name }}</text>
        <text class="profile-dept">{{ user.dept }}</text>
      </view>
      <view class="arrow-icon">›</view>
    </view>

    <!-- 功能卡片 -->
    <view class="service-card">
      <text class="service-title">我的服务</text>
      
      <view class="service-list">
        <button class="service-item" @click="goReports">
          <view class="service-icon">📋</view>
          <text class="service-text">我的上报纪录</text>
          <view class="service-arrow">›</view>
        </button>

        <button class="service-item" @click="openSheet('pwd')">
          <view class="service-icon">🔒</view>
          <text class="service-text">修改密码</text>
          <view class="service-arrow">›</view>
        </button>

        <button class="service-item no-border" @click="openSheet('admin')">
          <view class="service-icon">👤</view>
          <text class="service-text">联系管理员</text>
          <view class="service-arrow">›</view>
        </button>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <button class="logout-button" @click="logout">
      退出登录
    </button>

    <!-- 底部弹窗 -->
    <view
      v-if="sheet"
      class="sheet-mask"
      @click="closeSheet"
    >
      <view
        class="sheet-panel"
        @click.stop
      >
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text class="sheet-title">
            {{ sheet === 'info' ? '用户信息' : sheet === 'pwd' ? '修改密码' : '联系管理员' }}
          </text>
          <text
            v-if="sheet === 'admin'"
            class="sheet-subtitle"
          >
            {{ ADMIN_CONTACT.name }}
          </text>
        </view>

        <view
          v-if="sheet === 'info'"
          class="sheet-body"
        >
          <view class="info-row">
            <text class="info-key">姓名</text>
            <text class="info-value">{{ user.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-key">部门</text>
            <text class="info-value">{{ user.dept }}</text>
          </view>
          <view class="info-row no-border">
            <text class="info-key">手机</text>
            <text class="info-value">{{ user.phone }}</text>
          </view>
        </view>

        <view
          v-else-if="sheet === 'pwd'"
          class="sheet-body"
        >
          <view class="input-block">
            <text class="input-label">当前密码：</text>
            <input
              v-model="pwdOld"
              class="sheet-input"
              placeholder="请输入当前密码"
              password
            >
          </view>
          <view class="input-block">
            <text class="input-label">新密码：</text>
            <input
              v-model="pwdNew"
              class="sheet-input"
              placeholder="请输入新密码"
              password
            >
          </view>
          <view class="input-block">
            <text class="input-label">确认新密码：</text>
            <input
              v-model="pwdAgain"
              class="sheet-input"
              placeholder="再次输入新密码"
              password
            >
          </view>
        </view>

        <view
          v-else
          class="sheet-body"
        >
          <button
            class="contact-row"
            @click="copyText(ADMIN_CONTACT.phone, '电话')"
          >
            <text class="contact-key">电话</text>
            <text class="contact-value">{{ ADMIN_CONTACT.phone }}</text>
          </button>
          <button
            class="contact-row"
            @click="copyText(ADMIN_CONTACT.email, '邮箱')"
          >
            <text class="contact-key">邮箱</text>
            <text class="contact-value">{{ ADMIN_CONTACT.email }}</text>
          </button>
          <button
            class="contact-row"
            @click="copyText(ADMIN_CONTACT.wechat, '企业微信')"
          >
            <text class="contact-key">企业微信</text>
            <text class="contact-value">{{ ADMIN_CONTACT.wechat }}</text>
          </button>
        </view>

        <view class="sheet-footer">
          <button
            v-if="sheet === 'pwd'"
            class="sheet-secondary"
            @click="closeSheet"
          >
            取消
          </button>
          <button
            :class="sheet === 'pwd' ? 'sheet-primary flex-one' : 'sheet-primary'"
            @click="sheet === 'pwd' ? submitPassword() : closeSheet()"
          >
            {{ sheet === 'pwd' ? (passwordSubmitting ? '提交中...' : '确定') : '关闭' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding-bottom: 160rpx;
  background: #f7f7f7;
  color: #25262b;
}

/* 顶部背景 */
.bg-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 421rpx;
  background: linear-gradient(180deg, #c7f770 0%, #92e616 100%);
  z-index: 0;
}

/* 头像组 */
.profile-section {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  margin: 201rpx 50rpx 0;
  padding: 0;
  background: transparent;
  border: none;
}

.avatar-wrapper {
  flex-shrink: 0;
  margin-right: 25rpx;
}

.avatar {
  display: flex;
  width: 118rpx;
  height: 118rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border: 3rpx solid rgba(255, 255, 255, 0.8);
  color: #25262b;
  font-size: 34rpx;
  font-weight: 800;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  display: block;
  color: #000;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 50rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-dept {
  display: block;
  margin-top: 8rpx;
  color: #777978;
  font-size: 24rpx;
  line-height: 50rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  flex-shrink: 0;
  margin-left: 20rpx;
  color: #25262b;
  font-size: 48rpx;
  line-height: 1;
}

/* 功能卡片 */
.service-card {
  position: relative;
  z-index: 1;
  margin: 42rpx 20rpx 0;
  padding: 41rpx 0 0;
  background: #fff;
  border-radius: 30rpx;
}

.service-title {
  display: block;
  padding: 0 50rpx;
  color: #25262b;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 34rpx;
}

.service-list {
  margin-top: 21rpx;
  padding: 0 50rpx;
}

.service-item {
  display: flex;
  width: 100%;
  align-items: center;
  margin: 0;
  padding: 31rpx 0;
  border-bottom: 2rpx solid #ebeaef;
  background: transparent;
  text-align: left;
  line-height: 1;
}

.service-item.no-border {
  border-bottom: none;
}

.service-icon {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  margin-right: 26rpx;
  font-size: 32rpx;
  line-height: 40rpx;
  text-align: center;
}

.service-text {
  flex: 1;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 34rpx;
}

.service-arrow {
  flex-shrink: 0;
  margin-left: 20rpx;
  color: #25262b;
  font-size: 40rpx;
  line-height: 1;
}

/* 退出登录按钮 */
.logout-button {
  position: relative;
  z-index: 1;
  width: 648rpx;
  height: 70rpx;
  margin: 239rpx auto 0;
  border-radius: 100rpx;
  background: #25262b;
  color: #fff;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 70rpx;
  text-align: center;
}

/* 底部弹窗 */
.sheet-mask {
  position: fixed;
  z-index: 60;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.4);
}

.sheet-panel {
  width: 100%;
  max-height: 88vh;
  overflow: hidden;
  border-radius: 30rpx 30rpx 0 0;
  background: #fff;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.15);
}

.sheet-handle {
  width: 80rpx;
  height: 8rpx;
  margin: 16rpx auto 0;
  border-radius: 999rpx;
  background: #f7f7f7;
}

.sheet-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 24rpx 32rpx 16rpx;
}

.sheet-title {
  color: #25262b;
  font-size: 30rpx;
  font-weight: 800;
}

.sheet-subtitle {
  color: #777978;
  font-size: 24rpx;
}

.sheet-body {
  max-height: 58vh;
  overflow-y: auto;
  padding: 0 32rpx 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  border-bottom: 2rpx solid #ebeaef;
  padding: 24rpx 0;
}

.info-row.no-border {
  border-bottom: none;
}

.info-key {
  flex-shrink: 0;
  color: #777978;
  font-size: 26rpx;
}

.info-value {
  color: #25262b;
  font-size: 26rpx;
  font-weight: 600;
  text-align: right;
}

.input-block {
  margin-top: 20rpx;
}

.input-label {
  display: block;
  margin-bottom: 12rpx;
  color: #25262b;
  font-size: 26rpx;
}

.sheet-input {
  box-sizing: border-box;
  width: 100%;
  height: 100rpx;
  border: none;
  border-radius: 0;
  background: #f7f7f7;
  padding: 0 43rpx;
  color: #25262b;
  font-size: 26rpx;
}

.sheet-input::placeholder {
  color: #777978;
}

.contact-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 16rpx 0 0;
  padding: 24rpx;
  border: none;
  border-radius: 0;
  background: #f7f7f7;
  text-align: left;
}

.contact-key {
  color: #777978;
  font-size: 24rpx;
}

.contact-value {
  margin-top: 8rpx;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 600;
}

.sheet-footer {
  display: flex;
  gap: 16rpx;
  border-top: 2rpx solid #ebeaef;
  padding: 15rpx 50rpx calc(15rpx + env(safe-area-inset-bottom));
}

.sheet-secondary,
.sheet-primary {
  height: 100rpx;
  margin: 0;
  border-radius: 100rpx;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 100rpx;
  text-align: center;
}

.sheet-secondary {
  width: 260rpx;
  border: 2rpx solid #25262b;
  background: #fff;
  color: #25262b;
}

.sheet-primary {
  flex: 1;
  background: #25262b;
  color: #fff;
}

.sheet-primary.flex-one {
  flex: 1;
  width: auto;
}

.profile-section::after,
.service-item::after,
.logout-button::after,
.contact-row::after,
.sheet-secondary::after,
.sheet-primary::after {
  border: 0;
}
</style>
