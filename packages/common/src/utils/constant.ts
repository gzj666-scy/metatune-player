import { IMainMenuItem } from '../types'
import { IconEnum } from './svgIcons'

/** 支持的音频格式 */
export const SupportedAudioFormat = [
  'mp3', //codec: "MPEG 1 Layer 3"; container: "MPEG"
  'm4a', //codec: "MPEG-4/AAC"; container: "M4A/isom/iso2"
  'flac', //codec: "FLAC"; container: "FLAC"
  'wav', //codec: "PCM"; container: "WAVE"
  // 'aac', //codec: "AAC"; container: "ADTS/MPEG-4"   疑似无法解析出时长、比特率信息，不予支持
  // 'ape', //codec: ""; container: "Monkey's Audio"   疑似需 FFmpeg / JS 软解，不予支持
  // 'alac',
  // 'ogg', //codec: "Opus"; container: "Ogg"   疑似无法解析出时长、比特率信息，不予支持
  // 'opus',
  // 'webm', //codec: "OPUS"; container: "EBML/webm"   疑似无法解析出比特率信息，不予支持
  // 'wma', //codec: "Windows Media Audio 9"; container: "ASF/audio"   浏览器不支持，需软解，不予支持
]
export const AudioFormat = [
  'mp3',
  'aac',
  'm4a',
  'flac',
  'ape',
  'alac',
  'wav',
  'wma',
  'ogg',
  'opus',
  'webm',
  'wave',
  'aiff',
  'aif',
  'dsd',
  'dff',
  'dsf',
]
/** 无损编码白名单（大小写不敏感） */
export const LOSSLESS_CODECS = ['flac', 'wav', 'wave', 'alac', 'ape', 'aiff', 'aif', 'dsd', 'dff', 'dsf']

export const AudioCodecs = ['MPEG 1 Layer 3', 'MPEG-4/AAC', 'FLAC', 'PCM']

export const DefaultVolume = 50

export const DefaultKey = {
  /** 本地列表 */
  Local: 'local',
  /** 歌手列表 */
  Artist: 'artist',
  /** 专辑列表 */
  Album: 'album',
  /** 文件夹列表 */
  Folder: 'folder',
  /** 收藏列表 */
  Favorite: 'favorite',
  /** 设置 */
  Settings: 'settings',
}

export enum PlayMode {
  /** 列表循环 */
  REPEAT_ALL = 'repeat_all',
  /** 随机播放 */
  SHUFFLE = 'shuffle',
  /** 单曲循环 */
  REPEAT_ONE = 'repeat_one',
  /** 顺序播放 */
  // SEQUENCE = 'sequence',
}

export enum PanelEnum {
  PlaylistAction = 'playlistAction',
  SongAction = 'songAction',
  SortMode = 'sortMode',
}

export enum ModalEnum {
  AddToPlaylist = 'addToPlaylist',
  SongInfo = 'songInfo',
}

/** 主菜单项配置 */
export const MainMenuItems: IMainMenuItem[] = [
  {
    id: DefaultKey.Local,
    name: '本地音乐',
    count: 0,
    iconNode: IconEnum.ListMusic,
    path: '/',
  },
  {
    id: DefaultKey.Artist,
    name: '艺人',
    count: 0,
    iconNode: IconEnum.User,
    path: '/artist',
  },
  {
    id: DefaultKey.Album,
    name: '专辑',
    count: 0,
    iconNode: IconEnum.Disc,
    path: '/album',
  },
  {
    id: DefaultKey.Folder,
    name: '文件夹',
    count: 0,
    iconNode: IconEnum.Folder,
    path: '/folder',
  },
  {
    id: DefaultKey.Favorite,
    name: '我的收藏',
    count: 0,
    iconNode: IconEnum.Heart,
    path: '/favorite',
  },
  // {
  //   id: DefaultKey.Settings,
  //   name: '设置',
  //   count: 0,
  //   iconNode: IconEnum.Settings,
  //   path: '/settings',
  // },
  // {
  //   id: "recent" as const,
  //   name: "最近播放",
  //   icon: "icon-recent",
  //   iconChar: "⏱️",
  //   count: 0,
  // },

  // {
  //   id: "downloaded" as const,
  //   name: "已下载",
  //   icon: "icon-download",
  //   iconChar: "⬇️",
  //   count: 0,
  // },
  // {
  //   id: "playlist" as const,
  //   name: "我的歌单",
  //   icon: "icon-playlist",
  //   iconChar: "📃",
  // },
]
export type TMainMenuItemIds = (typeof MainMenuItems)[number]['id'] | ''
export type TMainMenuItem = {
  id: TMainMenuItemIds
  name: string
  icon: string
  iconChar: string
  count?: number
}

/** 排序方式配置 */
export const SortTypeItems = [
  { label: '歌曲名', value: 'title' },
  { label: '歌手', value: 'artist' },
  { label: '文件名', value: 'fileName' },
  { label: '添加时间', value: 'addTime' },
]
export type SortTypeItemsIds = (typeof SortTypeItems)[number]['value']
