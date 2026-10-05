import { toRaw } from 'vue'
import { usePlayerStore } from '@/store'
import { PlayMode, type ISong } from '@metatune/common'
import { HowlerPlayer } from './howlerPlayer'
import { getStoreManager } from '@/utils/storeManager'
import { loudnessService } from '@/utils/loudnessService'

export class PlayManager {
  private player: HowlerPlayer
  private playerStore: ReturnType<typeof usePlayerStore>
  private isAutoPlayNext = true
  /** v3：连续播放失败计数（防止坏曲错误风暴瞬间跳完整列表） */
  private consecutiveErrors = 0

  constructor() {
    this.player = new HowlerPlayer()
    this.playerStore = usePlayerStore()

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // 监听播放结束事件
    this.player.on('end', () => {
      this.consecutiveErrors = 0
      this.handlePlayEnd()
    })

    // 监听时间更新事件
    this.player.on('timeupdate', detail => {
      if (detail?.time !== undefined) {
        this.playerStore.currentState.currentTime = detail.time
      }
      this.playerStore.playerDuration = detail?.duration || 0
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
    const currentPlaylist = this.playerStore.currentPlaylistSongsValid
    if (currentPlaylist.length === 0) return

    // v3：连续错误超过列表长度时停止自动跳曲，避免错误风暴
    if (this.consecutiveErrors >= currentPlaylist.length) {
      console.warn('连续播放失败过多，已停止自动跳曲')
      this.consecutiveErrors = 0
      return
    }

    const currentIndex = currentPlaylist.findIndex(v => v.uid === currentSongId)
    let nextSongId: string | null
    switch (playMode) {
      case PlayMode.REPEAT_ONE:
        // 单曲循环：重新播放当前歌曲
        nextSongId = currentSongId || currentPlaylist[0]?.uid
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
          nextSongId = currentSongId || currentPlaylist[0]?.uid
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
    this.consecutiveErrors++
    console.log(`播放出错（连续第 ${this.consecutiveErrors} 次），尝试下一首`)
    this.handlePlayEnd()
  }

  /** 播放指定歌曲 */
  public playSong(songId: string, startTime = 0, listKey?: string) {
    // v3：通过 uid 索引表查找，替代全列表 find
    const song = this.playerStore.songMap.get(songId)
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
    this.player.loudnessEnabled = this.playerStore.settings.loudnessNormalization
    this.player.play(song, startTime)
    // 响度归一化：开关开启且尚未测量时，后台测量并套用补偿增益（不阻塞播放启动）
    this.maybeMeasureLoudness(song)
  }

  /**
   * 懒测量：仅在「响度归一化开关开启」且「该歌曲尚未测量」时触发。
   * 测量在 Worker 后台完成，播放已以当前音量正常开始；测完回写 song 并平滑套用补偿。
   */
  private maybeMeasureLoudness(song: ISong) {
    const s = this.playerStore.settings
    if (!s.loudnessNormalization) return
    // lufs 已测即视为测量完成（gain 一并写入），跳过
    if (song.lufs !== undefined && song.gain !== undefined) return
    console.log('开始响度测量:', song.fileName)
    loudnessService
      .measure(song.filePath, s.targetLoudness, s.truePeakCeiling)
      .then(result => {
        console.log('响度测量完成:', song.fileName, result)
        // 先回写持久化（即便歌曲已切走也保留测量结果）
        getStoreManager().updateSongLoudness(song, result.gain, result.lufs, result.truePeak)
        // 仍是当前播放歌曲才套用到播放器
        if (this.player.currentSong?.uid === song.uid) {
          this.player.applyLoudness()
        }
      })
      .catch(err => {
        console.warn('响度测量跳过:', song.fileName, err instanceof Error ? err.message : err)
      })
  }

  /** 设置开关切换时同步播放器并立即生效（开启时对当前未测歌曲触发测量） */
  public setLoudnessNormalization(enabled: boolean) {
    this.player.loudnessEnabled = enabled
    this.player.applyLoudness()
    if (enabled) {
      const cur = this.player.currentSong
      if (cur && (cur.lufs === undefined || cur.gain === undefined)) {
        this.maybeMeasureLoudness(cur)
      }
    }
  }

  /**
   * 调整目标响度 / true peak 上限后，免重测直接重算全库增益（依赖已存的 lufs / truePeak）。
   */
  public recomputeLoudnessGains() {
    const s = this.playerStore.settings
    if (!s.loudnessNormalization) return
    // 直接遍历响应式 songs，改动即触发视图更新（含当前播放歌曲的 _currentSong）
    const all = this.playerStore.songs
    let changed = false
    for (const song of all) {
      if (song.lufs === undefined || song.truePeak === undefined) continue
      const gain = Math.min(s.targetLoudness - song.lufs, s.truePeakCeiling - song.truePeak)
      if (song.gain !== gain) {
        song.gain = gain
        changed = true
      }
    }
    if (changed) getStoreManager().persistSongsCache()
    // 重新套用到当前播放
    this.player.applyLoudness()
  }

  /** 全库后台扫描：为尚未测量的歌曲计算补偿增益（Worker 串行，UI 不阻塞） */
  public async scanLibraryLoudness(onProgress?: (done: number, total: number) => void): Promise<{ scanned: number; total: number }> {
    const s = this.playerStore.settings
    if (!s.loudnessNormalization) return { scanned: 0, total: 0 }
    const songs = toRaw(this.playerStore.songs).filter(v => v.isValid && (v.lufs === undefined || v.gain === undefined))
    const total = songs.length
    let done = 0
    for (const song of songs) {
      try {
        const r = await loudnessService.measure(song.filePath, s.targetLoudness, s.truePeakCeiling)
        getStoreManager().updateSongLoudness(song, r.gain, r.lufs, r.truePeak)
      } catch (err) {
        console.warn('响度扫描跳过:', song.fileName, err instanceof Error ? err.message : err)
      }
      done++
      onProgress?.(done, total)
    }
    return { scanned: done, total }
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
    const currentPlaylist = this.playerStore.currentPlaylistSongsValid
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
    return this.player.getVisualizationDataBands()
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
