import { fetchQualityMessageUnread } from '@/data/messages'
import { useUserStore } from '@/store/user'

export const MESSAGE_TAB_INDEX = 1

export async function refreshMessageTabRedDot() {
  const userStore = useUserStore()
  if (!userStore.token) {
    hideMessageTabRedDot()
    return false
  }

  try {
    const { hasUnread } = await fetchQualityMessageUnread()
    if (hasUnread) {
      uni.showTabBarRedDot({ index: MESSAGE_TAB_INDEX })
    }
    else {
      hideMessageTabRedDot()
    }
    return hasUnread
  }
  catch {
    return false
  }
}

export function hideMessageTabRedDot() {
  uni.hideTabBarRedDot({
    index: MESSAGE_TAB_INDEX,
    fail: () => {},
  })
}
