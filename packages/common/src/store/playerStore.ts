import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { ISong, IPlaybackState, IPlaylist, IAppSettings, IPanelProps, IModalProps, IArtist, IAlbum } from '../types'
import { deepToRaw, DefaultKey, DefaultVolume, PlayMode, sortArtist, sortSong } from '../utils'

export const defaultState = {
  currentListId: DefaultKey.Local,
  currentSongId: '',
  currentTime: 0,
  isPlaying: false,
  volume: DefaultVolume,
  playMode: PlayMode.REPEAT_ALL,
  playbackRate: 1.0,
  isMuted: false,
}

export const defaultSettings = {
  // theme: 'auto',
  // language: navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
  setupResume: false,
  closeQuit: true,
  autoOpenPlayView: false,
  openVisualization: false,
}

export const usePlayerStore = defineStore('player', () => {
  /** 面板数据 */
  const panel = ref<IPanelProps>({ type: '' })
  /** 弹窗数据 */
  const modal = ref<IModalProps>({ type: '' })
  /** 本地列表 */
  const songs = ref<ISong[]>([])
  /** 自定义歌单数据 */
  const playlists = ref<IPlaylist>({})
  /** 播放状态 */
  const currentState = ref<IPlaybackState>(defaultState)
  /** 设置信息 */
  const settings = ref<IAppSettings>(defaultSettings)
  /** 当前正在查看的视图key */
  const currentViewKey = ref<string>(DefaultKey.Local)
  /** 默认当做歌单处理的列表key（local、favorite） */
  const defaultPlaylistKey = readonly(ref<string[]>([DefaultKey.Local, DefaultKey.Favorite]))

  // 计算属性不会只要依赖变了就立即重算。它会在依赖变了并且下一次被读取时才重算。
  /** 当前查看列表的歌曲数组(已排序) */
  const currentViewPlaylistSongs = computed(() => {
    console.log('当前查看列表：', currentViewKey.value)
    const playlist = playlists.value[currentViewKey.value]
    const playlistSongs = songs.value.filter(v => playlist?.songIds.includes(v.uid))
    return sortSong(deepToRaw(playlistSongs), playlist?.sortType)
  })

  /** 当前创建的自定义歌单列表 */
  const currentPlaylists = computed(() => {
    const keys = Object.keys(playlists.value || {})
    return keys.filter(v => !defaultPlaylistKey.value.includes(v)).map(v => playlists.value[v])
  })

  /** 当前正在查看的歌手 */
  const currentArtistName = ref<string>('')
  /** 歌手列表(已排序) */
  const artistLists = computed(() => {
    const obj: Record<string, IArtist> = {}
    songs.value.forEach(v => {
      const artistArr = v.artist?.split('、') || ['<未知>']
      artistArr.forEach(w => {
        if (obj[w]) {
          obj[w].songIds.push(v.uid)
          if (!obj[w].coverArt) obj[w].coverArt = v.albumArt
        } else {
          obj[w] = { name: w, songIds: [v.uid], coverArt: v.albumArt }
        }
      })
    })
    return sortArtist(Object.keys(obj).map(v => obj[v]))
  })
  /** 当前正在查看的歌手的歌曲数组(已排序) */
  const currentArtistSongs = computed(() => {
    const songIds = artistLists.value.find(v => v.name === currentArtistName.value)?.songIds || []
    const artistSongs = songIds.map(v => songs.value.find(w => w.uid === v)).filter(v => !!v)
    console.log('当前查看歌手：', currentArtistName.value)
    return sortSong(deepToRaw(artistSongs))
  })

  /** 当前正在查看的专辑 */
  const currentAlbumName = ref<string>('')
  /** 专辑列表(已排序) */
  const albumLists = computed(() => {
    const obj: Record<string, IAlbum> = {}
    songs.value.forEach(v => {
      const album = v.album || '<未知>',
        albumArtist = v.albumArtist || '<未知>',
        key = `${albumArtist} - ${album}`
      // 防止不同歌手的同名专辑，以 歌手 - 专辑 作为key
      if (obj[key]) {
        obj[key].songIds.push(v.uid)
        if (!obj[key].coverArt) obj[key].coverArt = v.albumArt
      } else {
        obj[key] = { key, name: album, songIds: [v.uid], coverArt: v.albumArt, artist: albumArtist }
      }
    })
    return sortArtist(Object.keys(obj).map(v => obj[v]))
  })
  /** 当前正在查看的专辑的歌曲数组(已排序) */
  const currentAlbumSongs = computed(() => {
    const songIds = albumLists.value.find(v => v.key === currentAlbumName.value)?.songIds || []
    const albumSongs = songIds.map(v => songs.value.find(w => w.uid === v)).filter(v => !!v)
    console.log('当前查看专辑：', currentAlbumName.value)
    return sortSong(deepToRaw(albumSongs))
  })

  /** 当前正在查看的文件夹 */
  const currentFolderName = ref<string>('')
  /** 文件夹列表(已排序) */
  const folderLists = computed(() => {
    const obj: Record<string, IArtist> = {}
    songs.value.forEach(v => {
      const path = v.folderPath
      if (obj[path]) {
        obj[path].songIds.push(v.uid)
        if (!obj[path].coverArt) obj[path].coverArt = v.albumArt
      } else {
        obj[path] = { name: path, songIds: [v.uid], coverArt: v.albumArt }
      }
    })
    return sortArtist(Object.keys(obj).map(v => obj[v]))
  })
  /** 当前正在查看的文件夹的歌曲数组(已排序) */
  const currentFolderSongs = computed(() => {
    const songIds = folderLists.value.find(v => v.name === currentFolderName.value)?.songIds || []
    const folderSongs = songIds.map(v => songs.value.find(w => w.uid === v)).filter(v => !!v)
    console.log('当前查看文件夹：', currentFolderName.value)
    return sortSong(deepToRaw(folderSongs))
  })

  /** 当前播放的歌曲 */
  const currentSong = computed(() => {
    return songs.value.find(s => s.uid === currentState.value.currentSongId) || null
  })
  /** 当前播放列表的歌曲数组(已排序) */
  const currentPlaylistSongs = computed(() => {
    if (currentState.value.currentListId === DefaultKey.Artist && currentArtistName.value) {
      console.log('当前播放列表：', currentState.value.currentListId, currentArtistName.value)
      return currentArtistSongs.value
    }
    if (currentState.value.currentListId === DefaultKey.Album && currentAlbumName.value) {
      console.log('当前播放列表：', currentState.value.currentListId, currentAlbumName.value)
      return currentAlbumSongs.value
    }
    if (currentState.value.currentListId === DefaultKey.Folder && currentFolderName.value) {
      console.log('当前播放列表：', currentState.value.currentListId, currentFolderName.value)
      return currentFolderSongs.value
    }
    console.log('当前播放列表：', currentState.value.currentListId)
    const playlist = playlists.value[currentState.value.currentListId]
    const playlistSongs = songs.value.filter(v => playlist?.songIds.includes(v.uid))
    return sortSong(deepToRaw(playlistSongs), playlist?.sortType)
  })
  const canGoPrev = computed(() => {
    return currentPlaylistSongs.value.length > 1
  })
  const canGoNext = computed(() => {
    return currentPlaylistSongs.value.length > 1
  })

  return {
    /** 面板数据 */
    panel,
    /** 弹窗数据 */
    modal,
    /** 本地列表 */
    songs,
    /** 自定义歌单数据 */
    playlists,
    /** 播放状态 */
    currentState,
    /** 设置信息 */
    settings,
    /** 当前正在查看的视图key */
    currentViewKey,
    /** 默认当做歌单处理的列表key（local、favorite） */
    defaultPlaylistKey,
    /** 当前播放的歌曲 */
    currentSong,
    /** 当前播放列表的歌曲数组(已排序) */
    currentPlaylistSongs,
    canGoPrev,
    canGoNext,
    /** 当前查看列表的歌曲数组(已排序) */
    currentViewPlaylistSongs,
    /** 当前创建的自定义歌单列表 */
    currentPlaylists,
    /** 歌手列表(已排序) */
    artistLists,
    /** 当前正在查看的歌手 */
    currentArtistName,
    /** 当前正在查看的歌手的歌曲数组(已排序) */
    currentArtistSongs,
    /** 专辑列表(已排序) */
    albumLists,
    /** 当前正在查看的专辑 */
    currentAlbumName,
    /** 当前正在查看的专辑的歌曲数组(已排序) */
    currentAlbumSongs,
    /** 文件夹列表(已排序) */
    folderLists,
    /** 当前正在查看的文件夹 */
    currentFolderName,
    /** 当前正在查看的文件夹的歌曲数组(已排序) */
    currentFolderSongs,
  }
})
