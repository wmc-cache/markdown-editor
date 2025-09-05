const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  showSaveDialog: () => ipcRenderer.invoke('save-file-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  // 事件监听
  onNewFile: (callback) => ipcRenderer.on('new-file', callback),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  onSaveFile: (callback) => ipcRenderer.on('save-file', (event, filePath) => callback(filePath)),
  onSaveFileAs: (callback) => ipcRenderer.on('save-file-as', (event, filePath) => callback(filePath)),
  
  // AI优化功能
  onOptimizeSelectedText: (callback) => ipcRenderer.on('optimize-selected-text', callback),
  onOptimizeAllText: (callback) => ipcRenderer.on('optimize-all-text', callback),
  onShowApiSettings: (callback) => ipcRenderer.on('show-api-settings', callback),
  
  // 文件夹功能
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  onFolderOpened: (callback) => ipcRenderer.on('folder-opened', (event, data) => callback(data)),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 暴露存储API
contextBridge.exposeInMainWorld('storageAPI', {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('存储失败:', error);
      return false;
    }
  },
  
  getItem: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('读取失败:', error);
      return null;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('删除失败:', error);
      return false;
    }
  }
});