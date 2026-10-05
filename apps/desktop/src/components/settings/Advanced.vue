<script setup lang="ts">
  import { computed, ref } from 'vue'
  import Switch from '../base/Switch.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { Toast } from '@/utils/toast'
  import { getPlayManager } from '@/utils/playManager'

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const { playerStore } = storeManager

  const settings = computed(() => playerStore.settings)

  function handleLoudnessNormalization(data: boolean) {
    playerStore.settings.loudnessNormalization = data
    playManager.setLoudnessNormalization(data)
    storeManager.savePlayCache()
  }

  function handleTargetLoudness(e: Event) {
    const v = Number((e.target as HTMLInputElement).value)
    if (Number.isFinite(v)) {
      playerStore.settings.targetLoudness = v
      handleTargetChange()
    }
  }

  function handleTruePeakCeiling(e: Event) {
    const v = Number((e.target as HTMLInputElement).value)
    if (Number.isFinite(v)) {
      playerStore.settings.truePeakCeiling = v
      handleTargetChange()
    }
  }

  // 调整目标后免重测重算全库增益（依赖已存的 lufs / truePeak）
  function handleTargetChange() {
    playManager.recomputeLoudnessGains()
    storeManager.savePlayCache()
  }

  const scanning = ref(false)
  async function handleScanLibrary() {
    if (scanning.value) return
    scanning.value = true
    const toastId = Toast.loading('正在扫描曲库响度…')
    try {
      const { scanned, total } = await playManager.scanLibraryLoudness()
      Toast.success(`响度扫描完成：已处理 ${scanned}/${total} 首`)
    } catch {
      Toast.error('响度扫描失败')
    } finally {
      Toast.hide(toastId)
      scanning.value = false
    }
  }
</script>

<template>
  <section class="advanced-view">
    <div class="advanced-group">
      <h2 class="advanced-group-title">响度归一化：</h2>
      <div class="advanced-item-group">
        <div class="advanced-item">
          <div class="advanced-item-info">
            <div class="advanced-item-title">开启 LUFS 响度归一化</div>
            <div class="advanced-item-desc">播放时自动测量并拉平各歌曲音量，只测不改、零音质损失</div>
          </div>
          <Switch :checked="settings.loudnessNormalization" @change="handleLoudnessNormalization" />
        </div>
        <template v-if="settings.loudnessNormalization">
          <div class="advanced-item">
            <div class="advanced-item-info">
              <div class="advanced-item-title">目标响度 (LUFS)</div>
              <div class="advanced-item-desc">流媒体通用 -14，越暗填越小（如 -16），越响填越大（如 -12）</div>
            </div>
            <input class="advanced-item-input" type="number" step="0.5" :value="settings.targetLoudness" @change="handleTargetLoudness" />
          </div>
          <div class="advanced-item">
            <div class="advanced-item-info">
              <div class="advanced-item-title">true peak 上限 (dBTP)</div>
              <div class="advanced-item-desc">卡增益防削波，标准 -1.0，保守可填 -2.0（勿超过 0）</div>
            </div>
            <input class="advanced-item-input" type="number" step="0.5" :value="settings.truePeakCeiling" @change="handleTruePeakCeiling" />
          </div>
          <div class="advanced-item">
            <div class="advanced-item-info">
              <div class="advanced-item-title">扫描整个曲库</div>
              <div class="advanced-item-desc">为尚未测量的歌曲计算补偿增益（后台进行，不卡界面）</div>
            </div>
            <button class="advanced-item-btn" :disabled="scanning" @click="handleScanLibrary">扫描</button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .advanced-view {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .advanced-group {
      .advanced-group-title {
        font-size: 16px;
        line-height: 200%;
        font-weight: 600;
      }

      .advanced-item-group {
        .advanced-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;

          .advanced-item-info {
            .advanced-item-title {
              font-size: 14px;
            }
          }

          .scy-switch {
            width: 46px;
            height: 22px;
            border-radius: 30px;
            padding: 2px;

            :deep(.scy-switch-bar) {
              width: 18px;
              height: 18px;
            }
          }

          .advanced-item-desc {
            margin-top: 4px;
            font-size: 12px;
            line-height: 1.4;
            color: var(--text-color-secondary, rgb(0 0 0 / 60%));
          }

          .advanced-item-input {
            width: 72px;
            height: 28px;
            padding: 0 8px;
            border-radius: 6px;
            border: 1px solid var(--border-color, rgb(0 0 0 / 15%));
            background: var(--input-bg, rgb(0 0 0 / 4%));
            color: var(--text-color-primary);
            font-size: 13px;
            text-align: center;

            &:focus {
              outline: none;
              border-color: var(--btn-primary-bg);
            }
          }

          .advanced-item-btn {
            width: 70px;
            height: 30px;
            border-radius: 50px;
            background: var(--btn-secondary-bg);
            color: var(--btn-primary-bg);

            &:hover {
              color: var(--btn-primary-hover-bg);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
</style>
