<script setup lang="ts">
import { ref } from 'vue'

// 品类选择状态
const selectedCategory = ref('包包')
const selectedGrade = ref('环保材质')
const selectedType = ref('')

// 品类选项
const categories = ['包包', '鞋靴', '服饰']
const grades = ['A级', '环保材质', '春夏']
const types = ['短靴']

function selectCategory(category: string) {
  selectedCategory.value = category
}

function selectGrade(grade: string) {
  selectedGrade.value = grade
}

function selectType(type: string) {
  selectedType.value = type
}

function goBack() {
  uni.navigateBack()
}

function cancel() {
  uni.navigateBack()
}

function submit() {
  if (!selectedCategory.value) {
    uni.showToast({ title: '请选择品类', icon: 'none' })
    return
  }
  if (!selectedGrade.value) {
    uni.showToast({ title: '请选择等级', icon: 'none' })
    return
  }
  if (!selectedType.value) {
    uni.showToast({ title: '请选择类型', icon: 'none' })
    return
  }

  // 跳转到上传页面
  uni.navigateTo({
    url: `/pages/report/upload?category=${selectedCategory.value}&grade=${selectedGrade.value}&type=${selectedType.value}`,
  })
}
</script>

<template>
  <view class="report-create-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">图片上报</text>
    </view>

    <!-- 选择区域 -->
    <view class="selection-container">
      <!-- 第一级选择 -->
      <view class="selection-group">
        <view class="selection-header">
          <text class="selection-title">请选择品类</text>
          <view class="selection-underline" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in categories"
            :key="item"
            :class="['tag-item', { active: selectedCategory === item }]"
            @click="selectCategory(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>

      <!-- 第二级选择 -->
      <view class="selection-group">
        <view class="selection-header">
          <text class="selection-title">请选择品类</text>
          <view class="selection-underline active" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in grades"
            :key="item"
            :class="['tag-item', { active: selectedGrade === item, wide: item === '环保材质' }]"
            @click="selectGrade(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>

      <!-- 第三级选择 -->
      <view class="selection-group">
        <view class="selection-header">
          <text class="selection-title">请选择品类</text>
          <view class="selection-underline active" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in types"
            :key="item"
            :class="['tag-item', { active: selectedType === item }]"
            @click="selectType(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <view class="action-divider" />
      <view class="action-buttons">
        <button class="action-btn cancel-btn" @click="cancel">
          取消
        </button>
        <button class="action-btn submit-btn" @click="submit">
          提交
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.report-create-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 130rpx;
}

/* 顶部导航栏 */
.nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 176rpx;
  padding-top: 88rpx;
  background: #fff;
}

.nav-back {
  position: absolute;
  left: 50rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 36rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  color: #1a2f4d;
  font-size: 68rpx;
  line-height: 1;
  font-weight: 300;
}

.nav-title {
  color: #1a2f4d;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 50rpx;
}

/* 选择区域 */
.selection-container {
  padding: 56rpx 50rpx 0;
}

.selection-group {
  margin-bottom: 28rpx;
}

.selection-header {
  position: relative;
  margin-bottom: 24rpx;
}

.selection-title {
  color: #25262b;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.selection-underline {
  position: absolute;
  left: 34rpx;
  bottom: -14rpx;
  width: 60rpx;
  height: 10rpx;
  background: transparent;
}

.selection-underline.active {
  background: #92e616;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  height: 70rpx;
  padding: 0 30rpx;
  border-radius: 30rpx;
  background: #f7f7f7;
  color: #777978;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 70rpx;
  text-align: center;
  border: none;
  margin: 0;
}

.tag-item.wide {
  padding: 0 40rpx;
}

.tag-item.active {
  background: #92e616;
  color: #25262b;
}

.tag-item::after {
  border: none;
}

/* 底部按钮 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 10;
}

.action-divider {
  height: 2rpx;
  background: #ebeaef;
}

.action-buttons {
  display: flex;
  gap: 30rpx;
  padding: 15rpx 50rpx calc(15rpx + env(safe-area-inset-bottom));
}

.action-btn {
  height: 100rpx;
  border-radius: 30rpx;
  font-size: 30rpx;
  font-weight: 400;
  line-height: 100rpx;
  text-align: center;
  border: none;
  margin: 0;
}

.cancel-btn {
  width: 260rpx;
  background: #f7f7f7;
  color: #25262b;
}

.submit-btn {
  flex: 1;
  background: #25262b;
  color: #fff;
}

.action-btn::after {
  border: none;
}
</style>
