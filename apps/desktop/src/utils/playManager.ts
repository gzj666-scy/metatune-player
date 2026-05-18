import { usePlayerStore, PlayMode } from '@metatune/common'
import { HowlerPlayer } from './howlerPlayer'

export class PlayManager {
  private player: HowlerPlayer
  private playerStore: ReturnType<typeof usePlayerStore>
  private isAutoPlayNext = true

  constructor() {
    this.player = new HowlerPlayer()
    this.playerStore = usePlayerStore()

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // 监听播放结束事件
    this.player.on('end', () => {
      this.handlePlayEnd()
    })

    // 监听时间更新事件
    this.player.on('timeupdate', detail => {
      if (detail?.time !== undefined) {
        this.playerStore.currentState.currentTime = detail.time
      }
    })

    // 监听播放事件
    this.player.on('play', () => {
      this.playerStore.currentState.isPlaying = true
    })

    // 监听暂停事件
    this.player.on('pause', () => {
      this.playerStore.currentState.isPlaying = false
    })

    // 监听错误事件
    this.player.on('error', detail => {
      console.error('Player error:', detail?.error)
      this.handlePlayError()
    })
  }

  /** 播放结束处理 */
  private handlePlayEnd() {
    this.playerStore.currentState.isPlaying = false
    this.playerStore.currentState.currentTime = 0
    if (!this.isAutoPlayNext) return
    const { playMode, currentSongId } = this.playerStore.currentState
    const currentPlaylist = this.playerStore.currentPlaylistSongs
    if (currentPlaylist.length === 0) return
    const currentIndex = currentPlaylist.findIndex(v => v.uid === currentSongId)
    let nextSongId: string | null = null
    switch (playMode) {
      case PlayMode.REPEAT_ONE:
        // 单曲循环：重新播放当前歌曲
        if (currentSongId) {
          nextSongId = currentSongId
        } else {
          nextSongId = currentPlaylist[0]?.uid
        }
        break
      case PlayMode.SHUFFLE:
        // 随机播放：从播放列表中随机选择
        if (currentPlaylist.length > 1) {
          let randomIndex: number
          do {
            randomIndex = Math.floor(Math.random() * currentPlaylist.length)
          } while (randomIndex === currentIndex && currentPlaylist.length > 1)
          nextSongId = currentPlaylist[randomIndex].uid
        } else {
          // 只有一首歌时循环播放
          if (currentSongId) {
            nextSongId = currentSongId
          } else {
            nextSongId = currentPlaylist[0]?.uid
          }
        }
        break
      default:
        if (currentIndex < 0) {
          nextSongId = currentPlaylist[0]?.uid
        } else {
          // 列表循环：播放下一首，如果是最后一首则播放第一首
          const nextIndex = (currentIndex + 1) % currentPlaylist.length
          nextSongId = currentPlaylist[nextIndex].uid
        }
        break
    }

    if (nextSongId) {
      this.playSong(nextSongId)
    }
  }

  /** 播放错误处理 */
  private handlePlayError() {
    console.log('播放出错，尝试下一首')
    this.handlePlayEnd()
  }

  /** 播放指定歌曲 */
  public playSong(songId: string, startTime: number = 0, listKey?: string) {
    const song = this.playerStore.songs.find(s => s.uid === songId)
    if (!song) {
      console.error('ISong not found:', songId)
      return
    }

    this.playerStore.currentState.currentSongId = songId
    this.playerStore.currentState.isPlaying = true
    this.playerStore.currentState.currentTime = startTime
    // 如果歌曲不属于当前查看列表，将播放列表设为该歌曲所属当前查看列表
    if (listKey && listKey !== this.playerStore.currentState.currentListId) {
      this.playerStore.currentState.currentListId = listKey
    }

    // 播放歌曲
    this.player.play(song, startTime)
  }

  /** 播放切换 */
  public togglePlayPause(listKey?: string) {
    const { currentSongId, currentTime, currentListId } = this.playerStore.currentState
    if (currentSongId) {
      if (this.player.isPlaying) {
        this.player.pause()
        this.playerStore.currentState.isPlaying = false
      } else {
        if (this.player.currentSong) {
          this.player.resume()
          this.playerStore.currentState.isPlaying = true
          // 如果歌曲不属于当前查看列表，将播放列表设为该歌曲所属当前查看列表
          if (listKey && listKey !== this.playerStore.currentState.currentListId) {
            this.playerStore.currentState.currentListId = listKey
          }
        } else {
          // 播放器启动时点击播放
          this.playSong(currentSongId, currentTime, listKey ? listKey : currentListId)
        }
      }
    } else {
      this.handlePlayEnd()
    }
  }

  /** 播放上一首 */
  public playPrev() {
    const { currentSongId, playMode } = this.playerStore.currentState
    const currentPlaylist = this.playerStore.currentPlaylistSongs
    if (currentPlaylist.length === 0) return
    let prevIndex: number
    const currentIndex = currentPlaylist.findIndex(v => v.uid === currentSongId)
    if (playMode === PlayMode.SHUFFLE) {
      // 随机模式下，随机选择一首
      prevIndex = Math.floor(Math.random() * currentPlaylist.length)
    } else {
      if (currentIndex < 0) {
        prevIndex = 0
      } else {
        // 顺序播放：播放上一首，如果是第一首则播放最后一首
        prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length
      }
    }

    const prevSongId = currentPlaylist[prevIndex]?.uid
    if (prevSongId) {
      this.playSong(prevSongId)
    }
  }

  /** 播放下一首 */
  public playNext() {
    this.handlePlayEnd()
  }

  /** 播放歌单 */
  public playPlaylist(id: string) {
    if (id !== this.playerStore.currentState.currentListId) {
      const playlist = this.playerStore.playlists[id]
      if (playlist && playlist.songIds.length > 0) {
        this.playSong(playlist.songIds[0], 0, id)
      }
    }
  }

  public seekTo(time: number) {
    this.player.seek(time)
    this.playerStore.currentState.currentTime = time
  }

  public setVolume(volume: number) {
    this.player.setVolume(volume)
    this.playerStore.currentState.volume = volume
  }

  public setPlayMode(mode: PlayMode) {
    this.playerStore.currentState.playMode = mode
  }

  public toggleMute(muted: boolean) {
    this.player.toggleMute(muted)
    this.playerStore.currentState.isMuted = muted
  }

  public setAutoPlayNext(enabled: boolean) {
    this.isAutoPlayNext = enabled
  }

  public getVisualizationData() {
    return this.player.getVisualizationData()
  }

  /** 获取当前播放器实例 */
  public getPlayer() {
    return this.player
  }

  destroy() {
    this.player.destroy()
  }
}

// 单例管理
let instance: PlayManager | null = null
export const getPlayManager = (): PlayManager => {
  if (!instance) {
    instance = new PlayManager()
  }
  return instance
}
