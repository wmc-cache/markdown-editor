const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

class MarkdownEditor {
  constructor() {
    this.mainWindow = null;
    this.currentFile = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    this.mainWindow.loadFile('src/index.html');

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.setupMenu();
    this.setupIpcHandlers();
  }

  setupMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.newFile()
          },
          {
            label: '打开',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openFile()
          },
          {
            label: '打开文件夹',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.openFolder()
          },
          { type: 'separator' },
          {
            label: '保存',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.saveFile()
          },
          {
            label: '另存为',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.saveFileAs()
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectall', label: '全选' }
        ]
      },
      {
        label: 'AI优化',
        submenu: [
          {
            label: 'DeepSeek 优化选中文本',
            accelerator: 'CmdOrCtrl+Alt+O',
            click: () => this.optimizeSelectedText()
          },
          {
            label: 'DeepSeek 优化全文',
            accelerator: 'CmdOrCtrl+Alt+A',
            click: () => this.optimizeAllText()
          },
          { type: 'separator' },
          {
            label: 'API 设置',
            click: () => this.showApiSettings()
          }
        ]
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '刷新' },
          { role: 'forcereload', label: '强制刷新' },
          { role: 'toggledevtools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetzoom', label: '实际大小' },
          { role: 'zoomin', label: '放大' },
          { role: 'zoomout', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about', label: '关于' },
          { type: 'separator' },
          { role: 'services', label: '服务' },
          { type: 'separator' },
          { role: 'hide', label: '隐藏' },
          { role: 'hideothers', label: '隐藏其他' },
          { role: 'unhide', label: '显示全部' },
          { type: 'separator' },
          { role: 'quit', label: '退出' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    ipcMain.handle('save-file-dialog', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: '保存文件',
        defaultPath: 'untitled.md',
        filters: [
          { name: 'Markdown文件', extensions: ['md', 'markdown'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });

    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: '打开文件',
        filters: [
          { name: 'Markdown文件', extensions: ['md', 'markdown'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      return result;
    });

    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.currentFile = filePath;
        this.mainWindow.setTitle(`Markdown Editor - ${path.basename(filePath)}`);
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('write-file', async (event, filePath, content) => {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
        this.currentFile = filePath;
        this.mainWindow.setTitle(`Markdown Editor - ${path.basename(filePath)}`);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('show-folder-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: '选择文件夹',
        properties: ['openDirectory']
      });
      return result;
    });

    ipcMain.handle('read-directory', async (event, dirPath) => {
      try {
        return { success: true, files: this.readDirectoryRecursive(dirPath) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('show-in-folder', async (event, filePath) => {
      try {
        shell.showItemInFolder(filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async newFile() {
    this.currentFile = null;
    this.mainWindow.setTitle('Markdown Editor - 新建文档');
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
        this.currentFile = filePath;
        this.mainWindow.setTitle(`Markdown Editor - ${path.basename(filePath)}`);
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

  optimizeSelectedText() {
    this.mainWindow.webContents.send('optimize-selected-text');
  }

  optimizeAllText() {
    this.mainWindow.webContents.send('optimize-all-text');
  }

  showApiSettings() {
    this.mainWindow.webContents.send('show-api-settings');
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
}

const editor = new MarkdownEditor();

app.whenReady().then(() => {
  editor.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      editor.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  // 在这里可以添加保存确认逻辑
});