<script setup lang="ts">
import type { UserProfileForm } from '@/api'
import { onLoad, onReady } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'
import apis from '@/api'

type FormsInstance = UniHelper.UniFormsInstance

const formRef = ref<FormsInstance>()
const user = reactive<UserProfileForm>({
  nickName: '',
  phonenumber: '',
  email: '',
  sex: '',
})

const sexs = [
  { text: '男', value: '0' },
  { text: '女', value: '1' },
]

const rules: UniHelper.UniFormsRules = {
  nickName: {
    rules: [{ required: true, errorMessage: '用户昵称不能为空' }],
  },
  phonenumber: {
    rules: [
      { required: true, errorMessage: '手机号码不能为空' },
      { pattern: /^1[3-9]\d{9}$/, errorMessage: '请输入正确的手机号码' },
    ],
  },
  email: {
    rules: [
      { required: true, errorMessage: '邮箱地址不能为空' },
      { format: 'email', errorMessage: '请输入正确的邮箱地址' },
    ],
  },
}

async function fetchUser() {
  const response = await apis.user.getProfile()
  Object.assign(user, response.data)
}

async function submit() {
  const form = formRef.value
  if (!form || typeof form.validate !== 'function')
    return
  await form.validate()
  await apis.user.updateProfile(user)
  uni.showToast({
    title: '修改成功',
    icon: 'success',
  })
}

onLoad(() => {
  fetchUser()
})

onReady(() => {
  const form = formRef.value
  if (form && typeof form.setRules === 'function') {
    form.setRules(rules)
  }
})
</script>

<template>
  <view class="min-h-screen bg-white px-4 pb-6">
    <view class="rounded-lg bg-white p-4 shadow-sm">
      <uni-forms
        ref="formRef"
        :model="user"
        label-width="80px"
        class="space-y-3"
      >
        <uni-forms-item
          label="用户昵称"
          name="nickName"
        >
          <uni-easyinput
            v-model="user.nickName"
            placeholder="请输入昵称"
          />
        </uni-forms-item>
        <uni-forms-item
          label="手机号码"
          name="phonenumber"
        >
          <uni-easyinput
            v-model="user.phonenumber"
            placeholder="请输入手机号码"
          />
        </uni-forms-item>
        <uni-forms-item
          label="邮箱"
          name="email"
        >
          <uni-easyinput
            v-model="user.email"
            placeholder="请输入邮箱"
          />
        </uni-forms-item>
        <uni-forms-item
          label="性别"
          name="sex"
          required
        >
          <uni-data-checkbox
            v-model="user.sex"
            :localdata="sexs"
          />
        </uni-forms-item>
      </uni-forms>
      <button
        class="mt-4 h-11 w-full rounded-full bg-blue-500 text-sm text-white flex items-center justify-center"
        @click="submit"
      >
        提交
      </button>
    </view>
  </view>
</template>
