type Index = number | string | symbol

export const hasOwnProp = (o: object, k?: string) =>
  k !== undefined && Object.prototype.hasOwnProperty.call(o, k)

export function isPlainObject(s: any): s is { [k: Index]: any } {
  return s && typeof s === 'object'
}
export function isString(s: any): s is string {
  return typeof s === 'string'
}
export function isEnumerable(s: any): s is Array<unknown> | { [k: Index]: any } {
  return Array.isArray(s) || isPlainObject(s)
}
