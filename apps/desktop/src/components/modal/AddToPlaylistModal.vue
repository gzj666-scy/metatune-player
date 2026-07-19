<script setup lang="ts">
  import { getStoreManager } from '@/utils/storeManager'
  import { computed, ref, Teleport } from 'vue'
  import ModalBase from '../base/ModalBase.vue'
  import { IModalProps } from '@metatune/common'

  const props = withDefaults(defineProps<IModalProps<{ songIds: string[]; cover?: boolean }>>(), {
    type: '',
  })

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const selectedListsRef = ref<string[]>([])

  const playlists = computed(() => {
    return playerStore.currentPlaylists.filter(v => v.createTime !== playerStore.currentViewKey)
  })

  const onClose = () => {
    props.closeCallBack?.()
    playerStore.modal = { type: '', data: null }
  }

  const onSelect = (id: string) => {
    const index = selectedListsRef.value.indexOf(id)
    if (index > -1) {
      selectedListsRef.value.splice(index, 1)
    } else {
      selectedListsRef.value.push(id)
    }
  }

  const onAdd = () => {
    if (selectedListsRef.value.length > 0 && props.data?.songIds && props.data.songIds?.length > 0) {
      storeManager.addToPlaylist(selectedListsRef.value.map(v => ({ id: v, songIds: props.data?.songIds || [], cover: props.data?.cover || false })))
    }
    onClose()
  }
</script>

<template>
  <Teleport to="body">
    <ModalBase :visible="true" :classNames="{ content: 'apm-content' }" title="添加到歌单" :onClose="onClose" :onConfirm="onAdd">
      <div v-for="item in playlists" class="apm-item" :key="item.createTime">
        <input type="checkbox" :checked="selectedListsRef.includes(item.createTime)" @click.stop @change="onSelect(item.createTime)" />
        <span>{{ item.name }}</span>
      </div>
    </ModalBase>
  </Teleport>
</template>

<style lang="scss">
  .apm-content {
    min-width: 300px;
    display: flex;
    flex-direction: column;

    .apm-item {
      padding: 6px 6px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 16px;

      input {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .info-item-label {
        flex-shrink: 0;
      }
    }
  }
</style>
