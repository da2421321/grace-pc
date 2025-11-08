export function getCurrentPageRoute() {
  const current = getCurrentPage()
  return current?.route
}

export function getCurrentPage() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return current
}
