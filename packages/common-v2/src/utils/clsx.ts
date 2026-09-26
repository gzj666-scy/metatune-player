const appendClass = (value: string, newClass: string) => {
  if (!newClass) {
    return value
  }

  if (value) {
    return value + ' ' + newClass
  }

  return value + newClass
}

const hasOwn = {}.hasOwnProperty

const parseValue = (arg: any) => {
  if (typeof arg === 'string' || typeof arg === 'number') {
    return arg
  }

  if (typeof arg !== 'object') {
    return ''
  }

  if (Array.isArray(arg)) {
    return clsx(...arg)
  }

  if (arg.toString !== Object.prototype.toString && !arg.toString.toString().includes('[native code]')) {
    return arg.toString()
  }

  let classes = ''
  for (const key in arg) {
    if (hasOwn.call(arg, key) && arg[key]) {
      classes = appendClass(classes, key)
    }
  }

  return classes
}

export const clsx = (...e: any[]) => {
  let classes = ''
  for (let i = 0; i < e.length; i++) {
    const arg = e[i]
    if (arg) {
      classes = appendClass(classes, parseValue(arg))
    }
  }

  return classes
}
