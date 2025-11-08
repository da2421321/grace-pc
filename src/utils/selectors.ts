import { makeUnionTypePageSelector } from './selector'

// 获取输入的内容
export const [getInputOfTextarea, getInputOfTextResolver]
  = makeUnionTypePageSelector<string>('/pages/form/textarea')
