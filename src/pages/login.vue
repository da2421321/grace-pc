<script setup lang="ts">
import type { LoginRequest } from '@/api'
import apis from '@/api'
import { useUserStore } from '@/store/user'
import { onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'

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
const appInfo = {
  logo: import.meta.env.VITE_APP_LOGO,
  agreements: parseAgreements(import.meta.env.VITE_APP_AGREEMENTS),
}

const loginForm = reactive<LoginRequest>({
  phone: '',
  captcha: '',
})

const timer = ref<any>(null)
const codeText = ref('获取验证码')
const countdown = ref(60)
const isAgreed = ref(false)
const authPopup = ref(null)
const wechatAuthKey = ref('')

async function handleGetCode() {
  if (timer.value)
    return
  if (!loginForm.phone) {
    showError('请输入手机号')
    return
  }

  try {
    await apis.auth.sendCode({ phone: loginForm.phone })
    uni.showToast({ title: '验证码已发送', icon: 'none' })

    timer.value = setInterval(() => {
      countdown.value--
      codeText.value = `${countdown.value}s后重新获取`
      if (countdown.value <= 0) {
        clearInterval(timer.value)
        timer.value = null
        countdown.value = 60
        codeText.value = '获取验证码'
      }
    }, 1000)
  }
  catch (error) {
    console.error(error)
  }
}

async function handleLogin() {
  if (!loginForm.phone) {
    showError('请输入手机号')
    return
  }
  if (!loginForm.captcha) {
    showError('请输入验证码')
    return
  }
  try {
    uni.showLoading({ title: '登录中，请耐心等待...', icon: 'none' })

    let code = ''
    // #ifdef MP-WEIXIN
    try {
      const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: resolve,
          fail: reject,
        })
      })
      code = loginRes.code
    }
    catch (e) {
      console.error('WeChat login failed', e)
    }
    // #endif

    await userStore.login({
      ...loginForm,
      code,
      isCustomer: false,
      type: 'routine',
      spread_spid: (uni.getStorageSync('spread_spid') || 0) as number,
    })

    await userStore.fetchProfile()
    uni.reLaunch({ url: '/pages/index' })
  }
  catch (error) {
    console.error(error)
  }
  finally {
    uni.hideLoading()
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

function toggleAgreement() {
  isAgreed.value = !isAgreed.value
}

function handleWechatLogin() {
  if (!isAgreed.value) {
    showError('请先同意用户协议和隐私政策')
    return
  }

  uni.getUserProfile({
    desc: '用于完善会员资料',
    success: (info) => {
      const { nickName, avatarUrl } = info.userInfo
      const gender = (info.userInfo as any).gender || 0
      uni.login({
        provider: 'weixin',
        success: async (res) => {
          try {
            if (!res.code) {
              showError('获取登录凭证失败')
              return
            }

            uni.showLoading({ title: '登录中...', mask: true })

            const loginRes = await apis.auth.wechatLogin(res.code, {
              spread_spid: (uni.getStorageSync('spread_spid') || 0) as number,
              nickName,
              sex: gender,
              avatar: avatarUrl,
            })

            uni.hideLoading()

            if (loginRes.type === 'register') {
              // 直接登录成功
              uni.showToast({ title: '登录成功', icon: 'success' })

              // 保存token和用户信息
              if (loginRes.token) {
                uni.setStorageSync('token', loginRes.token)
                uni.setStorageSync('userInfo', loginRes.data || {})
                uni.setStorageSync('login', 'true')
              }

              await userStore.fetchProfile()
              uni.reLaunch({ url: '/pages/index' })
            }
            else {
              // 需要绑定手机号，直接打开弹窗
              wechatAuthKey.value = loginRes.key || ''
              authPopup.value?.open('bottom')
            }
          }
          catch {
            uni.hideLoading()
            showError('登录失败，请检查网络')
          }
        },
        fail: () => {
          showError('微信登录失败')
        },
      })
    },
    fail: () => {
      showError('获取用户信息失败')
    },
  })
}

function handleWechatBind(e: any) {
  // 处理微信授权绑定手机号
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    showError('取消授权，无法绑定')
    authPopup.value?.close()
    return
  }

  const { encryptedData, iv } = e.detail

  uni.showLoading({ title: '绑定中...', mask: true })

  // 重新获取微信登录code
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      try {
        const bindRes = await apis.auth.wechatBindPhone({
          key: wechatAuthKey.value,
          encryptedData,
          iv,
          code: loginRes.code,
          type: 'routine',
          isCustomer: 'false',
        })

        uni.hideLoading()

        if (bindRes.token) {
          uni.showToast({ title: '绑定成功，正在登录...', icon: 'success' })

          // 保存登录信息
          uni.setStorageSync('token', bindRes.token)
          uni.setStorageSync('userInfo', bindRes)
          uni.setStorageSync('login', 'true')

          authPopup.value?.close()
          await userStore.fetchProfile()
          uni.reLaunch({ url: '/pages/index' })
        }
        else {
          showError('绑定失败')
        }
      }
      catch {
        uni.hideLoading()
        showError('绑定失败，请稍后重试')
      }
    },
    fail: () => {
      uni.hideLoading()
      showError('获取登录信息失败')
    },
  })
}

function handlePrivacy() {
  navigateToAgreement(0)
}

function handleUserAgrement() {
  navigateToAgreement(1)
}

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
          v-model="loginForm.phone"
          class="flex-1 text-sm"
          type="text"
          placeholder="请输入手机号"
          :maxlength="30"
        >
      </view>
      <view class="flex h-[45px] items-center rounded-full bg-[#f5f6f7] px-4 gap-3">
        <uni-icons
          type="email"
          size="22"
          color="#999999"
        />
        <input
          v-model="loginForm.captcha"
          type="number"
          class="flex-1 text-sm"
          placeholder="请输入验证码"
          :maxlength="6"
        >
        <text
          class="text-blue-500 text-sm whitespace-nowrap"
          @click="handleGetCode"
        >
          {{ codeText }}
        </text>
      </view>

      <button
        class="mt-4 h-[45px] w-full rounded-full bg-blue-500 text-sm text-white flex items-center justify-center"
        @click="handleLogin"
      >
        登录
      </button>

      <view class="mt-8 flex flex-col items-center gap-4">
        <view class="flex w-full items-center justify-center gap-2">
          <view class="h-[1px] flex-1 bg-gray-200" />
          <text class="text-xs text-gray-400">
            其他登录方式
          </text>
          <view class="h-[1px] flex-1 bg-gray-200" />
        </view>
        <view class="flex flex-col items-center gap-4">
          <button
            class="flex h-12 w-12 items-center justify-center rounded-full bg-green-500"
            @click="handleWechatLogin"
          >
            <uni-icons
              type="weixin"
              size="28"
              color="#fff"
            />
          </button>
          <text class="text-xs text-gray-500">
            微信登录
          </text>
        </view>
      </view>
      <!-- <view
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
      </view> -->
      <view class="flex items-center justify-center mt-4 gap-2">
        <view
          class="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"
          :class="{ 'bg-blue-500 border-blue-500': isAgreed }"
          @click="toggleAgreement"
        >
          <uni-icons
            v-if="isAgreed"
            type="checkmarkempty"
            size="12"
            color="#fff"
          />
        </view>
        <view class="text-sm text-gray-600">
          <text>我已阅读并同意</text>
          <text
            class="text-blue-500"
            @click="handleUserAgrement"
          >
            《用户协议》
          </text>
          <text>和</text>
          <text
            class="text-blue-500"
            @click="handlePrivacy"
          >
            《隐私政策》
          </text>
        </view>
      </view>
    </view>

    <!-- 手机号授权弹窗 -->
    <uni-popup
      ref="authPopup"
      type="bottom"
      :mask-click="false"
      :safe-area="false"
    >
      <view class="bg-white rounded-t-3xl px-6 py-8 flex flex-col items-center">
        <view class="text-lg font-bold text-gray-800 mb-2">
          手机号快捷登录
        </view>
        <view class="text-sm text-gray-500 mb-6">
          为保障您的账户安全，请授权手机号码
        </view>
        <button
          class="w-full h-12 bg-blue-500 text-white rounded-lg text-base flex items-center justify-center mb-4"
          open-type="getPhoneNumber"
          @getphonenumber="handleWechatBind"
        >
          快捷登录
        </button>
        <button
          class="w-full h-12 bg-gray-100 text-gray-600 rounded-lg text-base flex items-center justify-center"
          @click="authPopup?.close()"
        >
          取消
        </button>
      </view>
    </uni-popup>
  </view>
</template>
