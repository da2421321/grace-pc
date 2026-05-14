import apis from '@/api'

export type ReportProcessStatus = 'pending' | 'done'

export interface MyReportRecord {
  id: string
  submitter: string
  submittedAt: string
  category: string
  variety: string
  imageCaption: string
  imagePath?: string
  description: string
  status: ReportProcessStatus
}

export interface CreateMyReportInput {
  imageUrl?: string
  category?: string
  variety?: string
  categoryId?: string | number
  varietyId?: string | number
  description: string
}

export async function fetchMyReports(): Promise<MyReportRecord[]> {
  const response = await apis.zjQc.myReports()
  const payload = unwrapData<unknown>(response)
  if (!Array.isArray(payload))
    return []

  return payload
    .map(item => normalizeReport(item as Record<string, unknown>))
    .filter(report => Boolean(report.id))
}

export async function fetchMyReportById(id: string): Promise<MyReportRecord | undefined> {
  const apiReportId = normalizeApiLongId(id)
  if (apiReportId === undefined)
    return undefined

  const response = await apis.zjQc.reportDetail(apiReportId)
  const payload = unwrapData<unknown>(response)
  if (!payload || typeof payload !== 'object')
    return undefined

  return normalizeReport(payload as Record<string, unknown>)
}

export function reportStatusLabel(status: ReportProcessStatus): string {
  return status === 'pending' ? '未处理' : '已处理'
}

export async function createMyReport(input: CreateMyReportInput): Promise<MyReportRecord> {
  return submitMyReport(input)
}

export async function submitMyReport(input: CreateMyReportInput): Promise<MyReportRecord> {
  const imageUrl = input.imageUrl?.trim()
  if (!imageUrl)
    throw new Error('请上传品检图')

  const description = input.description.trim()
  if (!description)
    throw new Error('请输入问题描述')

  const response = await apis.zjQc.createReport({
    imageUrl,
    ...(input.category ? { category: input.category.trim() } : {}),
    ...(input.variety ? { variety: input.variety.trim() } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.varietyId ? { varietyId: input.varietyId } : {}),
    remark: description,
  })
  const payload = unwrapData<unknown>(response)
  if (!payload || typeof payload !== 'object')
    throw new Error('上报接口返回数据异常')

  return normalizeReport(payload as Record<string, unknown>, {
    ...input,
    imageUrl,
    description,
  })
}

function unwrapData<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object')
    return undefined

  const body = response as Record<string, unknown>
  if ('data' in body)
    return body.data as T

  return response as T
}

function normalizeReport(raw: Record<string, unknown>, fallback?: CreateMyReportInput): MyReportRecord {
  return {
    id: toStringValue(raw.reportId || raw.id),
    submitter: toStringValue(raw.username || raw.submitter),
    submittedAt: toStringValue(raw.createTime || raw.submittedAt),
    category: toStringValue(raw.category) || fallback?.category?.trim() || '',
    variety: toStringValue(raw.variety) || fallback?.variety?.trim() || '',
    imageCaption: toStringValue(raw.imageCaption),
    imagePath: toStringValue(raw.imageUrl || raw.imagePath) || fallback?.imageUrl?.trim() || '',
    description: toStringValue(raw.description || raw.remark) || fallback?.description?.trim() || '',
    status: normalizeStatus(raw.status),
  }
}

function toStringValue(value: unknown) {
  if (value === undefined || value === null)
    return ''
  return String(value)
}

function normalizeApiLongId(id: string | number): number | `${number}` | undefined {
  if (typeof id === 'number')
    return Number.isFinite(id) ? id : undefined

  const trimmed = id.trim()
  return /^\d+$/.test(trimmed) ? trimmed as `${number}` : undefined
}

function normalizeStatus(value: unknown): ReportProcessStatus {
  if (value === 'done')
    return 'done'

  if (typeof value === 'number')
    return value === 0 ? 'pending' : 'done'

  if (typeof value === 'string' && /^\d+$/.test(value))
    return Number(value) === 0 ? 'pending' : 'done'

  return 'pending'
}
