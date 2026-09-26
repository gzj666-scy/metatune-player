import { shallowReadonly } from '@vue/reactivity'

export const useRefs = <T>(): [readonly T[], (index: number) => (el: any) => void, () => void] => {
  // 使用普通数组存储 DOM 引用（不依赖 Vue 的 ref，避免不必要的响应式开销）
  const refs: T[] = []

  // 生成每个索引对应的 ref 设置函数
  // 在模板中使用：:ref="setRefs(index)"
  const setRefs = (index: number) => (el: any) => {
    if (el) {
      refs[index] = el as T
    }
    // Vue 在卸载组件时会传 null，我们忽略它，保证数组里不会有空值
  }

  // 重置所有引用（通常用于列表变化时需要清空旧引用）
  const reset = () => {
    refs.length = 0
  }

  // 返回只读的 refs 数组，防止外部直接修改
  return [shallowReadonly(refs), setRefs, reset]
}
