<script setup lang="ts">
  import { IconEnum } from '@metatune/common'
  import type { IPanelProps } from '@metatune/common'
  import { computed, StyleValue, Teleport } from 'vue'
  import IconBase from '@/components/base/IconBase.vue'
  import { getStoreManager } from '@/utils/storeManager'
  import { Modal } from '@/utils/modal'
  import { getPlayManager } from '@/utils/playManager'

  const props = withDefaults(defineProps<IPanelProps<{ id: string; style: StyleValue }>>(), {
    type: '',
  })

  const playManager = getPlayManager()
  const storeManager = getStoreManager()
  const playerStore = storeManager.playerStore

  const actionStyle = computed(() => props.data?.style)

  const onClose = () => {
    props.closeCallBack?.()
    playerStore.panel = { type: '', data: null }
  }

  const onPlay = () => {
    if (props.data?.id) {
      onClose()
      playManager.playPlaylist(props.data.id)
    }
  }

  const onRename = async () => {
    if (props.data?.id) {
      onClose()
      const playlist = playerStore.playlists[props.data.id]
      const name = await Modal.prompt('重命名歌单', '', playlist.name)
      if (name && name.trim()) {
        storeManager.updatePlayList(props.data.id, 'name', name)
      }
    }
  }

  const onDelete = async () => {
    if (props.data?.id) {
      onClose()
      const playlist = playerStore.playlists[props.data.id]
      const result = await Modal.confirm(`确定要删除歌单"${playlist.name}"吗？`, '确认删除')
      if (result) {
        storeManager.delPlayList(props.data.id)
      }
    }
  }
</script>

<template>
  <Teleport to="body">
    <div class="action-menu" :style="actionStyle" v-click-outside="onClose">
      <div class="action-menu-item" @click.stop="onPlay()">
        <IconBase>
          <component :is="IconEnum.Play" />
        </IconBase>
        播放
      </div>
      <div class="action-menu-item" @click.stop="onRename()">
        <IconBase>
          <component :is="IconEnum.PencilLine" />
        </IconBase>
        重命名
      </div>
      <div class="action-menu-item" @click.stop="onDelete()">
        <IconBase>
          <component :is="IconEnum.Delete" />
        </IconBase>
        删除
      </div>
    </div>
  </Teleport>
</template>

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
