interface PromisifyFnArg {
  success?: (value: any) => any
  fail?: (value: any) => any
}

interface PromisifyFn<O extends PromisifyFnArg> {
  (option: O): void
}

type Callbackable<T extends (...args: any) => void> = Parameters<T>[0] &
  PromisifyFnArg

function promisify<
  O extends PromisifyFnArg,
  T extends PromisifyFn<O> = PromisifyFn<O>,
>(fn: T) {
  return async function asyncFn(
    o: Parameters<T>[0],
  ): Promise<Parameters<NonNullable<NonNullable<typeof o>['success']>>[0]> {
    return await new Promise((resolve, reject) => {
      fn({ ...o, success: resolve, fail: reject })
    })
  }
}
const showToast = promisify(uni.showToast)
const showModal = promisify(uni.showModal)

export async function showToastAsync(o: Parameters<typeof showToast>[0]) {
  const result = await showToast(o)
  await new Promise(resolve =>
    setTimeout(() => resolve(result), o?.duration || 1500),
  )
}

export async function showModalAsync(o: Parameters<typeof showModal>[0]) {
  const result = await showModal(o)
  if (result.cancel)
    throw new Error('user canceled.')
  return result
}

export const previewImage = promisify(uni.previewImage)
export const chooseMessageFile = promisify<UniNamespace.ChooseMessageFileOption>(uni.chooseMessageFile)
export const chooseMedia = promisify(uni.chooseMedia)
export const uploadFile = promisify(uni.uploadFile)
export const setClipboardData = promisify(uni.setClipboardData)
export const setTabBarBadge = promisify(uni.setTabBarBadge)
export const removeTabBarBadge = promisify(uni.removeTabBarBadge)
export const downloadFile = promisify(uni.downloadFile)
export const login = promisify(uni.login)

export const getStorageAsync = promisify(uni.getStorage)
export const setStorageAsync = promisify(uni.setStorage)
export const enableAlertBeforeUnloadAsync = promisify<
  Callbackable<typeof uni.enableAlertBeforeUnload>
>(uni.enableAlertBeforeUnload)

export const downloadFileAsync = promisify(uni.downloadFile)
export const saveImageToPhotosAlbumAsync = promisify(uni.saveImageToPhotosAlbum)
export const saveVideoToPhotosAlbumAsync = promisify(uni.saveVideoToPhotosAlbum)
