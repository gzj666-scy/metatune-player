/** IPC channel 常量：preload 与 ipcMain 共用，避免字符串散落 */
export const IPC = {
  // 应用
  APP_INFO: 'app:info',
  APP_SET_TITLE: 'app:set-title',
  APP_FLUSH: 'app:flush', // main -> renderer：退出前请求保存
  APP_FLUSHED: 'app:flushed', // renderer -> main：保存完成

  // 窗口
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // 对话框
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_OPEN_DIRECTORY: 'dialog:open-directory',

  // 音频
  AUDIO_IMPORT: 'audio:import', // 导入（文件或目录，支持批量+进度）
  AUDIO_IMPORT_PROGRESS: 'audio:import-progress', // main -> renderer
  AUDIO_SCAN_DIRS: 'audio:scan-dirs', // 增量扫描已监视目录
  AUDIO_STREAM_URL: 'audio:stream-url',

  // 缓存
  CACHE_GET_SONGS: 'cache:get-songs',
  CACHE_SET_SONGS: 'cache:set-songs',
  CACHE_GET_PLAYER: 'cache:get-player',
  CACHE_SET_PLAYER: 'cache:set-player',
  CACHE_RESET_ALL: 'cache:reset-all',
  CACHE_CLEAR_INVALID_ALBUM_ART: 'cache:clear-invalid-album-art',

  // 更新
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_STATUS: 'update:status', // main -> renderer
  UPDATE_PROGRESS: 'update:progress', // main -> renderer
} as const
