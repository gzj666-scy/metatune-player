import { StorageFactory } from './StorageFactory'
import type { ISong, IPlaylist, IPlaybackState, IAppSettings } from '../types'

const STORAGE_KEYS = {
  SONGS: 'metatune_songs',
  PLAYLISTS: 'metatune_playlists',
  PLAYBACK_STATE: 'metatune_playback_state',
  SETTINGS: 'metatune_settings',
  LAST_BACKUP: 'metatune_last_backup',
} as const

export class PersistenceManager {
  private storage = StorageFactory.getStorage()

  // 保存所有应用数据
  async saveAllData(data: { songs: ISong[]; playlists: IPlaylist[]; playbackState: IPlaybackState; settings: IAppSettings }): Promise<void> {
    try {
      await this.storage.setItem(STORAGE_KEYS.SONGS, data.songs)
      await this.storage.setItem(STORAGE_KEYS.PLAYLISTS, data.playlists)
      await this.storage.setItem(STORAGE_KEYS.PLAYBACK_STATE, data.playbackState)
      await this.storage.setItem(STORAGE_KEYS.SETTINGS, data.settings)
      await this.storage.setItem(STORAGE_KEYS.LAST_BACKUP, Date.now())
    } catch (error) {
      console.error('Failed to save all data:', error)
      throw error
    }
  }

  // 加载所有应用数据
  async loadAllData(): Promise<{
    songs: ISong[]
    playlists: IPlaylist[]
    playbackState: IPlaybackState | null
    settings: IAppSettings | null
  }> {
    try {
      const [songs, playlists, playbackState, settings] = await Promise.all([
        this.storage.getItem<ISong[]>(STORAGE_KEYS.SONGS) || [],
        this.storage.getItem<IPlaylist[]>(STORAGE_KEYS.PLAYLISTS) || [],
        this.storage.getItem<IPlaybackState>(STORAGE_KEYS.PLAYBACK_STATE),
        this.storage.getItem<IAppSettings>(STORAGE_KEYS.SETTINGS),
      ])

      return { songs, playlists, playbackState, settings }
    } catch (error) {
      console.error('Failed to load data:', error)
      return { songs: [], playlists: [], playbackState: null, settings: null }
    }
  }

  // 备份数据到JSON文件（用于导出）
  async exportBackup(): Promise<string> {
    const data = await this.loadAllData()
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      ...data,
    }
    return JSON.stringify(backup, null, 2)
  }

  // 从JSON文件恢复数据（用于导入）
  async importBackup(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData)

      if (data.songs && Array.isArray(data.songs)) {
        await this.storage.setItem(STORAGE_KEYS.SONGS, data.songs)
      }
      if (data.playlists && Array.isArray(data.playlists)) {
        await this.storage.setItem(STORAGE_KEYS.PLAYLISTS, data.playlists)
      }
      if (data.playbackState) {
        await this.storage.setItem(STORAGE_KEYS.PLAYBACK_STATE, data.playbackState)
      }
      if (data.settings) {
        await this.storage.setItem(STORAGE_KEYS.SETTINGS, data.settings)
      }

      return true
    } catch (error) {
      console.error('Failed to import backup:', error)
      return false
    }
  }

  // 清理所有数据
  async clearAllData(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS)
    for (const key of keys) {
      await this.storage.removeItem(key)
    }
  }
}
