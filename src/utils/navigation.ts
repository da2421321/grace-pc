export function getCustomNavigationStyle() {
  let statusBarHeight = 44
  let navigationHeight = 44
  let navigationCenter = 22
  let rightInset = 110

  try {
    const systemInfo = uni.getSystemInfoSync()
    statusBarHeight = systemInfo.statusBarHeight ?? 44

    // #ifdef MP-WEIXIN
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton.top >= statusBarHeight && menuButton.height > 0 && menuButton.bottom > menuButton.top) {
      const gap = menuButton.top - statusBarHeight
      navigationHeight = menuButton.bottom + gap - statusBarHeight
      navigationCenter = gap + menuButton.height / 2
      rightInset = systemInfo.windowWidth - menuButton.left + 12
    }
    // #endif
  }
  catch {
    // Keep the standard navigation height when device metrics are unavailable.
  }

  return {
    '--status-bar-height': `${statusBarHeight}px`,
    '--navigation-height': `${navigationHeight}px`,
    '--navigation-center': `${navigationCenter}px`,
    '--navigation-right-inset': `${rightInset}px`,
  }
}
