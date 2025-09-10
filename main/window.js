const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { createMenu } = require('./menu');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.currentFile = null;
  }

  createWindow() {
    // 创建浏览器窗口
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '..', 'preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    // 加载 HTML 文件
    this.mainWindow.loadFile('src/index.html');

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // 窗口关闭时清理
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 设置菜单
    createMenu(this);
    
    // 将窗口管理器实例存储在全局，供 IPC 处理器使用
    global.windowManager = this;
  }

  getWindow() {
    return this.mainWindow;
  }

  setCurrentFile(filePath) {
    this.currentFile = filePath;
    if (this.mainWindow) {
      this.mainWindow.setTitle(`Markdown Editor - ${path.basename(filePath)}`);
    }
  }

  getCurrentFile() {
    return this.currentFile;
  }

  resetTitle() {
    if (this.mainWindow) {
      this.mainWindow.setTitle('Markdown Editor - 新建文档');
    }
    this.currentFile = null;
  }

  // 文件操作方法
  async newFile() {
    this.resetTitle();
    this.mainWindow.webContents.send('new-file');
  }

  async openFile() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: '打开文件',
      filters: [
        { name: 'Markdown文件', extensions: ['md', 'markdown'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.setCurrentFile(filePath);
        this.mainWindow.webContents.send('file-opened', { filePath, content });
      } catch (error) {
        dialog.showErrorBox('错误', `无法打开文件: ${error.message}`);
      }
    }
  }

  async saveFile() {
    if (this.currentFile) {
      this.mainWindow.webContents.send('save-file', this.currentFile);
    } else {
      this.saveFileAs();
    }
  }

  async saveFileAs() {
    const result = await dialog.showSaveDialog(this.mainWindow, {
      title: '另存为',
      defaultPath: 'untitled.md',
      filters: [
        { name: 'Markdown文件', extensions: ['md', 'markdown'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      this.mainWindow.webContents.send('save-file-as', result.filePath);
    }
  }

  async openFolder() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: '选择文件夹',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      try {
        const files = this.readDirectoryRecursive(folderPath);
        this.mainWindow.webContents.send('folder-opened', { folderPath, files });
      } catch (error) {
        dialog.showErrorBox('错误', `无法打开文件夹: ${error.message}`);
      }
    }
  }

  readDirectoryRecursive(dirPath, relativePath = '') {
    const files = [];
    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // 递归读取子文件夹
        const subFiles = this.readDirectoryRecursive(fullPath, itemRelativePath);
        if (subFiles.length > 0) {
          files.push({
            name: item,
            path: fullPath,
            relativePath: itemRelativePath,
            type: 'directory',
            children: subFiles
          });
        }
      } else if (stats.isFile() && this.isMarkdownFile(item)) {
        files.push({
          name: item,
          path: fullPath,
          relativePath: itemRelativePath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime
        });
      }
    });

    return files;
  }

  isMarkdownFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.md', '.markdown', '.txt'].includes(ext);
  }

  // AI 功能
  optimizeSelectedText() {
    this.mainWindow.webContents.send('optimize-selected-text');
  }

  optimizeAllText() {
    this.mainWindow.webContents.send('optimize-all-text');
  }

  showApiSettings() {
    this.mainWindow.webContents.send('show-api-settings');
  }
}

module.exports = WindowManager;