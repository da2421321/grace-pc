<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import {
  ADMIN_CONTACT,
  clearInternalSession,
  getCurrentUser,
  setCurrentUser,
  updateInternalPassword,
  verifyInternalPassword,
  type InternalUser,
} from '@/data/session'

type SheetKind = 'info' | 'pwd' | 'admin' | ''

const userStore = useUserStore()
const user = ref<InternalUser>(getCurrentUser())
const sheet = ref<SheetKind>('')
const pwdOld = ref('')
const pwdNew = ref('')
const pwdAgain = ref('')

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

function submitPassword() {
  if (!pwdOld.value) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' })
    return
  }
  if (!verifyInternalPassword(pwdOld.value)) {
    uni.showToast({ title: '当前密码不正确', icon: 'none' })
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
  updateInternalPassword(pwdNew.value)
  closeSheet()
  uni.showToast({ title: '密码已更新', icon: 'success' })
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
      uni.showToast({ title: '已退出', icon: 'none' })
    },
  })
}
</script>

<template>
  <view class="mine-page">
    <view class="profile-card">
      <view class="avatar">
        {{ initials }}
      </view>
      <view class="profile-main">
        <text class="profile-name">
          {{ user.name }}
        </text>
        <text class="profile-dept">
          {{ user.dept }}
        </text>
      </view>
    </view>

    <button
      class="outline-button"
      @click="openSheet('info')"
    >
      查看用户信息
    </button>

    <view class="menu-card">
      <button
        class="menu-row"
        @click="goReports"
      >
        <text>我的上报记录</text>
        <text class="row-arrow">›</text>
      </button>
      <button
        class="menu-row"
        @click="openSheet('pwd')"
      >
        <text>修改密码</text>
        <text class="row-arrow">›</text>
      </button>
      <button
        class="menu-row no-border"
        @click="openSheet('admin')"
      >
        <text>联系管理员</text>
        <text class="row-arrow">›</text>
      </button>
    </view>

    <text class="internal-note">
      内部使用
    </text>

    <button
      class="logout-button"
      @click="logout"
    >
      退出登录
    </button>

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
            <text class="input-label">当前密码</text>
            <input
              v-model="pwdOld"
              class="sheet-input"
              password
            >
          </view>
          <view class="input-block">
            <text class="input-label">新密码</text>
            <input
              v-model="pwdNew"
              class="sheet-input"
              password
            >
          </view>
          <view class="input-block">
            <text class="input-label">确认新密码</text>
            <input
              v-model="pwdAgain"
              class="sheet-input"
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
            {{ sheet === 'pwd' ? '确定' : '关闭' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 48rpx 24rpx 160rpx;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 20%, #bfead3 45%, #e8f5e9 70%, #f2fbf5 100%);
  color: #25262b;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.95);
  padding: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.avatar {
  display: flex;
  width: 108rpx;
  height: 108rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #2e8b57, #52b098);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
}

.profile-main {
  min-width: 0;
  flex: 1;
}

.profile-name,
.profile-dept {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-name {
  color: #25262b;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.2;
}

.profile-dept {
  margin-top: 8rpx;
  color: #5b6b7b;
  font-size: 24rpx;
}

.outline-button {
  width: 100%;
  height: 68rpx;
  margin: 24rpx 0 0;
  border: 1rpx solid #cfe9dc;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #2e8b57;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 68rpx;
}

.menu-card {
  overflow: hidden;
  margin-top: 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 18rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.menu-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 28rpx 6rpx;
  border-bottom: 1rpx solid #e8eaee;
  background: transparent;
  color: #25262b;
  font-size: 28rpx;
  line-height: 1.2;
  text-align: left;
}

.no-border {
  border-bottom: 0;
}

.row-arrow {
  color: #b0b4bc;
  font-size: 34rpx;
}

.internal-note {
  display: block;
  margin-top: 28rpx;
  color: #6b7c88;
  font-size: 22rpx;
  text-align: center;
}

.logout-button {
  width: 100%;
  height: 76rpx;
  margin: 34rpx 0 0;
  border: 1rpx solid #f0b4b4;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #c62828;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 76rpx;
}

.sheet-mask {
  position: fixed;
  z-index: 60;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.35);
}

.sheet-panel {
  width: 100%;
  max-height: 88vh;
  overflow: hidden;
  border-radius: 28rpx 28rpx 0 0;
  background: #fff;
  box-shadow: 0 -16rpx 44rpx rgba(0, 0, 0, 0.18);
}

.sheet-handle {
  width: 72rpx;
  height: 6rpx;
  margin: 14rpx auto 0;
  border-radius: 999rpx;
  background: #e5e7eb;
}

.sheet-head {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 18rpx 24rpx 10rpx;
}

.sheet-title {
  color: #25262b;
  font-size: 30rpx;
  font-weight: 800;
}

.sheet-subtitle {
  color: #5b6b7b;
  font-size: 24rpx;
}

.sheet-body {
  max-height: 58vh;
  overflow-y: auto;
  padding: 0 24rpx 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #eef0f4;
  padding: 20rpx 0;
}

.info-key {
  flex-shrink: 0;
  color: #8a93a1;
  font-size: 24rpx;
}

.info-value {
  color: #25262b;
  font-size: 26rpx;
  font-weight: 600;
  text-align: right;
}

.input-block {
  margin-top: 16rpx;
}

.input-label {
  display: block;
  margin-bottom: 8rpx;
  color: #8a93a1;
  font-size: 24rpx;
}

.sheet-input {
  box-sizing: border-box;
  width: 100%;
  height: 76rpx;
  border: 1rpx solid #e1e6e3;
  border-radius: 14rpx;
  background: #f9fafb;
  padding: 0 18rpx;
  color: #25262b;
  font-size: 26rpx;
}

.contact-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 14rpx 0 0;
  padding: 18rpx;
  border: 1rpx solid #e8eaee;
  border-radius: 14rpx;
  background: #f9fafb;
  text-align: left;
}

.contact-key {
  color: #8a93a1;
  font-size: 23rpx;
}

.contact-value {
  margin-top: 6rpx;
  color: #25262b;
  font-size: 25rpx;
  font-weight: 600;
}

.sheet-footer {
  display: flex;
  gap: 12rpx;
  border-top: 1rpx solid #eef0f4;
  padding: 16rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
}

.sheet-secondary,
.sheet-primary {
  height: 72rpx;
  margin: 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 72rpx;
}

.sheet-secondary {
  flex: 1;
  border: 1rpx solid #d7e6dc;
  background: #fff;
  color: #2e8b57;
}

.sheet-primary {
  width: 100%;
  background: #2e8b57;
  color: #fff;
}

.sheet-primary.flex-one {
  flex: 1;
  width: auto;
}

.outline-button::after,
.menu-row::after,
.logout-button::after,
.contact-row::after,
.sheet-secondary::after,
.sheet-primary::after {
  border: 0;
}
</style>
