/**
 * 主应用程序入口
 * 使用模块化组件重构后的版本
 */

class MarkdownEditorApp {
  constructor() {
    // 组件实例
    this.editor = null;
    this.preview = null;
    this.fileTree = null;
    this.tabManager = null;
    this.themeSelector = null;
    
    // Markdown 解析器
    this.markdownParser = null;
    
    // 应用状态
    this.currentFile = null;
    this.isDirty = false;
    this.isPreviewVisible = true;
    
    // API 设置
    this.apiSettings = window.storageService.loadApiSettings();
    
    // 优化数据
    this.optimizationData = {
      originalText: '',
      optimizedText: '',
      isSelectedText: false,
      selectionStart: 0,
      selectionEnd: 0
    };
    
    this.init();
  }
  
  async init() {
    // 初始化 Markdown 解析器
    this.markdownParser = window.markdownUtils.initMarkdownParser();
    
    // 初始化组件
    this.initComponents();
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 加载保存的设置
    this.loadSettings();
    
    // 初始化界面状态
    this.updateUI();
    
    // 设置对比模态框
    this.setupComparisonModal();
  }
  
  initComponents() {
    // 初始化编辑器
    const editorContainer = document.getElementById('editor');
    this.editor = new window.Editor(editorContainer, (content) => {
      this.onContentChange(content);
    });
    
    this.editor.setOnSelectionChange((selection) => {
      this.updateUI();
    });
    
    // 初始化预览
    const previewContainer = document.getElementById('preview');
    this.preview = new window.Preview(previewContainer, this.markdownParser);
    
    // 初始化文件树
    const fileTreeContainer = document.getElementById('fileTree');
    this.fileTree = new window.FileTree(fileTreeContainer, async (filePath) => {
      await this.openFileFromTree(filePath);
    });
    
    this.fileTree.setOnFolderOpen(() => this.openFolder());
    
    // 初始化标签页管理器
    this.tabManager = new window.TabManager(document.getElementById('tabs'), (tab) => {
      this.onTabChange(tab);
    });
    
    this.tabManager.setOnBeforeTabSwitch((tabId) => {
      this.saveCurrentTabContent(tabId);
    });
    
    this.tabManager.setOnBeforeTabClose(async (tab) => {
      if (tab.isDirty) {
        return confirm(`文档 "${tab.title}" 有未保存的更改。确定要关闭吗？`);
      }
      return true;
    });
    
    this.tabManager.setOnAllTabsClosed(() => {
      this.showEmptyState();
    });
    
    // 初始化主题选择器
    this.themeSelector = new window.ThemeSelector();
    
    this.themeSelector.setOnThemeChange((themeId) => {
      this.saveSettings();
    });
    
    // 初始化分隔条
    this.setupResizer();
  }
  
  setupEventListeners() {
    // 工具栏按钮
    document.getElementById('optimizeSelectedBtn').addEventListener('click', () => this.optimizeSelectedText());
    document.getElementById('optimizeAllBtn').addEventListener('click', () => this.optimizeAllText());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showApiSettings());
    
    // API 设置模态框
    const modal = document.getElementById('apiSettingsModal');
    const closeModal = document.getElementById('closeModal');
    const saveSettings = document.getElementById('saveSettings');
    const testApi = document.getElementById('testApi');
    
    closeModal.addEventListener('click', () => this.hideApiSettings());
    saveSettings.addEventListener('click', () => this.saveApiSettings());
    testApi.addEventListener('click', () => this.testApiConnection());
    
    // 文件树按钮
    document.getElementById('openFolderFromTree').addEventListener('click', () => this.openFolder());
    
    // 预览面板按钮
    document.getElementById('closePreview').addEventListener('click', () => this.hidePreview());
    document.getElementById('showPreview').addEventListener('click', () => this.showPreview());
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideApiSettings();
      }
    });
    
    // Electron IPC 事件
    if (window.electronAPI) {
      window.electronAPI.onNewFile(() => this.newFile());
      window.electronAPI.onFileOpened((data) => this.loadFileContent(data));
      window.electronAPI.onSaveFile((filePath) => this.saveFileToPath(filePath));
      window.electronAPI.onSaveFileAs((filePath) => this.saveFileToPath(filePath));
      window.electronAPI.onOptimizeSelectedText(() => this.optimizeSelectedText());
      window.electronAPI.onOptimizeAllText(() => this.optimizeAllText());
      window.electronAPI.onShowApiSettings(() => this.showApiSettings());
      window.electronAPI.onFolderOpened((data) => this.fileTree.loadFolder(data));
    }
    
    // 键盘快捷键
    this.setupKeyboardShortcuts();
    
    // 拖拽文件支持
    this.setupDragAndDrop();
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
          case 'o':
            e.preventDefault();
            if (e.shiftKey) {
              this.openFolder();
            } else {
              this.openFile();
            }
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              this.saveFileAs();
            } else {
              this.saveFile();
            }
            break;
          case 'k':
            if (e.altKey) {
              e.preventDefault();
              if (e.shiftKey) {
                this.optimizeAllText();
              } else {
                this.optimizeSelectedText();
              }
            }
            break;
        }
      }
    });
  }
  
  setupDragAndDrop() {
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.type.startsWith('text/')) {
          const content = await this.readFileAsText(file);
          this.loadContent(content, file.name);
        }
      }
    });
  }
  
  setupResizer() {
    const resizer = document.getElementById('resizer');
    const editorPanel = document.querySelector('.editor-panel');
    const previewPanel = document.querySelector('.preview-panel');
    
    let isResizing = false;
    let startX = 0;
    let startEditorWidth = 0;
    
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      const containerRect = document.querySelector('.main-content').getBoundingClientRect();
      const editorRect = editorPanel.getBoundingClientRect();
      startEditorWidth = ((editorRect.width / containerRect.width) * 100);
      
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizer.classList.add('resizing');
      
      const handleMouseMove = (e) => {
        if (!isResizing) return;
        e.preventDefault();
        
        const containerRect = document.querySelector('.main-content').getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const deltaPercentage = (deltaX / containerRect.width) * 100;
        const newPercentage = Math.max(25, Math.min(75, startEditorWidth + deltaPercentage));
        
        editorPanel.style.flex = `0 0 ${newPercentage}%`;
        previewPanel.style.flex = `0 0 ${100 - newPercentage}%`;
      };
      
      const handleMouseUp = () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        resizer.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }
  
  // 内容变化处理
  onContentChange(content) {
    this.isDirty = true;
    this.preview.update(content);
    this.updateUI();
    
    // 更新当前标签页
    if (this.tabManager.getCurrentTab()) {
      this.tabManager.updateCurrentTab({ 
        content: content,
        isDirty: true 
      });
    }
  }
  
  // 标签页切换处理
  onTabChange(tab) {
    this.currentFile = tab.filePath;
    this.isDirty = tab.isDirty;
    this.editor.setContent(tab.content);
    this.preview.update(tab.content);
    this.updateUI();
  }
  
  // 保存当前标签页内容
  saveCurrentTabContent(tabId) {
    const tab = this.tabManager.getTab(tabId);
    if (tab) {
      tab.content = this.editor.getContent();
      tab.isDirty = this.isDirty;
    }
  }
  
  // 文件操作
  newFile() {
    this.hideEmptyState();
    this.tabManager.createNewTab();
  }
  
  async openFile() {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileResult = await window.electronAPI.readFile(filePath);
        if (fileResult.success) {
          this.openFileInTab({ filePath, content: fileResult.content });
        } else {
          alert(`打开文件失败: ${fileResult.error}`);
        }
      }
    }
  }
  
  async openFolder() {
    if (window.electronAPI) {
      const result = await window.electronAPI.showFolderDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const dirResult = await window.electronAPI.readDirectory(folderPath);
        if (dirResult.success) {
          this.fileTree.loadFolder({ folderPath, files: dirResult.files });
        } else {
          alert(`打开文件夹失败: ${dirResult.error}`);
        }
      }
    }
  }
  
  async openFileFromTree(filePath) {
    if (window.electronAPI) {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        this.openFileInTab({ filePath, content: result.content });
        this.fileTree.setActiveFile(filePath);
      } else {
        alert(`打开文件失败: ${result.error}`);
      }
    }
  }
  
  openFileInTab({ filePath, content }) {
    this.hideEmptyState();
    const fileName = filePath.split(/[/\\]/).pop() || '未命名文档';
    this.tabManager.openFile({ 
      filePath, 
      content, 
      title: fileName 
    });
  }
  
  loadFileContent({ filePath, content }) {
    this.openFileInTab({ filePath, content });
  }
  
  loadContent(content, fileName = null) {
    this.editor.setContent(content);
    this.currentFile = fileName;
    this.isDirty = false;
    this.updateUI();
  }
  
  async saveFile() {
    const currentTab = this.tabManager.getCurrentTab();
    if (currentTab && currentTab.filePath) {
      await this.saveFileToPath(currentTab.filePath);
    } else {
      await this.saveFileAs();
    }
  }
  
  async saveFileAs() {
    if (window.electronAPI) {
      const result = await window.electronAPI.showSaveDialog();
      if (!result.canceled) {
        await this.saveFileToPath(result.filePath);
      }
    }
  }
  
  async saveFileToPath(filePath) {
    if (window.electronAPI) {
      const content = this.editor.getContent();
      const result = await window.electronAPI.writeFile(filePath, content);
      if (result.success) {
        this.currentFile = filePath;
        this.isDirty = false;
        
        // 更新标签页
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab) {
          const fileName = filePath.split(/[/\\]/).pop() || '未命名文档';
          this.tabManager.updateCurrentTab({
            title: fileName,
            filePath: filePath,
            isDirty: false
          });
        }
        
        // 添加到最近文件
        window.storageService.addRecentFile(filePath);
        
        this.updateUI();
      } else {
        alert(`保存文件失败: ${result.error}`);
      }
    }
  }
  
  // AI 优化功能
  async optimizeSelectedText() {
    const selectedText = this.editor.getSelectedText();
    if (!selectedText) {
      alert('请先选择要优化的文本');
      return;
    }
    
    if (!this.apiSettings.apiKey) {
      alert('请先配置 DeepSeek API Key');
      this.showApiSettings();
      return;
    }
    
    const selection = this.editor.getSelection();
    const optimizedText = await this.callDeepSeekAPI(selectedText);
    if (optimizedText) {
      this.showComparison(selectedText, optimizedText, true, selection.start, selection.end);
    }
  }
  
  async optimizeAllText() {
    const content = this.editor.getContent();
    if (!content.trim()) {
      alert('当前文档为空');
      return;
    }
    
    if (!this.apiSettings.apiKey) {
      alert('请先配置 DeepSeek API Key');
      this.showApiSettings();
      return;
    }
    
    const optimizedText = await this.callDeepSeekAPI(content);
    if (optimizedText) {
      this.showComparison(content, optimizedText, false);
    }
  }
  
  async callDeepSeekAPI(text) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('show');
    
    try {
      const response = await axios.post(this.apiSettings.endpoint, {
        model: this.apiSettings.model,
        messages: [
          {
            role: "system",
            content: this.apiSettings.systemPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiSettings.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('API 响应格式错误');
      }
    } catch (error) {
      console.error('API 调用失败:', error);
      let errorMessage = 'API 调用失败';
      
      if (error.response) {
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.error) {
          errorMessage += ` - ${error.response.data.error.message}`;
        }
      } else if (error.request) {
        errorMessage += ': 网络连接失败';
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
      return null;
    } finally {
      loadingOverlay.classList.remove('show');
    }
  }
  
  // API 设置
  showApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    const apiKey = document.getElementById('apiKey');
    const apiEndpoint = document.getElementById('apiEndpoint');
    const model = document.getElementById('model');
    const systemPrompt = document.getElementById('systemPrompt');
    
    apiKey.value = this.apiSettings.apiKey;
    apiEndpoint.value = this.apiSettings.endpoint;
    model.value = this.apiSettings.model;
    systemPrompt.value = this.apiSettings.systemPrompt;
    
    modal.classList.add('show');
  }
  
  hideApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    modal.classList.remove('show');
  }
  
  saveApiSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
    const model = document.getElementById('model').value;
    const systemPrompt = document.getElementById('systemPrompt').value.trim();
    
    if (!apiKey) {
      alert('请输入 API Key');
      return;
    }
    
    this.apiSettings = {
      apiKey,
      endpoint: apiEndpoint,
      model,
      systemPrompt
    };
    
    window.storageService.saveApiSettings(this.apiSettings);
    this.updateUI();
    this.hideApiSettings();
    
    alert('设置已保存');
  }
  
  async testApiConnection() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
    const model = document.getElementById('model').value;
    
    if (!apiKey) {
      alert('请先输入 API Key');
      return;
    }
    
    const testBtn = document.getElementById('testApi');
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    
    try {
      const response = await axios.post(apiEndpoint, {
        model: model,
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ],
        max_tokens: 10,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.choices) {
        alert('API 连接测试成功！');
      } else {
        alert('API 连接测试失败：响应格式错误');
      }
    } catch (error) {
      console.error('API 测试失败:', error);
      let errorMessage = 'API 连接测试失败';
      
      if (error.response) {
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.error) {
          errorMessage += ` - ${error.response.data.error.message}`;
        }
      } else if (error.request) {
        errorMessage += ': 网络连接失败';
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
    }
  }
  
  // 对比模态框
  setupComparisonModal() {
    document.getElementById('closeComparison').addEventListener('click', () => {
      this.hideComparison();
    });
    
    document.getElementById('rejectChanges').addEventListener('click', () => {
      this.hideComparison();
    });
    
    document.getElementById('applyChanges').addEventListener('click', () => {
      this.applyOptimization();
    });
  }
  
  showComparison(originalText, optimizedText, isSelectedText = false, selectionStart = 0, selectionEnd = 0) {
    this.optimizationData = {
      originalText,
      optimizedText,
      isSelectedText,
      selectionStart,
      selectionEnd
    };
    
    document.getElementById('originalText').textContent = originalText;
    document.getElementById('optimizedText').textContent = optimizedText;
    
    const modal = document.getElementById('comparisonModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
  }
  
  hideComparison() {
    const modal = document.getElementById('comparisonModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  
  applyOptimization() {
    const data = this.optimizationData;
    
    if (data.isSelectedText) {
      this.editor.replaceSelectedText(data.optimizedText);
    } else {
      this.editor.replaceAllContent(data.optimizedText);
    }
    
    this.hideComparison();
  }
  
  // 预览面板操作
  hidePreview() {
    this.isPreviewVisible = false;
    const previewPanel = document.getElementById('previewPanel');
    const resizer = document.getElementById('resizer');
    const showPreviewBtn = document.getElementById('showPreview');
    const editorPanel = document.querySelector('.editor-panel');
    
    previewPanel.style.display = 'none';
    resizer.style.display = 'none';
    showPreviewBtn.style.display = 'inline-block';
    editorPanel.style.flex = '1';
    
    this.saveSettings();
  }
  
  showPreview() {
    this.isPreviewVisible = true;
    const previewPanel = document.getElementById('previewPanel');
    const resizer = document.getElementById('resizer');
    const showPreviewBtn = document.getElementById('showPreview');
    const editorPanel = document.querySelector('.editor-panel');
    
    previewPanel.style.display = 'flex';
    resizer.style.display = 'block';
    showPreviewBtn.style.display = 'none';
    editorPanel.style.flex = '0 0 50%';
    previewPanel.style.flex = '0 0 50%';
    
    this.saveSettings();
  }
  
  // 空状态管理
  showEmptyState() {
    this.editor.setContent('');
    this.currentFile = null;
    this.isDirty = false;
    
    document.getElementById('tabsContainer').style.display = 'none';
    
    this.updateUI();
    this.preview.update('');
  }
  
  hideEmptyState() {
    document.getElementById('tabsContainer').style.display = 'flex';
  }
  
  // UI 更新
  updateUI() {
    this.updateStatus();
    this.updateToolbar();
  }
  
  updateStatus() {
    const fileStatus = document.getElementById('fileStatus');
    const wordCount = document.getElementById('wordCount');
    const lineCount = document.getElementById('lineCount');
    
    if (!this.editor || !fileStatus || !wordCount || !lineCount) {
      return;
    }
    
    const stats = this.editor.getStats();
    const currentTab = this.tabManager ? this.tabManager.getCurrentTab() : null;
    
    const fileName = currentTab ? currentTab.title : '新建文档';
    fileStatus.textContent = fileName + (this.isDirty ? ' *' : '');
    
    wordCount.textContent = `${stats.charCount} 字符`;
    lineCount.textContent = `第 ${stats.currentLine} 行 / 共 ${stats.lineCount} 行`;
  }
  
  updateToolbar() {
    if (!this.editor) {
      return;
    }
    
    const selection = this.editor.getSelection();
    const content = this.editor.getContent();
    
    const optimizeSelectedBtn = document.getElementById('optimizeSelectedBtn');
    const optimizeAllBtn = document.getElementById('optimizeAllBtn');
    
    if (optimizeSelectedBtn) {
      optimizeSelectedBtn.disabled = !selection.hasSelection || !this.apiSettings.apiKey;
    }
    
    if (optimizeAllBtn) {
      optimizeAllBtn.disabled = !content.trim() || !this.apiSettings.apiKey;
    }
  }
  
  // 设置管理
  saveSettings() {
    window.storageService.saveSettings({
      theme: this.themeSelector.getCurrentTheme(),
      previewVisible: this.isPreviewVisible
    });
  }
  
  loadSettings() {
    const settings = window.storageService.loadSettings();
    
    if (!settings.previewVisible) {
      this.hidePreview();
    }
  }
  
  // 工具函数
  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.markdownEditor = new MarkdownEditorApp();
});