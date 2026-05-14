import { ModalType, PanelType, PlayMode, SortTypeItemsIds } from '@/utils/constant'
import { Component } from 'vue'

export interface IPanelProps<T = any> {
  /** 面板类型 */
  type: PanelType | ''
  /** 关闭回调 */
  closeCallBack?: () => void
  /** 向面板传递的数据 */
  data?: T
}

export interface IModalProps<T = any> {
  /** 弹窗类型 */
  type: ModalType | ''
  /** 关闭回调 */
  closeCallBack?: () => void
  /** 向弹窗传递的数据 */
  data?: T
}

export interface IMainMenuItem {
  id: string
  name: string
  count: number
  iconNode: Component
  path: string
}

export interface ILyricsText {
  text: string
  timestamp?: number
}

export interface ILyricLine {
  time: number // 时间点(秒)
  text: string // 歌词文本
  translatedText?: string // 翻译歌词 (可选)
}

export interface ISongBase {
  /** MD5 */
  uid: string
  /** 文件路径 */
  filePath: string
  /** 文件名 */
  fileName: string
  /** 文件夹路径 */
  folderPath: string
}
/** 歌曲信息 */
export interface ISong extends ISongBase {
  /** 文件大小(字节) */
  size: number
  /** 歌曲名 */
  title: string
  /** 艺术家 */
  artist: string
  /** 专辑 */
  album: string
  /** 专辑艺术家 */
  albumArtist: string
  /** 歌曲年份 */
  year?: number
  /** 时长(秒) */
  duration: number
  /** 码率 */
  bitrate?: number
  /** 采样率 */
  sampleRate?: number
  /** 位深 */
  bitsPerSample?: number
  /** 文件容器 */
  container?: string
  /** 文件编码 */
  codec?: string
  /** 专辑图片 Base64 或 Blob URL */
  albumArt?: string
  /** 内嵌歌词 */
  lyrics?: ILyricsText[] | string
  /** 音质标识 */
  qualityFlag?: 'HQ' | 'SQ' | 'HR'
  /** 文件是否有效 */
  isValid: boolean
  /** 文件最后修改时间（用于增量更新） */
  mtime: number
  /** 外挂歌词文件路径 */
  lyricsFilePath?: string
  /** 添加时间戳 */
  addTime?: number
}

/** 播放状态 */
export interface IPlaybackState {
  /**当前播放列表id */
  currentListId: string
  /**当前播放歌曲id */
  currentSongId: string
  /**当前播放时间(秒) */
  currentTime: number
  /** 音量 0-1 */
  volume: number
  isPlaying: boolean
  playMode: PlayMode
  playbackRate: number
  isMuted: boolean
}

export interface IPlaylistItem {
  name: string
  /** 歌曲ID数组 */
  songIds: string[]
  coverArt?: string
  /** 创建时间-作为歌单id用 */
  createTime: string
  /** 排序方式 */
  sortType: SortTypeItemsIds
}
/** 歌单列表 */
export interface IPlaylist {
  [key: string]: IPlaylistItem
}

/** 应用设置 */
export interface IAppSettings {
  // theme: 'light' | 'dark' | 'auto'
  // language: string
  // audioOutputDevice?: string
  // 桌面端特有
  // alwaysOnTop?: boolean
  // 移动端特有
  // enableMobileNetworkPlay?: boolean
  // ... 其他设置

  // 启停设置
  /** 启动时恢复上次播放 */
  setupResume: boolean
  /** 关闭主窗口时退出程序 */
  closeQuit: boolean

  // 播放设置
  /** 播放时自动拉起播放页 */
  autoOpenPlayView: boolean
  /** 开启播放页频谱动效 */
  openVisualization: boolean
}

/** 歌手信息 */
export interface IArtist {
  name: string
  songIds: string[]
  coverArt?: string
}

/** 专辑信息 */
export interface IAlbum extends IArtist {
  artist: string
  key: string
}

// 统一存储接口 (抽象层)
export interface IStorage {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}

export interface IMetadataCache {
  get(): Promise<ISong[]>
  set(songs: ISong[]): Promise<void>
  clear(): Promise<void>
}

export interface ICoverCache {
  save(hash: string, data: Uint8Array | ArrayBuffer): Promise<string>
  get(hash: string): Promise<string | null>
  clear(): Promise<void>
}
