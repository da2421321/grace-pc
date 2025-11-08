import { hasOwnProp, isEnumerable, isPlainObject, isString } from './is'

function excludeKey<T extends { [index: string]: any }>(o: T, k?: string) {
  if (Array.isArray(o))
    return o.filter((_, i) => `${i}` !== k)

  if (isPlainObject(o)) {
    return Object.keys(o)
      .filter(s => s !== k)
      .reduce((r, k) => ({ ...r, [k]: o[k] }), {})
  }
  return o
}

function excludeKeyList<T extends object>(
  o: Array<unknown>,
  kl: Array<string>,
): T
function excludeKeyList<T extends object>(o: T, kl: Array<string>): T
function excludeKeyList<T extends object>(o: unknown, kl: Array<string>): T
function excludeKeyList(o: any, kl: Array<string>) {
  if (!isEnumerable(o) || !kl.length)
    return o
  const k = kl.shift() as string
  if (!hasOwnProp(o, k))
    return o
  if (kl.length === 0)
    return excludeKey(o, k)

  if (Array.isArray(o))
    return o.map((t, i) => (`${i}` === k ? excludeKeyList(t, kl) : t))

  if (isPlainObject(o))
    return { ...o, [k]: excludeKeyList(o[k], kl) }

  return o
}

function excludeKeysList<T extends object>(
  data: T | Array<unknown>,
  keys: Array<string>,
) {
  return keys.reduce((o, k) => excludeKeyList(o, k.split('.')), data)
}

/*
 * Exclude keys from object deeply
 * for example:
 * excludeKeys({ a: { b: 1 } }, 'a.b') // { a: {} }
 * excludeKeys({ a: 1, b: 2 }, ['a', 'b']) // {}
 */
export function excludeKeys<T extends object>(
  data: T | Array<unknown>,
  keys: Array<string>,
): T
export function excludeKeys<T extends object>(
  data: T | Array<unknown>,
  keys: string,
): T
export function excludeKeys<T extends object>(
  data: T | Array<unknown>,
  keys: any,
) {
  if (isString(keys))
    return excludeKeysList(data, [keys])
  if (Array.isArray(keys))
    return excludeKeysList(data, keys)
  throw new Error(`keys must be typeof Array or string, got ${typeof keys}`)
}

interface PickerData {
  [k: string | number | symbol]: any
}
type Picker = (data: PickerData) => PickerData | undefined

interface PickOptions  {
  ignoreNull?: boolean
}

export function pick(setting: string, options?: PickOptions): Picker;
export function pick(setting: Array<string>, options?: PickOptions): Picker;
export function pick(setting: { [k: string]: string }, options?: PickOptions): Picker;
export function pick(setting: any, options: PickOptions = { ignoreNull: false }) {
  const isObject = (some: any) => typeof some === 'object' && some !== null
  const isArray = (some: any) => Array.isArray(some)
  const isString = (some: any) => typeof some === 'string'

  function typeConvert(
    value: any,
    typeString: string,
    ...typeParams: Array<any>
  ) {
    if (!typeString)
      return value
    switch (typeString.trim().toLowerCase()) {
      case 'float':
        return parseFloat(value)
      case 'int':
        return parseInt(value, ...typeParams)
      default:
        return value
    }
  }

  function deepProp(obj: PickerData, str: string) {
    const [propKey, propType, ...propTypeParams] = str.split(',')
    const props = propKey.trim().split('.')
    const value = props.reduce(
      (o: any, key) => (o && isObject(o) ? o[key] : o),
      obj,
    )
    return {
      key: props[props.length - 1],
      value: typeConvert(value, propType, ...propTypeParams),
    }
  }

  function pickArray(lst: Array<string>) {
    return function pickArrayFunc(obj: PickerData) {
      return lst.reduce((o, k) => {
        const { key, value } = deepProp(obj, k)
        return shouldIgnore(value) ? o : { ...o, [key]: value }
      }, {})
    }
  }

  function pickObject(objSetting: { [k: string]: string }) {
    return function pickObjectFunc(obj: PickerData) {
      return Object.keys(objSetting).reduce((o, k) => {
        const { value } = deepProp(obj, objSetting[k])
        return shouldIgnore(value) ? o : { ...o, [k]: value }
      }, {})
    }
  }

  function shouldIgnore(value: any) {
    return isNull(value) && options.ignoreNull
  }

  function isNull(some: any) {
    return some === null || some === undefined
  }

  if (isArray(setting))
    return pickArray(setting)

  if (isObject(setting))
    return pickObject(setting)

  if (isString(setting))
    return (obj: PickerData) => deepProp(obj, setting).value

  throw new Error('参数必须为String、Object、Array类型')
}
