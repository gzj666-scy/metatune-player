import { h } from 'vue'
import ImportResultModal from '@/components/modal/ImportResultModal.vue'
import { Modal } from './modal'

/** 扫描结果类型直接从 preload 暴露的签名推导，避免渲染层反向依赖主进程源码 */
export type ScanResult = Awaited<ReturnType<typeof window.electronAPI.scanAudio>>
export type ScanFailure = ScanResult['failures'][number]

export interface ImportSummary {
  /** 本次扫描到的文件总数（不含失败） */
  total: number
  added: number
  updated: number
  skipped: number
  invalidated: number
}

/** 统一的导入/刷新结果弹窗：成功多少、失败多少、失败原因 */
export function showImportResult(title: string, summary: ImportSummary, failures: ScanFailure[]) {
  return Modal.show({
    title,
    type: failures.length > 0 ? 'warning' : 'success',
    showCancel: false,
    cancelText: '',
    confirmText: '知道了',
    content: h(ImportResultModal, { summary, failures }),
  })
}
