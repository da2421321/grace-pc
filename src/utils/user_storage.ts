import { getStorageAsync } from './promisify'

export function getUserStorageAsync<T = unknown>(
  options: UniApp.GetStorageOptions,
) {
  return getStorageAsync(options) as Promise<
    UniNamespace.GetStorageSuccess<T>
  >
}
