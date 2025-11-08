import { computed, type Ref } from 'vue'

export function makeMap<Some extends { [index: string]: any }>(
  list: Array<Some>,
  key: string,
) {
  return list.reduce((map, item: Some) => {
    map.set(item[key], item)
    return map
  }, new Map() as Map<any, Some>)
}

export function makeComputedMap<Some extends { [index: string]: any }>(
  list: Ref<Array<Some>>,
  key: any,
) {
  return computed(() => makeMap(list.value, key))
}

export function makeLabelValueConverter<L, V>(
  options: Array<{ label: L, value: V }>,
) {
  let labelMap: Map<L | undefined, (typeof options)[0]>
  let valueMap: Map<V | undefined, (typeof options)[0]>

  return {
    toLabel: (value?: any) => {
      if (value === undefined)
        return
      if (!valueMap)
        valueMap = makeMap(options, 'value')
      return valueMap.get(value)?.label
    },
    toValue: (label?: any) => {
      if (label === undefined)
        return
      if (!labelMap)
        labelMap = makeMap(options, 'label')
      return labelMap.get(label)?.value
    },
  }
}
