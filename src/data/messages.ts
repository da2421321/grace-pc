import apis from '@/api'

export type QualityMessageType = 'image' | 'description' | 'status'

export const QUALITY_MESSAGE_TYPES: Record<QualityMessageType, string> = {
  image: '图片变更',
  description: '描述变更',
  status: '启用/停用',
}

export function isQualityMessageType(value: unknown): value is QualityMessageType {
  return value === 'image' || value === 'description' || value === 'status'
}

export function getQualityMessageIcon(type: QualityMessageType) {
  return type === 'image'
    ? '/static/images/figma/message/ded3f0947b4a3328af529b451b16f2bb2fae7879.svg'
    : '/static/images/figma/message/6e0d789bf7e0518b5a3fd9b751d6339c119b1602.svg'
}

export interface QualityMessageItem {
  id: string
  messageType: QualityMessageType
  title: string
  subjectType: string
  subjectId?: string
  subjectName: string
  collectionId?: string
  categoryId?: string
  varietyId?: string
  varietyName: string
  varietyCode: string
  categoryPath: string[]
  imageUrl: string
  imageUrls: string[]
  beforeImageUrls: string[]
  afterImageUrls: string[]
  imageChangeSnapshotAvailable: boolean
  imageCount: number
  content: string
  changeType: 'created' | 'updated'
  updateBy?: string
  updateTime: string
  unread: boolean
}

export interface QualityMessagePageResponse {
  items: QualityMessageItem[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
  hasMore: boolean
}

export interface QualityMessageUnread {
  hasUnread: boolean
  unreadCount: number
}

export interface QualityMessageGroup {
  type: QualityMessageType
  title: string
  latestMessage?: QualityMessageItem
  total: number
  unreadCount: number
}

const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

export async function fetchQualityMessages(pageNum = 1, pageSize = 20, messageType?: QualityMessageType): Promise<QualityMessagePageResponse> {
  const response = await apis.zjQc.messages({ pageNum, pageSize, messageType })
  const payload = unwrapData<Record<string, unknown>>(response) ?? {}
  const rawItems = Array.isArray(payload.items) ? payload.items : []

  return {
    items: rawItems.map(item => normalizeMessage(item as Record<string, unknown>)),
    total: toNumber(payload.total),
    pageNum: toPositiveNumber(payload.pageNum, pageNum),
    pageSize: toPositiveNumber(payload.pageSize, pageSize),
    pages: toNumber(payload.pages),
    hasMore: toBoolean(payload.hasMore),
  }
}

export async function fetchQualityMessageUnread(): Promise<QualityMessageUnread> {
  const response = await apis.zjQc.messageUnread({ showErrorMsg: false })
  const payload = unwrapData<Record<string, unknown>>(response) ?? {}
  const unreadCount = Math.max(0, Math.trunc(toNumber(payload.unreadCount)))
  return {
    hasUnread: toBoolean(payload.hasUnread) || unreadCount > 0,
    unreadCount,
  }
}

export async function fetchQualityMessageGroups(): Promise<QualityMessageGroup[]> {
  const response = await apis.zjQc.messageGroups()
  const payload = unwrapData<Record<string, unknown>>(response) ?? {}
  const rawGroups = Array.isArray(payload.items) ? payload.items : []
  return rawGroups.filter(item => isQualityMessageType(item.type)).map(item => ({
    type: item.type as QualityMessageType,
    title: QUALITY_MESSAGE_TYPES[item.type as QualityMessageType],
    latestMessage: item.latestMessage ? normalizeMessage(item.latestMessage) : undefined,
    total: Math.max(0, toNumber(item.total)),
    unreadCount: Math.max(0, Math.trunc(toNumber(item.unreadCount))),
  }))
}

export async function fetchQualityMessageDetail(id: string): Promise<QualityMessageItem> {
  const response = await apis.zjQc.messageDetail(id)
  const payload = unwrapData<Record<string, unknown>>(response)
  if (!payload?.id)
    throw new Error('未找到该消息')
  return normalizeMessage(payload)
}

export async function markQualityMessagesRead(messageType: QualityMessageType, readThroughId: string) {
  if (!/^\d+$/.test(readThroughId))
    throw new Error('消息参数无效，未能标记已读')
  await apis.zjQc.markMessagesRead({ messageType, readThroughId }, { showErrorMsg: false })
}

export function getQualityMessageTargetUrl(item: QualityMessageItem): string | undefined {
  const detailPage = '/pages/qc/detail/index'
  if (item.subjectType === 'category') {
    const categoryId = item.categoryId || item.subjectId
    return categoryId ? `${detailPage}?categoryId=${encodeURIComponent(categoryId)}` : undefined
  }

  const collectionId = item.collectionId || (item.subjectType === 'collection' ? item.subjectId : undefined)
  if (collectionId)
    return `${detailPage}?collectionId=${encodeURIComponent(collectionId)}`
  if (item.subjectType === 'image' && item.subjectId)
    return `${detailPage}?id=${encodeURIComponent(item.subjectId)}`

  const varietyId = item.varietyId || (item.subjectType === 'variety' ? item.subjectId : undefined)
  if (varietyId)
    return `${detailPage}?varietyId=${encodeURIComponent(varietyId)}`
  if (item.varietyCode)
    return `${detailPage}?varietyCode=${encodeURIComponent(item.varietyCode)}`
  if (item.categoryId)
    return `${detailPage}?categoryId=${encodeURIComponent(item.categoryId)}`
}

function normalizeMessage(item: Record<string, unknown>): QualityMessageItem {
  const imageUrls = toStringArray(item.imageUrls).map(resolveImageUrl).filter(Boolean)
  const imageUrl = resolveImageUrl(toString(item.imageUrl))
  if (imageUrl && !imageUrls.includes(imageUrl))
    imageUrls.unshift(imageUrl)

  const messageType = isQualityMessageType(item.messageType) ? item.messageType : 'image'
  const beforeImageUrls = normalizeImageUrls(item.beforeImageUrls)
  const afterImageUrls = Array.isArray(item.afterImageUrls) ? normalizeImageUrls(item.afterImageUrls) : [...imageUrls]
  const imageChangeSnapshotAvailable = messageType === 'image' && toBoolean(item.imageChangeSnapshotAvailable)
  const content = toString(item.content) || '内容已变更'

  return {
    id: toString(item.id),
    messageType,
    title: toString(item.title),
    subjectType: toString(item.subjectType),
    subjectId: optionalString(item.subjectId),
    subjectName: toString(item.subjectName),
    collectionId: optionalString(item.collectionId),
    categoryId: optionalString(item.categoryId),
    varietyId: optionalString(item.varietyId),
    varietyName: toString(item.varietyName),
    varietyCode: toString(item.varietyCode),
    categoryPath: toStringArray(item.categoryPath),
    imageUrl: imageUrls[0] || imageUrl,
    imageUrls,
    beforeImageUrls: messageType === 'image' ? beforeImageUrls : [],
    afterImageUrls: messageType === 'image' ? afterImageUrls : [],
    imageChangeSnapshotAvailable,
    imageCount: toNumber(item.imageCount) || imageUrls.length,
    // New image messages display their snapshots instead of the count-only summary.
    content: imageChangeSnapshotAvailable ? content.split(/\r?\n/)[0] : content,
    changeType: item.changeType === 'created' ? 'created' : 'updated',
    updateBy: optionalString(item.updateBy),
    updateTime: toString(item.updateTime),
    unread: toBoolean(item.unread),
  }
}

function normalizeImageUrls(value: unknown): string[] {
  return Array.isArray(value) ? value.map(toString).map(resolveImageUrl).filter(Boolean) : []
}

function unwrapData<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object')
    return undefined
  const body = response as Record<string, unknown>
  return ('data' in body ? body.data : response) as T | undefined
}

function resolveImageUrl(url: string) {
  if (!url || /^https?:\/\//.test(url) || url.startsWith('/static/'))
    return url
  return url.startsWith('/') ? `${baseUrl}${url}` : url
}

function toString(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

function optionalString(value: unknown) {
  return toString(value) || undefined
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map(toString).filter(Boolean)
  if (typeof value === 'string')
    return value.split(/[,/]/).map(part => part.trim()).filter(Boolean)
  return []
}

function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toPositiveNumber(value: unknown, fallback: number) {
  const number = toNumber(value)
  return number > 0 ? number : fallback
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean')
    return value
  return Number(value) === 1 || value === 'true'
}
