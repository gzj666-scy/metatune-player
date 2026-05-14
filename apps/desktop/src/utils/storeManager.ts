import { usePlayerStore, SortTypeItems, mergeSong, DefaultKey, DefaultVolume, PlayMode, defaultState, defaultSettings } from '@metatune/common'
import type { ISong, IPlaylist, IAppSettings, IPlaylistItem, IPlaybackState } from '@metatune/common'
import { toRaw } from 'vue'

export class StoreManager {
  private _playerStore: ReturnType<typeof usePlayerStore>

  constructor() {
    this._playerStore = usePlayerStore()
  }

  public get playerStore(): ReturnType<typeof usePlayerStore> {
    return this._playerStore
  }

  public initData(songs: ISong[], player: { playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState } | null) {
    if (songs?.length > 0) this._playerStore.songs = songs
    if (player?.playlists) this._playerStore.playlists = player.playlists
    if (player?.settings) this._playerStore.settings = { ...this._playerStore.settings, ...player.settings }
    if (player?.state) this._playerStore.currentState = { ...player.state, isPlaying: false }
  }

  /** 添加本地歌曲 */
  public addSongs(songs: ISong[]) {
    if (songs.length <= 0) return
    const { target: newSongs, idMap } = mergeSong(toRaw(this._playerStore.songs), songs)
    const newSongIds = newSongs.map(v => v.uid)
    console.log('id变了 ', idMap)
    // 直接修改嵌套属性会触发更新（Vue 3 proxy 机制），但如果替换整个对象，需重新赋值以触发响应式
    this._playerStore.songs = [...newSongs]

    // 本地列表也当做一种特殊歌单处理
    if (this._playerStore.playlists[DefaultKey.Local]) {
      this._playerStore.playlists[DefaultKey.Local].songIds = newSongIds
    } else {
      this._playerStore.playlists[DefaultKey.Local] = {
        name: '本地列表',
        songIds: newSongIds,
        createTime: Date.now() + '',
        sortType: SortTypeItems[0].value,
      }
    }

    // 处理歌单里一些id变了，但路径没变的
    if (Object.keys(idMap).length > 0 && this._playerStore.currentPlaylists.length > 0) {
      for (const item of this._playerStore.currentPlaylists) {
        if (item && item.songIds.length > 0) {
          for (const key in idMap) {
            const index = item.songIds.indexOf(key)
            if (index > -1) {
              this._playerStore.playlists[item.createTime].songIds[index] = idMap[key]
            }
          }
        }
      }
    }

    window.electronAPI.setLocalListCache(newSongs)
    this.savePlayCache()
  }

  /** 从指定列表移除歌曲，需用根据 listKey 区分逻辑 */
  public removeSongs(songs: string[], listKey: string) {
    if (songs.length <= 0) return
    // 如果是本地列表，需用同时更新本地歌曲数据
    if ([DefaultKey.Local, DefaultKey.Artist].includes(listKey)) {
      const newSongs = toRaw(this._playerStore.songs).filter(v => !songs.includes(v.uid))
      this._playerStore.songs = newSongs
      window.electronAPI.setLocalListCache(newSongs)

      for (const key in this._playerStore.playlists) {
        const playlist = this._playerStore.playlists[key]
        this._playerStore.playlists[key]['songIds'] = playlist.songIds.filter(v => !songs.includes(v))
      }
      this.savePlayCache()
    } else {
      const newSongIds = toRaw(this._playerStore.playlists[listKey].songIds).filter(v => !songs.includes(v))
      this.updatePlayList(listKey, 'songIds', newSongIds)
    }
  }

  /** 新增歌单 */
  public addPlayList(data: IPlaylistItem) {
    // 以创建时间戳作为歌单的key
    this._playerStore.playlists[data.createTime] = data

    this.savePlayCache()
  }

  /** 删除歌单 */
  public delPlayList(id: string) {
    delete this._playerStore.playlists[id]

    this.savePlayCache()
  }

  /** 添加歌曲到歌单 */
  public addToPlaylist(data: { id: string; songIds: string[] }[]) {
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      const playlist = this._playerStore.playlists[element.id]
      if (playlist) {
        const arr = element.songIds.filter(v => !playlist.songIds.includes(v))
        this._playerStore.playlists[element.id].songIds.push(...arr)
      }
    }

    this.savePlayCache()
  }

  /** 更新指定列表数据 */
  public updatePlayList<K extends keyof IPlaylistItem>(id: string, key: K, val: IPlaylistItem[K]) {
    if (this._playerStore.playlists[id]) {
      this._playerStore.playlists[id][key] = val

      this.savePlayCache()
    }
  }

  /** 更新歌曲喜欢状态 */
  public updateFavorite(songIds: string[], isFavorite: boolean) {
    const playlist = this._playerStore.playlists[DefaultKey.Favorite]
    if (isFavorite) {
      if (playlist) {
        const arr = songIds.filter(v => !playlist.songIds.includes(v))
        this._playerStore.playlists[DefaultKey.Favorite].songIds.push(...arr)
      } else {
        this._playerStore.playlists[DefaultKey.Favorite] = {
          name: '收藏列表',
          songIds: songIds,
          createTime: Date.now() + '',
          sortType: SortTypeItems[0].value,
        }
      }
    } else {
      const newSongIds = toRaw(playlist.songIds).filter(v => !songIds.includes(v))
      this._playerStore.playlists[DefaultKey.Favorite].songIds = newSongIds
    }

    this.savePlayCache()
  }

  public savePlayCache() {
    window.electronAPI.setPlayerCache({
      playlists: toRaw(this._playerStore.playlists),
      settings: toRaw(this._playerStore.settings),
      state: toRaw(this._playerStore.currentState),
    })
  }

  public resetStore() {
    this._playerStore.songs = []
    this._playerStore.playlists = {}
    this._playerStore.currentState = defaultState
    this._playerStore.settings = defaultSettings
  }
}

// 单例管理
let instance: StoreManager | null = null
export const getStoreManager = (): StoreManager => {
  if (!instance) {
    instance = new StoreManager()
  }
  return instance
}
