<script setup lang="ts">
import type { UserProfileForm } from '@/api'
import { onLoad } from '@dcloudio/uni-app'
import { reactive, toRefs } from 'vue'
import apis from '@/api'

const state = reactive({
  user: {} as UserProfileForm & Record<string, unknown>,
  roleGroup: '',
  postGroup: '',
})

const { user, roleGroup, postGroup } = toRefs(state)

async function fetchUser() {
  const response = await apis.user.getProfile()
  state.user = response.data
  state.roleGroup = response.roleGroup
  state.postGroup = response.postGroup
}

onLoad(() => {
  fetchUser()
})
</script>

<template>
  <view class="min-h-screen bg-white px-4 pb-6">
    <uni-list>
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'person-filled' }"
        title="昵称"
        :right-text="String(user.nickName || '')"
      />
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'phone-filled' }"
        title="手机号码"
        :right-text="String(user.phonenumber || '')"
      />
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'email-filled' }"
        title="邮箱"
        :right-text="String(user.email || '')"
      />
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'auth-filled' }"
        title="岗位"
        :right-text="postGroup"
      />
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'staff-filled' }"
        title="角色"
        :right-text="roleGroup"
      />
      <uni-list-item
        :show-extra-icon="true"
        :extra-icon="{ type: 'calendar-filled' }"
        title="创建日期"
        :right-text="String(user.createTime || '')"
      />
    </uni-list>
  </view>
</template>
