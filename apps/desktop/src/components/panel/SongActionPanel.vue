<template>
  <Teleport to="body">
    <div class="action-menu" :style="actionStyle" v-click-outside="onClose">
      <div class="action-menu-item" @click.stop="onAddToPlayList()">
        <IconBase>
          <component :is="IconEnum.Plus" />
        </IconBase>
        添加到歌单
      </div>
      <div class="action-menu-item" @click.stop="onLookSongInfo()">
        <IconBase>
          <component :is="IconEnum.Info" />
        </IconBase>
        歌曲信息
      </div>
      <div class="action-menu-item" @click.stop="onRemoveSong()">
        <IconBase>
          <component :is="IconEnum.Delete" />
        </IconBase>
        从列表中移除
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { IconEnum, ModalType } from '@metatune/common'
  import type { IPanelProps, ISong } from '@metatune/common'
  import { computed, StyleValue, Teleport } from 'vue'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { Modal } from '@/utils/modal'

  const props = withDefaults(defineProps<IPanelProps<{ song: ISong; listKey: string; style: StyleValue }>>(), {
    type: '',
  })

  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const actionStyle = computed(() => props.data?.style)

  const onClose = () => {
    props.closeCallBack?.()
    playerStore.panel = { type: '', data: null }
  }

  const onAddToPlayList = () => {
    if (props.data?.song) {
      onClose()
      playerStore.modal = { type: ModalType.AddToPlaylist, data: { songIds: [props.data.song.uid] } }
    }
  }

  const onLookSongInfo = () => {
    if (props.data?.song) {
      onClose()
      playerStore.modal = { type: ModalType.SongInfo, data: { song: props.data.song } }
    }
  }

  const onRemoveSong = async () => {
    if (props.data?.song) {
      onClose()
      const result = await Modal.confirm(`确定要移除歌曲"${props.data.song.title}"吗？`, '确认移除')
      if (result) {
        storeManager.removeSongs([props.data.song.uid], props.data.listKey)
      }
    }
  }
</script>

<style scoped lang="scss">
  .action-menu {
    position: fixed;
    background: var(--modal-bg);
    box-shadow: var(--modal-shadow);
    border-radius: 6px;
    z-index: 2000;
    min-width: 120px;
    overflow: hidden;
    padding: 4px 0;

    .action-menu-item {
      padding: 8px 10px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;

      &:hover {
        background: #f4f4f4;
      }

      svg {
        width: 14px;
      }
    }
  }
</style>
