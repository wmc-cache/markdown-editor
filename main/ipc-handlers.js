const { ipcMain, dialog, shell, safeStorage, app } = require('electron');
const { readFile, writeFile, readDirectoryRecursive } = require('./file-operations');
const path = require('path');
const fs = require('fs');

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

  // 安全存储处理器
  const secureStorageFile = path.join(app.getPath('userData'), 'secure-storage.json');

  // 获取安全存储的数据
  ipcMain.handle('secure-storage-get', async (event, key) => {
    try {
      if (!fs.existsSync(secureStorageFile)) {
        return { success: true, data: null };
      }

      const encryptedData = fs.readFileSync(secureStorageFile, 'utf8');
      const parsedData = JSON.parse(encryptedData);

      if (!parsedData[key]) {
        return { success: true, data: null };
      }

      // 检查 safeStorage 是否可用
      if (!safeStorage.isEncryptionAvailable()) {
        return { success: false, error: '加密功能不可用' };
      }

      // 解密数据
      const buffer = Buffer.from(parsedData[key], 'base64');
      const decryptedData = safeStorage.decryptString(buffer);

      return { success: true, data: decryptedData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 安全存储数据
  ipcMain.handle('secure-storage-set', async (event, key, value) => {
    try {
      // 检查 safeStorage 是否可用
      if (!safeStorage.isEncryptionAvailable()) {
        return { success: false, error: '加密功能不可用' };
      }

      // 读取现有数据
      let data = {};
      if (fs.existsSync(secureStorageFile)) {
        const existingData = fs.readFileSync(secureStorageFile, 'utf8');
        data = JSON.parse(existingData);
      }

      // 加密新数据
      const encryptedBuffer = safeStorage.encryptString(value);
      data[key] = encryptedBuffer.toString('base64');

      // 保存到文件
      fs.writeFileSync(secureStorageFile, JSON.stringify(data, null, 2));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 删除安全存储的数据
  ipcMain.handle('secure-storage-delete', async (event, key) => {
    try {
      if (!fs.existsSync(secureStorageFile)) {
        return { success: true };
      }

      const existingData = fs.readFileSync(secureStorageFile, 'utf8');
      const data = JSON.parse(existingData);

      delete data[key];

      fs.writeFileSync(secureStorageFile, JSON.stringify(data, null, 2));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 检查加密是否可用
  ipcMain.handle('secure-storage-available', async () => {
    return { success: true, available: safeStorage.isEncryptionAvailable() };
  });
}

module.exports = { setupIpcHandlers };