export function zipCall<F extends (...args: any) => any>(fn: F) {
  const queue: Array<{
    resolve: (...args: any) => void
    reject: (...args: any) => void
  }> = []
  let resolved = true

  return async function (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> {
    if (!resolved) {
      return await new Promise((resolve, reject) =>
        queue.push({
          resolve,
          reject,
        }),
      )
    }

    resolved = false

    try {
      const res = await fn(...args as Array<any>)
      setTimeout(() => {
        while (queue.length) {
          try {
            const f = queue.shift()
            f?.resolve(res)
          }
          catch (e) {}
        }
      })
      return res
    }
    catch (e) {
      setTimeout(() => {
        while (queue.length) {
          try {
            const f = queue.shift()
            f?.reject(e)
          }
          catch (e) {}
        }
      })
      throw e
    }
    finally {
      resolved = true
    }
  }
}
