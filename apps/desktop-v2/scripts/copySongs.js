const fs = require('fs')
// const fs = require('fs').promises;
const path = require('path')

const cacheDir = 'C:/Users/scy/AppData/Roaming/Metatune Player/.cache'
const baseDir = 'D:/资料库/音乐/NEW Music'
// 不支持访问外接usb安卓设备
// const toDir = '此电脑/荣耀平板GT Pro/内部存储/Music'
const toDir = 'Music'
// phone, pad, car
const sourceListName = 'phone'

let songData = {}
let playlistData = {}

const readJson = filePath => {
  return new Promise(resolve => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(filePath, '读取文件错误', err)
        resolve(null)
        return
      }
      if (data.toString()) {
        resolve(JSON.parse(data.toString()))
      } else {
        resolve(null)
      }
    })
  })
}

const copyFile = (sourcePath, targetPath) => {
  return new Promise(resolve => {
    fs.cp(sourcePath, targetPath, { recursive: false }, err => {
      if (err) {
        console.log('复制错误', filePath, err)
      }
      resolve()
    })
  })
}

/**
 * 获取文件相对于基础目录的路径（始终使用正斜杠 '/' 作为分隔符）
 * @param {string} filePath - 文件的绝对路径
 * @param {string} baseDir  - 基础目录的绝对路径
 * @returns {string} 相对路径，如 '1/曲/Adrián Berenguer - Red Dress.flac'
 */
const getRelativePath = (filePath, baseDir) => {
  // 1. 将路径规范化至当前系统的格式（Windows 下转为反斜杠）
  const normalizedFile = path.normalize(filePath)
  const normalizedBase = path.normalize(baseDir)

  // 2. 计算相对路径（系统默认分隔符）
  const relativePath = path.relative(normalizedBase, normalizedFile)

  // 3. 将分隔符统一转换为正斜杠，以便跨平台一致
  return relativePath.split(path.sep).join('/')
}

const run = async () => {
  let temp = await readJson(path.join(cacheDir, 'metatune-data.json'))
  if (temp) songData = temp

  temp = await readJson(path.join(cacheDir, 'player-data.json'))
  if (temp) playlistData = temp

  if (!songData || !playlistData) return

  let playlistIds
  for (const key in playlistData.playlists) {
    const playlist = playlistData.playlists[key]
    if (playlist.name === sourceListName) {
      playlistIds = playlist.songIds
    }
  }

  for (let i = 0; i < playlistIds.length; i++) {
    const id = playlistIds[i]
    const song = songData.find(v => v.uid === id)
    if (song) {
      const relativePath = getRelativePath(song.filePath, baseDir)
      const targetPath = path.join(toDir, relativePath)

      await copyFile(song.filePath, targetPath)
    }
  }
}

run()
