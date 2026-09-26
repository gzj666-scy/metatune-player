<script setup lang="ts">
  import { computed } from 'vue'

  interface Failure {
    filePath: string
    reason: string
  }

  interface Summary {
    /** 本次扫描到的文件总数 */
    total: number
    /** 曲库中新增的歌曲数 */
    added: number
    /** 内容变更、被重新解析的歌曲数 */
    updated: number
    /** 未变更、直接复用缓存的歌曲数 */
    skipped: number
    /** 磁盘上已消失、被标记失效的歌曲数 */
    invalidated: number
  }

  const props = defineProps<{
    summary: Summary
    failures: Failure[]
  }>()

  const headline = computed(() => {
    const failed = props.failures.length
    if (failed === 0) return `成功处理 ${props.summary.total} 首`
    if (props.summary.total === 0) return '没有可导入的音频文件'
    return `成功 ${props.summary.total} 首，失败 ${failed} 首`
  })

  /** 只展示文件名，完整路径放到 title 里，避免撑破弹窗 */
  const baseName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath
</script>

<template>
  <div class="import-result">
    <div class="ir-headline">{{ headline }}</div>

    <div class="ir-stats">
      <span v-if="summary.added" class="ir-stat">
        新增 <b>{{ summary.added }}</b>
      </span>
      <span v-if="summary.updated" class="ir-stat">
        更新 <b>{{ summary.updated }}</b>
      </span>
      <span v-if="summary.skipped" class="ir-stat">
        未变更 <b>{{ summary.skipped }}</b>
      </span>
      <span v-if="summary.invalidated" class="ir-stat">
        失效 <b>{{ summary.invalidated }}</b>
      </span>
      <span v-if="failures.length" class="ir-stat is-failed">
        失败 <b>{{ failures.length }}</b>
      </span>
    </div>

    <div v-if="failures.length" class="ir-failures">
      <div class="ir-failures-title">失败明细</div>
      <ul class="ir-failure-list">
        <li v-for="(item, index) in failures" :key="index" class="ir-failure-item">
          <span class="ir-failure-name" :title="item.filePath">{{ baseName(item.filePath) }}</span>
          <span class="ir-failure-reason">{{ item.reason }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss">
  // 只在承载本组件的弹窗里加宽，不影响其它提示弹窗
  .nm-content:has(.import-result) {
    width: 440px;
  }

  .import-result {
    width: 100%;

    .ir-headline {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color-primary);
    }

    .ir-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 10px;

      .ir-stat {
        font-size: 13px;
        color: var(--text-color-secondary);

        b {
          color: var(--text-color-primary);
        }

        &.is-failed b {
          color: #e5533d;
        }
      }
    }

    .ir-failures {
      margin-top: 14px;

      .ir-failures-title {
        font-size: 13px;
        color: var(--text-color-secondary);
        margin-bottom: 6px;
      }

      .ir-failure-list {
        max-height: 200px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .ir-failure-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
        line-height: 1.4;
      }

      .ir-failure-name {
        color: var(--text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ir-failure-reason {
        color: #e5533d;
      }
    }
  }
</style>
