import { usePlayerStore, SortTypeItems, mergeSong, DefaultKey, defaultState, defaultSettings } from '@metatune/common-v2'
import type { ISong, IPlaylist, IAppSettings, IPlaylistItem, IPlaybackState } from '@metatune/common-v2'
import { toRaw } from 'vue'

/**
 * 从封面地址里取出文件名。地址形如 `cache://cover/<文件名>`，
 * 与主进程 appCache.coverUrl 的生成规则必须保持一致。
 */
export function coverFileName(url?: string): string {
  if (!url) return ''
  const index = url.lastIndexOf('/')
  return index > -1 ? decodeURIComponent(url.slice(index + 1)) : ''
}

export interface RefreshStats {
  /** 磁盘上已不存在、被标记为失效的歌曲数 */
  invalidated: number
  /** 曲库中新增的歌曲数 */
  added: number
  /** 当前播放的歌曲已失效，播放器需要重置 */
  reset: boolean
}

export class StoreManager {
  private _playerStore: ReturnType<typeof usePlayerStore>

  constructor() {
    this._playerStore = usePlayerStore()
  }

  public get playerStore(): ReturnType<typeof usePlayerStore> {
    return this._playerStore
  }

  public initData(songs: ISong[], player: { playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState; songDirs: string[] } | null) {
    if (songs?.length > 0) this._playerStore.songs = songs
    if (player?.playlists) this._playerStore.playlists = player.playlists
    if (player?.settings) this._playerStore.settings = { ...this._playerStore.settings, ...player.settings }
    if (player?.state) {
      if (player?.settings?.setupResume) {
        this._playerStore.currentState = { ...player.state, isPlaying: false }
      } else {
        this._playerStore.currentState = { ...player.state, currentListId: DefaultKey.Local, currentSongId: '', currentTime: 0, isPlaying: false }
      }
    }
    if (player?.songDirs && player.songDirs.length > 0) this._playerStore.songDirs = player.songDirs
  }

  /** 本地列表也当做一种特殊歌单处理 */
  private syncLocalPlaylist(songIds: string[]) {
    if (this._playerStore.playlists[DefaultKey.Local]) {
      this._playerStore.playlists[DefaultKey.Local].songIds = songIds
    } else {
      this._playerStore.playlists[DefaultKey.Local] = {
        name: '本地列表',
        songIds,
        createTime: Date.now() + '',
        sortType: SortTypeItems[0].value,
      }
    }
  }

  /** 添加本地歌曲 */
  public addSongs(songs: ISong[]) {
    if (songs.length <= 0) return
    const { target: newSongs, idMap } = mergeSong(toRaw(this._playerStore.songs), songs)
    console.log('id变了 ', idMap)
    // 直接修改嵌套属性会触发更新（Vue 3 proxy 机制），但如果替换整个对象，需重新赋值以触发响应式
    this._playerStore.songs = [...newSongs]
    this.syncLocalPlaylist(newSongs.map(v => v.uid))

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

    const { currentSongId } = this._playerStore.currentState
    if (currentSongId) {
      if (idMap[currentSongId]) {
        this._playerStore.currentState.currentSongId = idMap[currentSongId]
      }
    }

    window.electronAPI.setLocalListCache(newSongs)
    this.savePlayCache()
  }

  /**
   * 用最新扫描结果刷新本地列表。
   * 扫描结果只包含「磁盘上仍存在」的文件，消失的歌曲保留在列表里并标记失效，
   * 由用户手动清理，避免误删歌单关联。
   */
  public refreshSongs(songs: ISong[]): RefreshStats {
    // 与旧行为保持一致：一个文件都没扫到时不动曲库，避免误判成「全部消失」
    if (songs.length <= 0) return { invalidated: 0, added: 0, reset: false }
    const previous = toRaw(this._playerStore.songs)
    const scannedUids = new Set(songs.map(v => v.uid))
    const previousUids = new Set(previous.map(v => v.uid))

    const invalids = previous.filter(v => !scannedUids.has(v.uid)).map(v => ({ ...v, isValid: false }))
    const newSongs = [...songs, ...invalids]

    this._playerStore.songs = [...newSongs]
    this.syncLocalPlaylist(newSongs.map(v => v.uid))

    let added = 0
    for (const song of songs) if (!previousUids.has(song.uid)) added++

    let reset = false
    const { currentSongId } = this._playerStore.currentState
    if (currentSongId && !scannedUids.has(currentSongId)) {
      this._playerStore.currentState.currentSongId = ''
      this._playerStore.currentState.currentTime = 0
      reset = true
    }

    window.electronAPI.setLocalListCache(newSongs)
    this.savePlayCache()
    return { invalidated: invalids.length, added, reset }
  }

  public addSongDirs(dirs: string[]) {
    const newDirs = dirs.filter(v => !this._playerStore.songDirs.includes(v))
    if (newDirs.length > 0) this._playerStore.songDirs.push(...newDirs)
  }

  /** 从指定列表移除歌曲，需用根据 listKey 区分逻辑 */
  public removeSongs(songs: string[], listKey: string) {
    if (songs.length <= 0) return
    // 如果是本地列表，需用同时更新本地歌曲数据
    // 待移除的 id 建一次 Set，避免 filter 里逐个 includes 退化成 O(n·m)
    const removing = new Set(songs)
    if ([DefaultKey.Local, DefaultKey.Artist].includes(listKey)) {
      const newSongs = toRaw(this._playerStore.songs).filter(v => !removing.has(v.uid))
      this._playerStore.songs = newSongs
      window.electronAPI.setLocalListCache(newSongs)

      for (const key in this._playerStore.playlists) {
        const playlist = this._playerStore.playlists[key]
        this._playerStore.playlists[key]['songIds'] = playlist.songIds.filter(v => !removing.has(v))
      }
      this.savePlayCache()
    } else {
      const newSongIds = toRaw(this._playerStore.playlists[listKey].songIds).filter(v => !removing.has(v))
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
  public addToPlaylist(data: { id: string; songIds: string[]; cover: boolean }[]) {
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      const playlist = this._playerStore.playlists[element.id]
      if (playlist) {
        if (element.cover) {
          this._playerStore.playlists[element.id].songIds = element.songIds
        } else {
          const existing = new Set(playlist.songIds)
          const arr = element.songIds.filter(v => !existing.has(v))
          this._playerStore.playlists[element.id].songIds.push(...arr)
        }
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
        const existing = new Set(playlist.songIds)
        const arr = songIds.filter(v => !existing.has(v))
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
      const removing = new Set(songIds)
      const newSongIds = toRaw(playlist.songIds).filter(v => !removing.has(v))
      this._playerStore.playlists[DefaultKey.Favorite].songIds = newSongIds
    }

    this.savePlayCache()
  }

  /** 清理无效歌曲 */
  public clearInvalidSongs() {
    const newSongs = toRaw(this._playerStore.songs).filter(v => v.isValid)
    const newSongIds = newSongs.map(v => v.uid)

    this._playerStore.songs = [...newSongs]
    const validIds = new Set(newSongIds)
    for (const key in this._playerStore.playlists) {
      if (key === DefaultKey.Local) {
        this._playerStore.playlists[DefaultKey.Local].songIds = newSongIds
      } else {
        const playlist = this._playerStore.playlists[key]
        this._playerStore.playlists[key]['songIds'] = playlist.songIds.filter(v => validIds.has(v))
      }
    }

    window.electronAPI.setLocalListCache(newSongs)
    this.savePlayCache()
  }

  /** 清理无效专辑图 */
  public clearInvalidAlbumArt() {
    const newSongs = toRaw(this._playerStore.songs).filter(v => v.isValid)
    const names = [...new Set(newSongs.map(v => coverFileName(v.albumArt)).filter(v => v))]
    window.electronAPI.clearInvalidAlbumArt(names)
  }

  public savePlayCache() {
    window.electronAPI.setPlayerCache({
      songDirs: toRaw(this._playerStore.songDirs),
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

  public getPlaylistByName(name: string): IPlaylistItem | null {
    if (!name) return null
    for (const key in this._playerStore.playlists) {
      const playlist = this._playerStore.playlists[key]
      if (playlist.name === name) {
        return playlist
      }
    }
    return null
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
