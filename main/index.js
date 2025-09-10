const { app, BrowserWindow } = require('electron');
const WindowManager = require('./window');
const { setupIpcHandlers } = require('./ipc-handlers');

class MarkdownEditorApp {
  constructor() {
    this.windowManager = null;
    this.init();
  }

  init() {
    // 设置 IPC 处理器（只设置一次）
    setupIpcHandlers();
    
    // 应用准备就绪
    app.whenReady().then(() => {
      this.createWindow();
      
      app.on('activate', () => {
        // macOS 上当点击 dock 图标时，如果没有窗口则创建一个
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    // 所有窗口关闭时的处理
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 退出前的处理
    app.on('before-quit', (event) => {
      // 可以在这里添加保存确认逻辑
    });
  }

  createWindow() {
    if (!this.windowManager) {
      this.windowManager = new WindowManager();
    }
    this.windowManager.createWindow();
  }
}

// 创建应用实例
new MarkdownEditorApp();