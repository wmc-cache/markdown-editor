const { ipcMain, dialog, shell } = require('electron');
const { readFile, writeFile, readDirectoryRecursive } = require('./file-operations');
const path = require('path');

function setupIpcHandlers() {
  // 文件对话框
  ipcMain.handle('save-file-dialog', async () => {
    const windowManager = global.windowManager;
    if (!windowManager || !windowManager.getWindow()) return;
    
    const result = await dialog.showSaveDialog(windowManager.getWindow(), {
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
    const windowManager = global.windowManager;
    if (!windowManager || !windowManager.getWindow()) return;
    
    const result = await dialog.showOpenDialog(windowManager.getWindow(), {
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

  // 文件操作
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const content = readFile(filePath);
      const windowManager = global.windowManager;
      if (windowManager) {
        windowManager.setCurrentFile(filePath);
      }
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
      writeFile(filePath, content);
      const windowManager = global.windowManager;
      if (windowManager) {
        windowManager.setCurrentFile(filePath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 文件夹操作
  ipcMain.handle('show-folder-dialog', async () => {
    const windowManager = global.windowManager;
    if (!windowManager || !windowManager.getWindow()) return;
    
    const result = await dialog.showOpenDialog(windowManager.getWindow(), {
      title: '选择文件夹',
      properties: ['openDirectory']
    });
    return result;
  });

  ipcMain.handle('read-directory', async (event, dirPath) => {
    try {
      return { success: true, files: readDirectoryRecursive(dirPath) };
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

module.exports = { setupIpcHandlers };