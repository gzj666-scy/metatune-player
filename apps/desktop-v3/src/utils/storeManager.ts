import { SortTypeItems, mergeSong, DefaultKey } from '@metatune/common-v3'
import { defaultState, defaultSettings, usePlayerStore } from '@/store'
import type { ISong, IPlaylist, IAppSettings, IPlaylistItem, IPlaybackState } from '@metatune/common-v3'
import { toRaw } from 'vue'

export class StoreManager {
  private _playerStore: ReturnType<typeof usePlayerStore>
  /** v3：保存防抖句柄（500ms 合并高频写盘） */
  private _saveTimer: number | undefined = undefined
  private _saveDebounceMs = 500

  constructor() {
    this._playerStore = usePlayerStore()
  }

  public get playerStore(): ReturnType<typeof usePlayerStore> {
    return this._playerStore
  }

  public initData(
    songs: ISong[],
    player: { songDirs: string[]; playlists: IPlaylist; settings: IAppSettings; state: IPlaybackState } | null
  ) {
    if (songs?.length > 0) this._playerStore.songs = songs
    if (player?.playlists) this._playerStore.playlists = player.playlists
    if (player?.settings) this._playerStore.settings = { ...this._playerStore.settings, ...player.settings }
    if (player?.state) {
      if (player?.settings?.setupResume) {
        this._playerStore.currentState = { ...player.state, isPlaying: false }
      } else {
        this._playerStore.currentState = {
          ...defaultState,
          currentListId: DefaultKey.Local,
          currentSongId: '',
          currentTime: 0,
          isPlaying: false,
        }
      }
    }
    if (player?.songDirs && player.songDirs.length > 0) this._playerStore.songDirs = player.songDirs
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
    this.ensureDefaultPlaylists(newSongIds)

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
    if (currentSongId && idMap[currentSongId]) {
      this._playerStore.currentState.currentSongId = idMap[currentSongId]
    }

    window.electronAPI.setSongsCache(newSongs)
    this.savePlayCache()
  }

  /** 确保 local / favorite 默认歌单存在（v3 抽取，消除三处重复初始化） */
  private ensureDefaultPlaylists(localSongIds: string[]) {
    if (this._playerStore.playlists[DefaultKey.Local]) {
      this._playerStore.playlists[DefaultKey.Local].songIds = localSongIds
    } else {
      this._playerStore.playlists[DefaultKey.Local] = {
        name: '本地列表',
        songIds: localSongIds,
        createTime: Date.now() + '',
        sortType: SortTypeItems[0].value,
      }
    }
  }

  /** 全量重建歌曲列表（保留无效歌曲标记） */
  public refreshSongs(songs: ISong[]) {
    if (songs.length <= 0) return false
    const newSongs = songs
    const invalids = toRaw(this._playerStore.songs)
      .filter(v => !songs.find(w => v.uid === w.uid))
      .map(v => ({ ...v, isValid: false }))
    newSongs.push(...invalids)
    const newSongIds = newSongs.map(v => v.uid)
    this._playerStore.songs = [...newSongs]
    this.ensureDefaultPlaylists(newSongIds)

    let reset = false
    const { currentSongId } = this._playerStore.currentState
    if (!songs.find(w => currentSongId === w.uid)) {
      this._playerStore.currentState.currentSongId = ''
      this._playerStore.currentState.currentTime = 0
      reset = true
    }

    window.electronAPI.setSongsCache(newSongs)
    this.savePlayCache()
    return reset
  }

  /** v3 增量刷新：合并"新增 + 变更重解析 + 移除失效"三种结果 */
  public applyScanResult(newSongs: ISong[], changedSongs: ISong[], removedPaths: string[]) {
    let allSongs = toRaw(this._playerStore.songs)

    // 1. 移除磁盘上已不存在的路径对应歌曲
    if (removedPaths.length > 0) {
      const removedSet = new Set(removedPaths)
      const removedCurrent = allSongs.find(v => removedSet.has(v.filePath) && v.uid === this._playerStore.currentState.currentSongId)
      allSongs = allSongs.filter(v => !removedSet.has(v.filePath))
      if (removedCurrent) {
        this._playerStore.currentState.currentSongId = ''
        this._playerStore.currentState.currentTime = 0
      }
    }

    // 2. 合并新增与变更（mergeSong 内部处理 uid 变更的 idMap）
    const parsed = [...newSongs, ...changedSongs]
    if (parsed.length > 0) {
      const { target, idMap } = mergeSong(allSongs, parsed)
      allSongs = target
      const { currentSongId } = this._playerStore.currentState
      if (currentSongId && idMap[currentSongId]) {
        this._playerStore.currentState.currentSongId = idMap[currentSongId]
      }
    }

    // 3. 写回
    this._playerStore.songs = [...allSongs]
    const localPlaylist = this._playerStore.playlists[DefaultKey.Local]
    if (localPlaylist) {
      localPlaylist.songIds = allSongs.map(v => v.uid)
    }

    window.electronAPI.setSongsCache(allSongs)
    this.savePlayCache()

    return {
      added: newSongs.length,
      updated: changedSongs.length,
      removed: removedPaths.length,
    }
  }

  public addSongDirs(dirs: string[]) {
    const newDirs = dirs.filter(v => !this._playerStore.songDirs.includes(v))
    if (newDirs.length > 0) this._playerStore.songDirs.push(...newDirs)
  }

  /** 从指定列表移除歌曲，需用根据 listKey 区分逻辑 */
  public removeSongs(songs: string[], listKey: string) {
    if (songs.length <= 0) return
    // 如果是本地列表，需用同时更新本地歌曲数据
    if ([DefaultKey.Local, DefaultKey.Artist].includes(listKey)) {
      const newSongs = toRaw(this._playerStore.songs).filter(v => !songs.includes(v.uid))
      this._playerStore.songs = newSongs
      window.electronAPI.setSongsCache(newSongs)

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
  public addToPlaylist(data: { id: string; songIds: string[]; cover: boolean }[]) {
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      const playlist = this._playerStore.playlists[element.id]
      if (playlist) {
        if (element.cover) {
          this._playerStore.playlists[element.id].songIds = element.songIds
        } else {
          const arr = element.songIds.filter(v => !playlist.songIds.includes(v))
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

  /** 清理无效歌曲 */
  public clearInvalidSongs() {
    const newSongs = toRaw(this._playerStore.songs).filter(v => v.isValid)
    const newSongIds = newSongs.map(v => v.uid)

    this._playerStore.songs = [...newSongs]
    for (const key in this._playerStore.playlists) {
      if (key === DefaultKey.Local) {
        this._playerStore.playlists[DefaultKey.Local].songIds = newSongIds
      } else {
        const playlist = this._playerStore.playlists[key]
        this._playerStore.playlists[key]['songIds'] = playlist.songIds.filter(v => newSongIds.includes(v))
      }
    }

    window.electronAPI.setSongsCache(newSongs)
    this.savePlayCache()
  }

  /** 清理无效专辑图 */
  public clearInvalidAlbumArt() {
    const newSongs = toRaw(this._playerStore.songs).filter(v => v.isValid)
    const set = new Set(newSongs.map(v => v.albumArt?.slice('cache://'.length)).filter(v => v))
    window.electronAPI.clearInvalidAlbumArt(set)
  }

  /** 防抖保存（v3：高频操作如批量导入、拖动进度时合并写盘） */
  public savePlayCache() {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = window.setTimeout(() => {
      this._saveTimer = undefined
      this.savePlayCacheNow()
    }, this._saveDebounceMs)
  }

  /** 写回单首歌的响度测量结果（增益 / 实测 LUFS / true peak）并防抖持久化 */
  public updateSongLoudness(song: ISong, gain: number, lufs: number, truePeak: number) {
    // 直接改响应式 store 元素：_currentSong / 弹窗 / 列表都引用同一对象，改动即触发视图更新
    const target = this._playerStore.songs.find(v => v.uid === song.uid)
    if (target) {
      target.gain = gain
      target.lufs = lufs
      target.truePeak = truePeak
    }
    this.persistSongsCache()
  }

  private _songsSaveTimer: number | undefined = undefined
  /** 防抖持久化歌曲列表（批量测量 / 扫描时合并写盘，避免高频 IPC） */
  public persistSongsCache() {
    if (this._songsSaveTimer) clearTimeout(this._songsSaveTimer)
    this._songsSaveTimer = window.setTimeout(() => {
      this._songsSaveTimer = undefined
      window.electronAPI.setSongsCache(toRaw(this._playerStore.songs))
    }, 400)
  }

  /** 立即保存（退出前 flush 用）。必须 await：写盘是异步 IPC，未 await 会在 app.quit() 前被中断 */
  public async savePlayCacheNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
      this._saveTimer = undefined
    }
    if (this._songsSaveTimer) {
      clearTimeout(this._songsSaveTimer)
      this._songsSaveTimer = undefined
    }
    // 播放器状态（歌单/设置/播放进度等）与歌曲列表（含响度增益）一并落盘，再回发 APP_FLUSHED
    await Promise.all([
      window.electronAPI.setPlayerCache({
        songDirs: toRaw(this._playerStore.songDirs),
        playlists: toRaw(this._playerStore.playlists),
        settings: toRaw(this._playerStore.settings),
        state: toRaw(this._playerStore.currentState),
      }),
      window.electronAPI.setSongsCache(toRaw(this._playerStore.songs)),
    ])
  }

  public resetStore() {
    this._playerStore.songs = []
    this._playerStore.playlists = {}
    this._playerStore.currentState = defaultState
    this._playerStore.settings = defaultSettings
    this._playerStore.songDirs = []
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
