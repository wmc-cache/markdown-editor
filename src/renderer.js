/**
 * 主应用程序入口
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

    // 自动保存配置
    this.autoSave = {
      enabled: true,
      interval: 30000, // 30秒间隔
      timer: null,
      lastSaveTime: 0,
      pendingSave: false
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

    // 加载自动保存设置
    this.loadAutoSaveSettings();

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
    
    // 初始化图像生成器
    this.imageGenerator = new window.ImageGenerator();

    this.imageGenerator.setOnInsertImage((markdown) => {
      this.insertImageToEditor(markdown);
    });

    this.imageGenerator.setOnImageGenerated((imageData) => {
      this.imageGenerator.saveToHistory(imageData);
    });

    // 初始化查找替换功能
    this.findReplace = new window.FindReplace(this.editor);
    
    // 初始化分隔条
    this.setupResizer();
  }
  
  setupEventListeners() {
    // 工具栏按钮
    document.getElementById('optimizeSelectedBtn').addEventListener('click', () => this.optimizeSelectedText());
    document.getElementById('optimizeAllBtn').addEventListener('click', () => this.optimizeAllText());
    document.getElementById('generateImageBtn').addEventListener('click', () => this.showImageGenerator());
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
    document.getElementById('togglePreview').addEventListener('click', () => this.togglePreview());
    document.getElementById('showImageHistory').addEventListener('click', () => this.showImageHistory());
    
    // 图像历史模态框
    document.getElementById('closeImageHistory').addEventListener('click', () => this.hideImageHistory());
    document.getElementById('clearImageHistory').addEventListener('click', () => this.clearImageHistory());
    document.getElementById('exportImageHistory').addEventListener('click', () => this.exportImageHistory());
    
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
          case 'i':
            if (e.altKey) {
              e.preventDefault();
              this.showImageGenerator();
            }
            break;
          case 'f':
            e.preventDefault();
            this.showFindDialog();
            break;
          case 'h':
            e.preventDefault();
            this.showReplaceDialog();
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

    // 触发自动保存
    this.scheduleAutoSave();
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

        // 更新自动保存状态
        this.autoSave.lastSaveTime = Date.now();
        this.autoSave.pendingSave = false;
        this.updateAutoSaveStatus();
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
    const optimizedText = await this.callTextOptimizationAPI(selectedText);
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
    
    const optimizedText = await this.callTextOptimizationAPI(content);
    if (optimizedText) {
      this.showComparison(content, optimizedText, false);
    }
  }
  
  // 文本长度和 Token 估算函数
  estimateTokens(text) {
    // 粗略估算：中文字符约1.5个token，英文单词约1个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length;
    return Math.ceil(chineseChars * 1.5 + englishWords);
  }

  // 智能分割文本函数
  splitText(text, maxChars = 3000) {
    if (text.length <= maxChars) {
      return [text];
    }

    const chunks = [];
    const paragraphs = text.split(/\n\s*\n/); // 按段落分割
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // 如果单个段落就超长，需要进一步分割
      if (paragraph.length > maxChars) {
        // 先保存当前块
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // 按句子分割超长段落
        const sentences = paragraph.split(/[。！？.!?]\s*/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > maxChars) {
            if (sentenceChunk.trim()) {
              chunks.push(sentenceChunk.trim());
            }
            sentenceChunk = sentence;
          } else {
            sentenceChunk += (sentenceChunk ? '。' : '') + sentence;
          }
        }
        
        if (sentenceChunk.trim()) {
          currentChunk = sentenceChunk;
        }
      } else {
        // 检查添加这个段落是否会超长
        if (currentChunk.length + paragraph.length + 2 > maxChars) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  async callTextOptimizationAPI(text) {
    const MAX_CHARS = 8000; // 单次处理的最大字符数
    const estimatedTokens = this.estimateTokens(text);
    
    // 检查文本长度
    if (text.length > MAX_CHARS || estimatedTokens > 6000) {
      return await this.callOptimizationAPIWithChunks(text);
    } else {
      return await this.callSingleOptimizationAPI(text);
    }
  }

  // 处理超长文本的分块API调用
  async callOptimizationAPIWithChunks(text) {
    const chunks = this.splitText(text, 3000);
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (chunks.length > 1) {
      const confirmed = confirm(
        `文本较长，需要分成 ${chunks.length} 段进行处理，这可能需要较长时间。是否继续？`
      );
      if (!confirmed) {
        return null;
      }
    }
    
    loadingOverlay.classList.add('show');
    
    // 更新加载提示
    const loadingText = document.querySelector('#loadingOverlay .loading-text');
    if (loadingText) {
      loadingText.textContent = `正在优化第 1/${chunks.length} 段...`;
    }
    
    try {
      const optimizedChunks = [];
      
      for (let i = 0; i < chunks.length; i++) {
        // 更新进度
        if (loadingText) {
          loadingText.textContent = `正在优化第 ${i + 1}/${chunks.length} 段...`;
        }
        
        const optimizedChunk = await this.callSingleOptimizationAPI(chunks[i], false);
        if (optimizedChunk) {
          optimizedChunks.push(optimizedChunk);
        } else {
          // 如果某一段失败，询问是否继续
          const shouldContinue = confirm(
            `第 ${i + 1} 段优化失败，是否继续处理剩余段落？`
          );
          if (!shouldContinue) {
            break;
          }
          // 使用原文本作为备用
          optimizedChunks.push(chunks[i]);
        }
        
        // 在段落之间添加短暂延迟，避免API限流
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 拼接结果
      return optimizedChunks.join('\n\n');
      
    } catch (error) {
      console.error('分块处理失败:', error);
      alert(`分块处理失败: ${error.message}`);
      return null;
    } finally {
      loadingOverlay.classList.remove('show');
      if (loadingText) {
        loadingText.textContent = '正在处理...';
      }
    }
  }

  // 单个API调用
  async callSingleOptimizationAPI(text, showOverlay = true) {
    if (showOverlay) {
      const loadingOverlay = document.getElementById('loadingOverlay');
      loadingOverlay.classList.add('show');
    }
    
    try {
      // 获取当前API配置
      const currentConfig = window.storageService.getCurrentApiConfig();
      const { provider, config, systemPrompt } = currentConfig;
      
      if (!config || !config.apiKey) {
        throw new Error(`请先配置 ${provider === 'deepseek' ? 'DeepSeek' : '智谱'} API Key`);
      }
      
      const response = await axios.post(config.endpoint, {
        model: config.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 4000, // 限制返回长度
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 增加超时时间到60秒
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
      
      if (showOverlay) {
        alert(errorMessage);
      } else {
        console.error(errorMessage);
      }
      return null;
    } finally {
      if (showOverlay) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('show');
      }
    }
  }
  
  // API 设置
  showApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    
    // 加载当前设置
    this.loadApiSettingsToUI();
    
    // 设置提供商切换事件
    this.setupProviderSwitching();
    
    modal.classList.add('show');
  }
  
  loadApiSettingsToUI() {
    const settings = this.apiSettings;
    
    // 设置当前提供商
    document.getElementById('apiProvider').value = settings.provider || 'deepseek';
    
    // 加载 DeepSeek 配置
    if (settings.deepseek) {
      document.getElementById('deepseekApiKey').value = settings.deepseek.apiKey || '';
      document.getElementById('deepseekEndpoint').value = settings.deepseek.endpoint || 'https://api.deepseek.com/chat/completions';
      document.getElementById('deepseekModel').value = settings.deepseek.model || 'deepseek-chat';
    }
    
    // 加载智谱配置
    if (settings.zhipu) {
      document.getElementById('zhipuApiKey').value = settings.zhipu.apiKey || '';
      document.getElementById('zhipuEndpoint').value = settings.zhipu.endpoint || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      document.getElementById('zhipuModel').value = settings.zhipu.model || 'glm-4-plus';
    }
    
    // 加载系统提示词
    document.getElementById('systemPrompt').value = settings.systemPrompt || '';
    
    // 显示对应的配置区域
    this.switchProviderConfig(settings.provider || 'deepseek');
  }
  
  setupProviderSwitching() {
    const providerSelect = document.getElementById('apiProvider');
    providerSelect.addEventListener('change', (e) => {
      this.switchProviderConfig(e.target.value);
    });
  }
  
  switchProviderConfig(provider) {
    const deepseekConfig = document.getElementById('deepseekConfig');
    const zhipuConfig = document.getElementById('zhipuConfig');
    
    if (provider === 'deepseek') {
      deepseekConfig.style.display = 'block';
      zhipuConfig.style.display = 'none';
    } else {
      deepseekConfig.style.display = 'none';
      zhipuConfig.style.display = 'block';
    }
  }
  
  hideApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    modal.classList.remove('show');
  }
  
  saveApiSettings() {
    const provider = document.getElementById('apiProvider').value;
    const systemPrompt = document.getElementById('systemPrompt').value.trim();
    
    // 获取当前设置
    const settings = { ...this.apiSettings };
    settings.provider = provider;
    settings.systemPrompt = systemPrompt;
    
    // 保存 DeepSeek 配置
    const deepseekApiKey = document.getElementById('deepseekApiKey').value.trim();
    const deepseekEndpoint = document.getElementById('deepseekEndpoint').value.trim();
    const deepseekModel = document.getElementById('deepseekModel').value;
    
    settings.deepseek = {
      apiKey: deepseekApiKey,
      endpoint: deepseekEndpoint,
      model: deepseekModel,
      systemPrompt: systemPrompt
    };
    
    // 保存智谱配置
    const zhipuApiKey = document.getElementById('zhipuApiKey').value.trim();
    const zhipuEndpoint = document.getElementById('zhipuEndpoint').value.trim();
    const zhipuModel = document.getElementById('zhipuModel').value;
    
    settings.zhipu = {
      apiKey: zhipuApiKey,
      endpoint: zhipuEndpoint,
      model: zhipuModel,
      systemPrompt: systemPrompt
    };
    
    // 验证当前提供商的 API Key
    const currentConfig = settings[provider];
    if (!currentConfig.apiKey) {
      alert(`请输入 ${provider === 'deepseek' ? 'DeepSeek' : '智谱'} API Key`);
      return;
    }
    
    this.apiSettings = settings;
    window.storageService.saveApiSettings(this.apiSettings);
    
    // 更新 CogView 服务的 API Key
    if (provider === 'zhipu') {
      window.cogviewService.setApiKey(zhipuApiKey);
    }
    
    this.updateUI();
    this.hideApiSettings();
    
    alert('设置已保存');
  }
  
  async testApiConnection() {
    const provider = document.getElementById('apiProvider').value;
    let apiKey, apiEndpoint, model;
    
    if (provider === 'deepseek') {
      apiKey = document.getElementById('deepseekApiKey').value.trim();
      apiEndpoint = document.getElementById('deepseekEndpoint').value.trim();
      model = document.getElementById('deepseekModel').value;
    } else {
      apiKey = document.getElementById('zhipuApiKey').value.trim();
      apiEndpoint = document.getElementById('zhipuEndpoint').value.trim();
      model = document.getElementById('zhipuModel').value;
    }
    
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
  togglePreview() {
    if (this.isPreviewVisible) {
      this.hidePreview();
    } else {
      this.showPreview();
    }
  }

  hidePreview() {
    this.isPreviewVisible = false;
    const previewPanel = document.getElementById('previewPanel');
    const resizer = document.getElementById('resizer');
    const togglePreviewBtn = document.getElementById('togglePreview');
    const editorPanel = document.querySelector('.editor-panel');

    previewPanel.style.display = 'none';
    resizer.style.display = 'none';
    editorPanel.style.flex = '1';

    // 更新按钮文本和提示
    togglePreviewBtn.title = '显示预览';
    togglePreviewBtn.style.opacity = '0.6';

    this.saveSettings();
  }

  showPreview() {
    this.isPreviewVisible = true;
    const previewPanel = document.getElementById('previewPanel');
    const resizer = document.getElementById('resizer');
    const togglePreviewBtn = document.getElementById('togglePreview');
    const editorPanel = document.querySelector('.editor-panel');

    previewPanel.style.display = 'flex';
    resizer.style.display = 'block';

    // 恢复默认的 flex 设置，保持和初始状态一致
    editorPanel.style.flex = '1';
    previewPanel.style.flex = '1';

    // 更新按钮文本和提示
    togglePreviewBtn.title = '隐藏预览';
    togglePreviewBtn.style.opacity = '1';

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
    const currentConfig = window.storageService.getCurrentApiConfig();
    
    const optimizeSelectedBtn = document.getElementById('optimizeSelectedBtn');
    const optimizeAllBtn = document.getElementById('optimizeAllBtn');
    const generateImageBtn = document.getElementById('generateImageBtn');
    
    // 检查当前提供商是否有配置的 API Key
    const hasApiKey = currentConfig.config && currentConfig.config.apiKey;
    
    if (optimizeSelectedBtn) {
      optimizeSelectedBtn.disabled = !selection.hasSelection || !hasApiKey;
    }
    
    if (optimizeAllBtn) {
      optimizeAllBtn.disabled = !content.trim() || !hasApiKey;
    }
    
    if (generateImageBtn) {
      // 图像生成只在智谱 AI 模式下启用
      const canGenerateImage = currentConfig.provider === 'zhipu' && hasApiKey;
      generateImageBtn.disabled = !canGenerateImage;
      generateImageBtn.title = canGenerateImage ? 
        'AI生成图像 (Ctrl+Alt+I)' : 
        '图像生成需要智谱 AI - 点击查看设置';
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

    if (settings.previewVisible === false) {
      this.hidePreview();
    } else {
      // 确保按钮状态正确
      const togglePreviewBtn = document.getElementById('togglePreview');
      if (togglePreviewBtn) {
        togglePreviewBtn.title = '隐藏预览';
        togglePreviewBtn.style.opacity = '1';
      }
    }
  }
  
  // 图像生成功能
  showImageGenerator() {
    const currentConfig = window.storageService.getCurrentApiConfig();
    
    if (currentConfig.provider !== 'zhipu') {
      alert('图像生成功能需要使用智谱 AI。请在设置中切换到智谱 AI 并配置 API Key。');
      this.showApiSettings();
      return;
    }
    
    if (!currentConfig.config || !currentConfig.config.apiKey) {
      alert('请先配置智谱 API Key');
      this.showApiSettings();
      return;
    }
    
    // 设置图像生成服务的 API Key
    window.cogviewService.setApiKey(currentConfig.config.apiKey);
    
    this.imageGenerator.show();
  }
  
  insertImageToEditor(markdown) {
    if (!this.editor) {
      console.error('编辑器未初始化');
      return;
    }
    
    // 在光标位置插入图像 Markdown
    const currentContent = this.editor.getContent();
    const selection = this.editor.getSelection();
    
    // 确保图像前后有换行符
    let imageMarkdown = markdown;
    if (selection.start > 0 && !currentContent[selection.start - 1].match(/\n/)) {
      imageMarkdown = '\n' + imageMarkdown;
    }
    if (!imageMarkdown.endsWith('\n')) {
      imageMarkdown += '\n';
    }
    
    // 插入图像
    this.editor.insertTextAtCursor(imageMarkdown);
    
    // 标记文档已修改
    this.setDirty(true);
    
    // 更新预览
    this.preview.update(this.editor.getContent());
  }
  
  // 图像历史管理
  showImageHistory() {
    const modal = document.getElementById('imageHistoryModal');
    const historyList = document.getElementById('imageHistoryList');
    
    // 获取历史记录
    const history = this.imageGenerator.getHistory();
    
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <p>暂无图像生成历史</p>
          <button class="btn btn-primary" onclick="document.getElementById('generateImageBtn').click(); document.getElementById('imageHistoryModal').style.display='none';">
            开始生成图像
          </button>
        </div>
      `;
    } else {
      historyList.innerHTML = history.map(item => this.renderHistoryItem(item)).join('');
    }
    
    modal.style.display = 'flex';
  }
  
  hideImageHistory() {
    const modal = document.getElementById('imageHistoryModal');
    modal.style.display = 'none';
  }
  
  renderHistoryItem(item) {
    const imageUrl = item.images[0].url;
    const timestamp = new Date(item.timestamp).toLocaleString();
    const model = item.model;
    const prompt = item.prompt;
    
    return `
      <div class="history-item">
        <img src="${imageUrl}" alt="${prompt}" class="history-image" onclick="window.open('${imageUrl}', '_blank')">
        <div class="history-details">
          <div class="history-prompt">${prompt}</div>
          <div class="history-meta">
            <div>模型: ${model}</div>
            <div>生成时间: ${timestamp}</div>
          </div>
          <div class="history-actions">
            <button class="btn btn-primary" onclick="markdownEditor.insertImageFromHistory('${imageUrl}', '${prompt}')">
              插入到文档
            </button>
            <button class="btn btn-secondary" onclick="markdownEditor.downloadHistoryImage('${imageUrl}', '${prompt}')">
              下载
            </button>
            <button class="btn btn-secondary" onclick="markdownEditor.copyHistoryImageUrl('${imageUrl}')">
              复制链接
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  insertImageFromHistory(imageUrl, altText) {
    const markdown = window.cogviewService.generateMarkdownImage(imageUrl, altText);
    this.insertImageToEditor(markdown);
    this.hideImageHistory();
  }
  
  downloadHistoryImage(imageUrl, prompt) {
    const filename = `cogview_${prompt.substring(0, 20)}_${Date.now()}.png`;
    window.cogviewService.downloadImage(imageUrl, filename)
      .catch(error => {
        console.error('下载失败:', error);
        alert('下载失败: ' + error.message);
      });
  }
  
  copyHistoryImageUrl(imageUrl) {
    navigator.clipboard.writeText(imageUrl)
      .then(() => {
        // 临时显示成功提示
        const notification = document.createElement('div');
        notification.textContent = '链接已复制到剪贴板';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--bg-ai);
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 10000;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 2000);
      })
      .catch(error => {
        console.error('复制失败:', error);
        alert('复制失败');
      });
  }
  
  clearImageHistory() {
    if (confirm('确定要清空所有图像生成历史吗？此操作不可恢复。')) {
      this.imageGenerator.clearHistory();
      this.showImageHistory(); // 刷新显示
    }
  }
  
  exportImageHistory() {
    const history = this.imageGenerator.getHistory();
    if (history.length === 0) {
      alert('暂无历史记录可导出');
      return;
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      history: history
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogview_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 自动保存相关方法
  scheduleAutoSave() {
    if (!this.autoSave.enabled) {
      return;
    }

    // 清除现有的定时器
    if (this.autoSave.timer) {
      clearTimeout(this.autoSave.timer);
    }

    // 设置新的定时器
    this.autoSave.timer = setTimeout(() => {
      this.performAutoSave();
    }, this.autoSave.interval);

    this.autoSave.pendingSave = true;
    this.updateAutoSaveStatus();
  }

  async performAutoSave() {
    if (!this.autoSave.enabled || !this.isDirty) {
      this.autoSave.pendingSave = false;
      this.updateAutoSaveStatus();
      return;
    }

    const currentTab = this.tabManager.getCurrentTab();
    if (currentTab && currentTab.filePath) {
      try {
        await this.saveFileToPath(currentTab.filePath);
        this.showAutoSaveNotification('自动保存成功');
      } catch (error) {
        console.error('自动保存失败:', error);
        this.showAutoSaveNotification('自动保存失败', true);
      }
    } else {
      // 如果文件还没有路径，不进行自动保存
      this.autoSave.pendingSave = false;
      this.updateAutoSaveStatus();
    }
  }

  updateAutoSaveStatus() {
    const statusElement = document.getElementById('autoSaveStatus');
    if (statusElement) {
      if (this.autoSave.pendingSave && this.isDirty) {
        statusElement.textContent = '等待自动保存...';
        statusElement.className = 'auto-save-status pending';
      } else if (this.autoSave.lastSaveTime > 0 && !this.isDirty) {
        const timeSinceLastSave = Math.floor((Date.now() - this.autoSave.lastSaveTime) / 1000);
        statusElement.textContent = `已保存 (${timeSinceLastSave}秒前)`;
        statusElement.className = 'auto-save-status saved';
      } else {
        statusElement.textContent = '';
        statusElement.className = 'auto-save-status';
      }
    }
  }

  showAutoSaveNotification(message, isError = false) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `auto-save-notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  toggleAutoSave() {
    this.autoSave.enabled = !this.autoSave.enabled;

    if (this.autoSave.enabled) {
      this.showAutoSaveNotification('自动保存已开启');
    } else {
      this.showAutoSaveNotification('自动保存已关闭');
      if (this.autoSave.timer) {
        clearTimeout(this.autoSave.timer);
        this.autoSave.timer = null;
      }
    }

    this.updateAutoSaveStatus();
    this.saveAutoSaveSettings();
  }

  setAutoSaveInterval(interval) {
    this.autoSave.interval = Math.max(10000, interval); // 最小10秒
    this.saveAutoSaveSettings();
  }

  saveAutoSaveSettings() {
    window.storageService.set('autoSaveSettings', {
      enabled: this.autoSave.enabled,
      interval: this.autoSave.interval
    });
  }

  loadAutoSaveSettings() {
    const settings = window.storageService.get('autoSaveSettings', {
      enabled: true,
      interval: 30000
    });

    this.autoSave.enabled = settings.enabled;
    this.autoSave.interval = settings.interval;
  }

  // 查找替换功能
  showFindDialog() {
    this.findReplace.show(false);
  }

  showReplaceDialog() {
    this.findReplace.show(true);
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