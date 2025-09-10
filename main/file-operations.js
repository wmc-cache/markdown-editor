const fs = require('fs');
const path = require('path');

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 写入文件内容
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 */
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 检查是否是 Markdown 文件
 * @param {string} filename - 文件名
 * @returns {boolean} 是否是 Markdown 文件
 */
function isMarkdownFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.md', '.markdown', '.txt'].includes(ext);
}

/**
 * 递归读取目录结构
 * @param {string} dirPath - 目录路径
 * @param {string} relativePath - 相对路径
 * @returns {Array} 文件树结构
 */
function readDirectoryRecursive(dirPath, relativePath = '') {
  const files = [];
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const itemRelativePath = path.join(relativePath, item);
    
    try {
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // 递归读取子文件夹
        const subFiles = readDirectoryRecursive(fullPath, itemRelativePath);
        if (subFiles.length > 0) {
          files.push({
            name: item,
            path: fullPath,
            relativePath: itemRelativePath,
            type: 'directory',
            children: subFiles
          });
        }
      } else if (stats.isFile() && isMarkdownFile(item)) {
        files.push({
          name: item,
          path: fullPath,
          relativePath: itemRelativePath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime
        });
      }
    } catch (error) {
      // 忽略无法访问的文件
      console.error(`无法访问文件 ${fullPath}:`, error.message);
    }
  });

  return files;
}

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Object} 文件信息
 */
function getFileInfo(filePath) {
  const stats = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    dir: path.dirname(filePath),
    ext: path.extname(filePath),
    size: stats.size,
    modified: stats.mtime,
    created: stats.birthtime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile()
  };
}

module.exports = {
  readFile,
  writeFile,
  fileExists,
  isMarkdownFile,
  readDirectoryRecursive,
  getFileInfo
};