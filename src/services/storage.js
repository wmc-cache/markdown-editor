/**
 * 本地存储服务
 * 封装 localStorage 操作，提供统一的存储接口
 * 对于敏感数据（如 API Keys），使用安全存储
 */
class StorageService {
  constructor(prefix = 'markdownEditor') {
    this.prefix = prefix;
    this.storage = window.storageAPI || this.createFallbackStorage();
    this.secureStorage = window.secureStorageAPI;
  }

  // 创建备用存储方案
  createFallbackStorage() {
    return {
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
    };
  }

  // 生成带前缀的键名
  getKey(key) {
    return `${this.prefix}.${key}`;
  }

  // 保存数据
  set(key, value) {
    return this.storage.setItem(this.getKey(key), value);
  }

  // 读取数据
  get(key, defaultValue = null) {
    const value = this.storage.getItem(this.getKey(key));
    return value !== null ? value : defaultValue;
  }

  // 删除数据
  remove(key) {
    return this.storage.removeItem(this.getKey(key));
  }

  // 清空所有相关数据
  clear() {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // 保存设置
  saveSettings(settings) {
    return this.set('settings', settings);
  }

  // 读取设置
  loadSettings() {
    return this.get('settings', {});
  }

  // 保存编辑器状态
  saveEditorState(state) {
    return this.set('editorState', state);
  }

  // 读取编辑器状态
  loadEditorState() {
    return this.get('editorState', null);
  }

  // 保存最近文件列表
  saveRecentFiles(files) {
    return this.set('recentFiles', files);
  }

  // 读取最近文件列表
  loadRecentFiles() {
    return this.get('recentFiles', []);
  }

  // 添加最近文件
  addRecentFile(filePath) {
    let recentFiles = this.loadRecentFiles();
    
    // 移除已存在的相同路径
    recentFiles = recentFiles.filter(f => f !== filePath);
    
    // 添加到开头
    recentFiles.unshift(filePath);
    
    // 保持最多10个
    if (recentFiles.length > 10) {
      recentFiles = recentFiles.slice(0, 10);
    }
    
    this.saveRecentFiles(recentFiles);
    return recentFiles;
  }

  // 保存窗口状态
  saveWindowState(state) {
    return this.set('windowState', state);
  }

  // 读取窗口状态
  loadWindowState() {
    return this.get('windowState', null);
  }

  // 保存自定义快捷键
  saveShortcuts(shortcuts) {
    return this.set('shortcuts', shortcuts);
  }

  // 读取自定义快捷键
  loadShortcuts() {
    return this.get('shortcuts', {});
  }

  // 保存 API 设置（使用安全存储）
  async saveApiSettings(settings) {
    try {
      // 创建设置副本，分离敏感数据
      const settingsCopy = JSON.parse(JSON.stringify(settings));
      const sensitiveData = {};

      // 提取并清除敏感数据
      if (settingsCopy.deepseek && settingsCopy.deepseek.apiKey) {
        sensitiveData['deepseek.apiKey'] = settingsCopy.deepseek.apiKey;
        settingsCopy.deepseek.apiKey = '';
      }
      if (settingsCopy.zhipu && settingsCopy.zhipu.apiKey) {
        sensitiveData['zhipu.apiKey'] = settingsCopy.zhipu.apiKey;
        settingsCopy.zhipu.apiKey = '';
      }

      // 保存非敏感数据到普通存储
      this.set('apiSettings', settingsCopy);

      // 保存敏感数据到安全存储
      if (this.secureStorage && Object.keys(sensitiveData).length > 0) {
        const isAvailable = await this.secureStorage.isAvailable();
        if (isAvailable.success && isAvailable.available) {
          for (const [key, value] of Object.entries(sensitiveData)) {
            if (value) {
              await this.secureStorage.setItem(`apiSettings.${key}`, value);
            }
          }
        } else {
          console.warn('安全存储不可用，API Keys 将使用普通存储');
          // 如果安全存储不可用，保存完整设置到普通存储
          this.set('apiSettings', settings);
        }
      }

      return true;
    } catch (error) {
      console.error('保存 API 设置失败:', error);
      // 回退到普通存储
      return this.set('apiSettings', settings);
    }
  }

  // 读取 API 设置（从安全存储和普通存储）
  async loadApiSettings() {
    try {
      // 默认设置
      const defaultSettings = {
        provider: 'deepseek',
        deepseek: {
          apiKey: '',
          endpoint: 'https://api.deepseek.com/chat/completions',
          model: 'deepseek-chat',
          systemPrompt: '你是一个专业的文本优化助手。请帮我优化以下文本，让它更清晰、准确、易懂。保持原文的主要意思，但可以改进表达方式、语法和结构。'
        },
        zhipu: {
          apiKey: '',
          endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          model: 'glm-4.5',
          systemPrompt: '你是一个专业的文本优化助手。请帮我优化以下文本，让它更清晰、准确、易懂。保持原文的主要意思，但可以改进表达方式、语法和结构。'
        },
        systemPrompt: '你是一个专业的文本优化助手。请帮我优化以下文本，让它更清晰、准确、易懂。保持原文的主要意思，但可以改进表达方式、语法和结构。'
      };

      // 读取非敏感数据
      const storedSettings = this.get('apiSettings', defaultSettings);

      // 读取敏感数据
      if (this.secureStorage) {
        const isAvailable = await this.secureStorage.isAvailable();
        if (isAvailable.success && isAvailable.available) {
          try {
            // 读取 DeepSeek API Key
            const deepseekResult = await this.secureStorage.getItem('apiSettings.deepseek.apiKey');
            if (deepseekResult.success && deepseekResult.data) {
              storedSettings.deepseek.apiKey = deepseekResult.data;
            }

            // 读取智谱 API Key
            const zhipuResult = await this.secureStorage.getItem('apiSettings.zhipu.apiKey');
            if (zhipuResult.success && zhipuResult.data) {
              storedSettings.zhipu.apiKey = zhipuResult.data;
            }
          } catch (error) {
            console.warn('读取安全存储的 API Keys 失败:', error);
          }
        }
      }

      return storedSettings;
    } catch (error) {
      console.error('读取 API 设置失败:', error);
      return this.get('apiSettings', {});
    }
  }
  
  // 获取当前使用的 API 配置
  async getCurrentApiConfig() {
    const settings = await this.loadApiSettings();
    const provider = settings.provider || 'deepseek';
    return {
      provider: provider,
      config: settings[provider],
      systemPrompt: settings.systemPrompt
    };
  }

  // 导出所有设置
  exportSettings() {
    const settings = {
      settings: this.loadSettings(),
      apiSettings: this.loadApiSettings(),
      shortcuts: this.loadShortcuts(),
      recentFiles: this.loadRecentFiles()
    };
    return JSON.stringify(settings, null, 2);
  }

  // 导入设置
  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      
      if (imported.settings) {
        this.saveSettings(imported.settings);
      }
      if (imported.apiSettings) {
        this.saveApiSettings(imported.apiSettings);
      }
      if (imported.shortcuts) {
        this.saveShortcuts(imported.shortcuts);
      }
      if (imported.recentFiles) {
        this.saveRecentFiles(imported.recentFiles);
      }
      
      return true;
    } catch (error) {
      console.error('导入设置失败:', error);
      return false;
    }
  }
}

// 创建单例实例并挂载到全局对象
window.storageService = new StorageService();