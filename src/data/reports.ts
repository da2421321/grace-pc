import apis from '@/api'
import { getCurrentUser } from './session'
import { fetchQualityImages, getFullCategoryPath, type QualityImageItem } from './qc'

export type ReportProcessStatus = 'pending' | 'done'

export interface MyReportRecord {
  id: string
  submitter: string
  submittedAt: string
  imageId?: string
  category: string
  variety: string
  imageCaption: string
  imagePath?: string
  description: string
  status: ReportProcessStatus
}

export interface CreateMyReportInput {
  imageId?: string | number
  category?: string
  variety?: string
  description: string
  imagePath?: string
}

const STORAGE_USER_REPORTS = 'miniapp_my_reports_user'

const MOCK_REPORTS: MyReportRecord[] = [
  {
    id: 'rpt-001',
    submitter: '小程序用户-李四',
    submittedAt: '2026-05-03 16:42:18',
    category: '包包 / A级 / 挎包',
    variety: '挎包(BAG-001)',
    imageCaption: '挎包品质图',
    imagePath: '/static/images/figma/detail/bag.png',
    description: '同品种多图：细节与整体观感参考。同品种多图：细节与整体观感参考。同品种多图：细节与整体观感参考。',
    status: 'pending',
  },
  {
    id: 'rpt-002',
    submitter: '小程序用户-李四',
    submittedAt: '2026-05-03 16:42:18',
    category: '包包 / A级 / 挎包',
    variety: '挎包(BAG-001)',
    imageCaption: '挎包品质图',
    imagePath: '/static/images/figma/detail/bag.png',
    description: '同品种多图：细节与整体观感参考。同品种多图：细节与整体观感参考。同品种多图：细节与整体观感参考。',
    status: 'pending',
  },
  {
    id: 'rpt-003',
    submitter: '小程序用户-王五',
    submittedAt: '2026-04-28 09:05:00',
    category: '服饰 / A级 / 外套',
    variety: 'C08-1-总部仓',
    imageCaption: '上报-C08-1',
    description: '已按指引更换陈列图。',
    status: 'done',
  },
]

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatSubmittedAt(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function loadUserReports(): MyReportRecord[] {
  try {
    const raw = uni.getStorageSync(STORAGE_USER_REPORTS)
    if (!raw || typeof raw !== 'string')
      return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed as MyReportRecord[] : []
  }
  catch {
    return []
  }
}

function saveUserReports(list: MyReportRecord[]) {
  uni.setStorageSync(STORAGE_USER_REPORTS, JSON.stringify(list))
}

export function getMyReports(): MyReportRecord[] {
  return [...loadUserReports(), ...MOCK_REPORTS]
}

export function getMyReportById(id: string): MyReportRecord | undefined {
  return loadUserReports().find(report => report.id === id) ?? MOCK_REPORTS.find(report => report.id === id)
}

export async function fetchMyReports(): Promise<MyReportRecord[]> {
  try {
    const response = await apis.pcQc.myReports()
    const payload = unwrapData<unknown>(response)
    if (Array.isArray(payload)) {
      const imageMap = await loadQualityImageMap()
      return payload.map(item => normalizeReport(item as Record<string, unknown>, imageMap))
    }
  }
  catch {
    // 本地预览或后端未部署时使用本地记录
  }
  return getMyReports()
}

export async function fetchMyReportById(id: string): Promise<MyReportRecord | undefined> {
  try {
    const response = await apis.pcQc.reportDetail(id)
    const payload = unwrapData<unknown>(response)
    if (payload && typeof payload === 'object') {
      const imageMap = await loadQualityImageMap()
      return normalizeReport(payload as Record<string, unknown>, imageMap)
    }
  }
  catch {
    // 本地预览或后端未部署时使用本地记录
  }
  return getMyReportById(id)
}

export function reportStatusLabel(status: ReportProcessStatus): string {
  return status === 'pending' ? '未处理' : '已处理'
}

export function addMyReport(input: CreateMyReportInput): MyReportRecord {
  const user = getCurrentUser()
  const record: MyReportRecord = {
    id: `rpt-u-${Date.now()}`,
    submitter: `小程序用户-${user.name}`,
    submittedAt: formatSubmittedAt(new Date()),
    imageId: input.imageId ? String(input.imageId) : undefined,
    category: input.category?.trim() || '未选择品类',
    variety: input.variety?.trim() || '未选择品种',
    imageCaption: '上报附图',
    imagePath: input.imagePath,
    description: input.description.trim(),
    status: 'pending',
  }
  saveUserReports([record, ...loadUserReports()])
  return record
}

export async function createMyReport(input: CreateMyReportInput): Promise<MyReportRecord> {
  try {
    if (input.imageId) {
      const response = await apis.pcQc.createReport({
        imageId: input.imageId,
        remark: input.description.trim(),
      })
      const payload = unwrapData<unknown>(response)
      if (payload && typeof payload === 'object') {
        const imageMap = await loadQualityImageMap()
        return normalizeReport(payload as Record<string, unknown>, imageMap, input)
      }
    }
  }
  catch {
    // 本地预览或后端未部署时写入本地记录
  }
  return addMyReport(input)
}

function unwrapData<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object')
    return undefined
  const body = response as Record<string, unknown>
  if ('data' in body)
    return body.data as T
  return response as T
}

async function loadQualityImageMap() {
  try {
    const response = await fetchQualityImages()
    return new Map(response.items.map(item => [item.id, item]))
  }
  catch {
    return new Map<string, QualityImageItem>()
  }
}

function normalizeReport(
  raw: Record<string, unknown>,
  imageMap = new Map<string, QualityImageItem>(),
  fallback?: CreateMyReportInput,
): MyReportRecord {
  const submittedAt = String(raw.submittedAt || raw.createTime || '')
  const imageId = String(raw.imageId || fallback?.imageId || '')
  const image = imageId ? imageMap.get(imageId) : undefined

  return {
    id: String(raw.id || raw.reportId || ''),
    submitter: String(raw.submitter || raw.username || ''),
    submittedAt: submittedAt || formatSubmittedAt(new Date()),
    imageId: imageId || undefined,
    category: String(raw.category || fallback?.category || (image ? getFullCategoryPath(image) : '')),
    variety: String(raw.variety || fallback?.variety || (image ? formatVarietyLabel(image) : '')),
    imageCaption: String(raw.imageCaption || (image ? `${image.varietyName}品质图` : '上报附图')),
    imagePath: String(raw.imagePath || raw.imageUrl || fallback?.imagePath || image?.imageUrl || ''),
    description: String(raw.description || raw.remark || fallback?.description || ''),
    status: normalizeStatus(raw.status),
  }
}

function formatVarietyLabel(image: QualityImageItem) {
  if (!image.varietyCode)
    return image.varietyName
  return `${image.varietyName}(${image.varietyCode})`
}

function normalizeStatus(value: unknown): ReportProcessStatus {
  if (value === 'done' || value === 1 || value === '1')
    return 'done'
  return 'pending'
}
