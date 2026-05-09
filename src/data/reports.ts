import { getCurrentUser } from './session'

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
  category: string
  variety: string
  description: string
  imagePath: string
}

const STORAGE_USER_REPORTS = 'miniapp_my_reports_user'

const MOCK_REPORTS: MyReportRecord[] = [
  {
    id: 'rpt-001',
    submitter: '小程序用户-张三',
    submittedAt: '2026-05-04 11:14:09',
    category: '包包 / A级 / 挎包',
    variety: 'A41-9-A41-9-五沙厂区',
    imageCaption: '上报-A41-9',
    description: '用户上报：颜色偏浅，建议替换主图',
    status: 'pending',
  },
  {
    id: 'rpt-002',
    submitter: '小程序用户-李四',
    submittedAt: '2026-05-03 16:42:18',
    category: '鞋靴 / B级 / 运动鞋',
    variety: 'B12-3-南海厂区',
    imageCaption: '上报-B12-3',
    description: '走线不齐，请品质复核。',
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

export function reportStatusLabel(status: ReportProcessStatus): string {
  return status === 'pending' ? '未处理' : '已处理'
}

export function addMyReport(input: CreateMyReportInput): MyReportRecord {
  const user = getCurrentUser()
  const record: MyReportRecord = {
    id: `rpt-u-${Date.now()}`,
    submitter: `小程序用户-${user.name}`,
    submittedAt: formatSubmittedAt(new Date()),
    category: input.category.trim(),
    variety: input.variety.trim(),
    imageCaption: '上报附图',
    imagePath: input.imagePath,
    description: input.description.trim(),
    status: 'pending',
  }
  saveUserReports([record, ...loadUserReports()])
  return record
}
