<script setup lang="ts">
  import { IconEnum, SortTypeItems } from '@metatune/common'
  import type { IPanelProps, SortTypeItemsIds } from '@metatune/common'
  import { computed, StyleValue, Teleport } from 'vue'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'

  const props = withDefaults(defineProps<IPanelProps<{ value: SortTypeItemsIds; listKey: string; style: StyleValue }>>(), {
    type: '',
    // items: () => [], // ✅ 关键：数组/对象默认值必须用工厂函数
  })

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const actionStyle = computed(() => props.data?.style)
  const value = computed(() => props.data?.value)

  const onClose = () => {
    props.closeCallBack?.()
    playerStore.panel = { type: '', data: null }
  }

  const onSelectSortMode = (mode: SortTypeItemsIds) => {
    if (props.data?.listKey) {
      storeManager.updatePlayList(props.data.listKey, 'sortType', mode)
      onClose()
    }
  }
</script>

<template>
  <Teleport to="body">
    <div class="sort-panel" :style="actionStyle" v-click-outside="onClose">
      <div
        v-for="item in SortTypeItems"
        :key="item.value"
        @click="onSelectSortMode(item.value)"
        :class="`sort-panel-item${value === item.value ? ' active' : ''}`"
      >
        {{ item.label }}
        <IconBase v-if="value === item.value" class="sort-panel-item-icon">
          <component :is="IconEnum.Check" />
        </IconBase>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
  .sort-panel {
    position: fixed;
    z-index: 999;
    background: var(--modal-bg);
    box-shadow: var(--modal-shadow);
    min-width: 110px;
    border-radius: 4px;
    padding: 8px 0;

    .sort-panel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      padding: 6px 8px;
      cursor: pointer;
      color: var(--text-color-primary);

      &:hover {
        background: #f4f4f4;
      }

      &.active {
        color: var(--btn-primary-bg);
      }

      .sort-panel-item-icon {
        width: 13px;
        height: 13px;
      }
    }
  }
</style>
