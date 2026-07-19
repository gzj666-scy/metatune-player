const fs = require('fs')
const path = require('path')

exports.default = async function (context) {
  // 获取 locales 目录路径
  const localeDir = path.join(context.appOutDir, 'locales')

  // 检查目录是否存在
  if (!fs.existsSync(localeDir)) {
    console.log('locales directory not found, skipping...')
    return
  }

  // 读取目录中的所有文件
  const files = fs.readdirSync(localeDir)

  // 定义需要保留的语言文件
  // 注意：某些Electron版本可能使用 en-US.pak，请根据实际情况调整
  const keepPatterns = [/^en-US\.pak$/, /^zh-CN\.pak$/, /^zh-TW\.pak$/]

  // 遍历并删除不需要的文件
  for (const file of files) {
    // 检查文件是否匹配任一个保留模式
    const shouldKeep = keepPatterns.some(pattern => pattern.test(file))

    if (!shouldKeep) {
      const filePath = path.join(localeDir, file)
      fs.unlinkSync(filePath)
      console.log(`Deleted: ${file}`)
    }
  }

  console.log('Language files cleanup completed.')
}
