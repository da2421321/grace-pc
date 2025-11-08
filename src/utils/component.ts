import { ref } from 'vue'
import { computed } from 'vue'

export function makeFunctional<
  T = unknown,
  P extends { [k: string]: any } = { [k: string]: any },
>() {
  const show = ref(false)
  const resolve = ref<(v: T) => void>()
  const reject = ref<(e: Error) => void>()
  const props = ref<P>()

  /*
   * 调用的函数
   */
  async function caller(attrs?: P): Promise<T> {
    return await new Promise((rs, rj) => {
      props.value = attrs
      show.value = true
      resolve.value = rs
      reject.value = rj
    })
  }

  /*
   * 确认的回调
   */
  function confirm(value: T) {
    show.value = false
    resolve.value?.(value)
    resolve.value = undefined
    reject.value = undefined
    props.value = undefined
  }

  /*
   * 取消的回调
   */
  function cancel(e: Error) {
    show.value = false
    reject.value?.(e)
    resolve.value = undefined
    reject.value = undefined
    props.value = undefined
  }

  return {
    show: computed({
      get: () => show.value,
      set(v) {
        if (v === false)
          cancel(new Error('user canceled'))
        else show.value = true
      },
    }),
    confirm,
    caller,
    cancel,
    props,
  }
}
