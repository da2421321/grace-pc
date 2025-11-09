<script setup lang="ts">
import { onReady } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'
import apis from '@/api'

type FormsInstance = UniHelper.UniFormsInstance

interface PasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

const formRef = ref<FormsInstance>()
const user = reactive<PasswordForm>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const rules: UniHelper.UniFormsRules = {
  oldPassword: {
    rules: [{ required: true, errorMessage: '旧密码不能为空' }],
  },
  newPassword: {
    rules: [
      { required: true, errorMessage: '新密码不能为空' },
      {
        validateFunction: (_rule, value: string) =>
          typeof value === 'string' && value.length >= 6 && value.length <= 20,
        errorMessage: '长度在 6 到 20 个字符',
      },
    ],
  },
  confirmPassword: {
    rules: [
      { required: true, errorMessage: '确认密码不能为空' },
      {
        validateFunction: (_rule, value, data: PasswordForm) =>
          data.newPassword === value,
        errorMessage: '两次输入的密码不一致',
      },
    ],
  },
}

async function submit() {
  const form = formRef.value
  if (!form || typeof form.validate !== 'function')
    return
  await form.validate()
  await apis.user.updatePassword({
    oldPassword: user.oldPassword,
    newPassword: user.newPassword,
  })
  uni.showToast({
    title: '修改成功',
    icon: 'success',
  })
}

onReady(() => {
  const form = formRef.value
  if (form && typeof form.setRules === 'function') {
    form.setRules(rules)
  }
})
</script>

<template>
  <view class="min-h-screen bg-white px-4 py-6">
    <uni-forms
      ref="formRef"
      :value="user"
      label-width="80px"
      class="space-y-4"
    >
      <uni-forms-item
        name="oldPassword"
        label="旧密码"
      >
        <uni-easyinput
          v-model="user.oldPassword"
          type="password"
          placeholder="请输入旧密码"
        />
      </uni-forms-item>
      <uni-forms-item
        name="newPassword"
        label="新密码"
      >
        <uni-easyinput
          v-model="user.newPassword"
          type="password"
          placeholder="请输入新密码"
        />
      </uni-forms-item>
      <uni-forms-item
        name="confirmPassword"
        label="确认密码"
      >
        <uni-easyinput
          v-model="user.confirmPassword"
          type="password"
          placeholder="请确认新密码"
        />
      </uni-forms-item>
      <button
        class="mt-2 h-11 w-full rounded-full bg-blue-500 text-sm text-white flex items-center justify-center"
        @click="submit"
      >
        提交
      </button>
    </uni-forms>
  </view>
</template>
