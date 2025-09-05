class MarkdownEditorApp {
    constructor() {
        this.editor = null;
        this.markdownIt = null;
        this.currentContent = '';
        this.currentFile = null;
        this.isDirty = false;
        this.theme = 'light';

        // 主题配置
        this.themes = [
            { id: 'light', name: '默认浅色', icon: '☀️' },
            { id: 'dark', name: '暗夜', icon: '🌙' },
            // { id: 'github', name: 'GitHub', icon: '🐙' },
            // { id: 'dracula', name: 'Dracula', icon: '🧛' },
            // { id: 'nord', name: 'Nord', icon: '❄️' },
            { id: 'forest', name: '森林', icon: '🌲' },
            { id: 'sunset', name: '日落', icon: '🌅' },
            { id: 'ocean', name: '海洋', icon: '🌊' },
            { id: 'monokai', name: 'Monokai', icon: '🎨' },
            { id: 'rose', name: '玫瑰', icon: '🌹' }
        ];

        this.apiSettings = {
            apiKey: '',
            endpoint: 'https://api.deepseek.com/chat/completions',
            model: 'deepseek-chat',
            systemPrompt: '你是一个专业的文本优化助手。请帮我优化以下文本，让它更清晰、准确、易懂。保持原文的主要意思，但可以改进表达方式、语法和结构。'
        };
        
        // 文件树相关
        this.fileTreeManager = null;
        
        // 预览面板相关
        this.isPreviewVisible = true;
        
        // 标签页相关
        this.tabs = new Map(); // 存储所有标签页
        this.activeTabId = 'untitled';
        this.tabCounter = 0;
        
        this.init();
    }
    
    async init() {
        // 初始化 Markdown 解析器
        this.initMarkdownParser();
        
        // 初始化编辑器
        this.initEditor();
        
        // 初始化文件树管理器
        this.fileTreeManager = new FileTreeManager(this);
        
        // 初始化标签页
        this.initTabs();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 加载保存的设置
        this.loadSettings();
        
        // 设置主题
        this.setTheme(this.theme);
        
        // 初始化界面状态
        this.updateUI();
    }
    
    initMarkdownParser() {
        this.markdownIt = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: function (str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang }).value;
                    } catch (__) {}
                }
                return '';
            }
        });
    }
    
    initEditor() {
        // 使用简单的文本编辑器（因为 CodeMirror 需要特殊处理）
        const editorContainer = document.getElementById('editor');
        
        const textarea = document.createElement('textarea');
        textarea.id = 'editor-textarea';
        textarea.className = 'editor-textarea';
        textarea.placeholder = '在这里输入 Markdown 内容...';
        
        editorContainer.appendChild(textarea);
        
        this.editor = textarea;
        
        // 监听内容变化
        this.editor.addEventListener('input', (e) => {
            this.currentContent = e.target.value;
            this.updatePreview();
            this.updateStatus();
            this.setDirty(true);
        });
        
        // 监听选择变化 - 使用多个事件确保捕获所有选择变化
        const updateSelection = () => {
            this.updateStatus();
            this.updateUI();
        };
        
        this.editor.addEventListener('keyup', updateSelection);
        this.editor.addEventListener('mouseup', updateSelection);  
        this.editor.addEventListener('click', updateSelection);
        this.editor.addEventListener('focus', updateSelection);
        
        // 监听选中文本变化（使用定时器检查）
        let lastSelection = '';
        setInterval(() => {
            if (this.editor) {
                const currentSelection = this.editor.value.substring(
                    this.editor.selectionStart, 
                    this.editor.selectionEnd
                );
                if (currentSelection !== lastSelection) {
                    lastSelection = currentSelection;
                    this.updateUI();
                }
            }
        }, 200);
    }
    
    setupEventListeners() {
        // 工具栏按钮
        // document.getElementById('newBtn').addEventListener('click', () => this.newFile());
        // document.getElementById('openBtn').addEventListener('click', () => this.openFile());

        // const openFolderBtn = document.getElementById('openFolderBtn');
        // if (openFolderBtn) {
        //     openFolderBtn.addEventListener('click', () => {
        //         console.log('打开文件夹按钮被点击');
        //         this.openFolder();
        //     });
        // } else {
        //     console.error('找不到打开文件夹按钮');
        // }

        // document.getElementById('saveBtn').addEventListener('click', () => this.saveFile());
        document.getElementById('optimizeSelectedBtn').addEventListener('click', () => this.optimizeSelectedText());
        document.getElementById('optimizeAllBtn').addEventListener('click', () => this.optimizeAllText());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showApiSettings());
        
        // 模态框
        const modal = document.getElementById('apiSettingsModal');
        const closeModal = document.getElementById('closeModal');
        const saveSettings = document.getElementById('saveSettings');
        const testApi = document.getElementById('testApi');
        
        closeModal.addEventListener('click', () => this.hideApiSettings());
        saveSettings.addEventListener('click', () => this.saveApiSettings());
        testApi.addEventListener('click', () => this.testApiConnection());
        
        // 文件树相关按钮
        document.getElementById('openFolderFromTree').addEventListener('click', () => this.openFolder());
        
        // 预览相关按钮
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
            window.electronAPI.onFolderOpened((data) => this.fileTreeManager.loadFolder(data));
        }
        
        // 键盘快捷键
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
        
        // 拖拽文件支持
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
        
        // 分隔条拖拽
        this.setupResizer();
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
            e.stopPropagation();
            isResizing = true;
            
            // 记录开始拖拽时的位置和当前编辑器宽度
            startX = e.clientX;
            const container = document.querySelector('.main-content');
            const containerRect = container.getBoundingClientRect();
            const editorRect = editorPanel.getBoundingClientRect();
            startEditorWidth = ((editorRect.width / containerRect.width) * 100);
            
            // 添加拖拽时的样式
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.body.classList.add('resizing');
            resizer.classList.add('resizing');
            
            // 使用全局事件监听器确保鼠标移出时仍能响应
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { once: true });
            
            // 阻止文本选择
            document.addEventListener('selectstart', preventDefault);
            document.addEventListener('dragstart', preventDefault);
        });
        
        function handleMouseMove(e) {
            if (!isResizing) return;
            
            e.preventDefault();
            
            const container = document.querySelector('.main-content');
            const containerRect = container.getBoundingClientRect();
            
            // 计算鼠标移动的距离，并转换为百分比
            const deltaX = e.clientX - startX;
            const deltaPercentage = (deltaX / containerRect.width) * 100;
            const newPercentage = Math.max(25, Math.min(75, startEditorWidth + deltaPercentage));
            
            // 实时更新布局
            editorPanel.style.flex = `0 0 ${newPercentage}%`;
            previewPanel.style.flex = `0 0 ${100 - newPercentage}%`;
        }
        
        function preventDefault(e) {
            e.preventDefault();
        }
        
        function handleMouseUp() {
            isResizing = false;
            
            // 恢复默认样式
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.classList.remove('resizing');
            resizer.classList.remove('resizing');
            
            // 清理所有事件监听器
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('selectstart', preventDefault);
            document.removeEventListener('dragstart', preventDefault);
        }
    }
    
    updatePreview() {
        const preview = document.getElementById('preview');
        if (this.currentContent.trim() === '') {
            preview.innerHTML = `
                <div class="empty-state">
                    <h2>欢迎使用 Markdown 编辑器</h2>
                    <p>开始输入 Markdown 内容，右侧将显示实时预览</p>
                    <div class="features">
                        <h3>功能特性：</h3>
                        <ul>
                            <li>🎨 实时 Markdown 预览</li>
                            <li>🤖 DeepSeek AI 提示词优化</li>
                            <li>🌙 明暗主题切换</li>
                            <li>💾 文件管理功能</li>
                            <li>⌨️ 丰富的快捷键支持</li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            const html = this.markdownIt.render(this.currentContent);
            preview.innerHTML = html;
        }
    }
    
    updateStatus() {
        const fileStatus = document.getElementById('fileStatus');
        const wordCount = document.getElementById('wordCount');
        const lineCount = document.getElementById('lineCount');
        
        // 文件状态
        const fileName = this.currentFile ? this.currentFile.replace(/^.*[\\\/]/, '') : '新建文档';
        fileStatus.textContent = fileName + (this.isDirty ? ' *' : '');
        
        // 字符统计
        const charCount = this.currentContent.length;
        wordCount.textContent = `${charCount} 字符`;
        
        // 行号统计
        const textarea = this.editor;
        const lines = this.currentContent.split('\n');
        const currentLine = this.currentContent.substring(0, textarea.selectionStart).split('\n').length;
        lineCount.textContent = `第 ${currentLine} 行 / 共 ${lines.length} 行`;
    }
    
    updateUI() {
        this.updatePreview();
        this.updateStatus();
        
        // 更新工具栏状态
        const hasSelection = this.editor && this.editor.selectionStart !== this.editor.selectionEnd;
        const optimizeSelectedBtn = document.getElementById('optimizeSelectedBtn');
        const optimizeAllBtn = document.getElementById('optimizeAllBtn');
        
        console.log('UpdateUI 调试信息:');
        console.log('- hasSelection:', hasSelection);
        console.log('- apiKey存在:', !!this.apiSettings.apiKey);
        console.log('- editor存在:', !!this.editor);
        if (this.editor) {
            console.log('- selectionStart:', this.editor.selectionStart);
            console.log('- selectionEnd:', this.editor.selectionEnd);
        }
        
        if (optimizeSelectedBtn) {
            optimizeSelectedBtn.disabled = !hasSelection || !this.apiSettings.apiKey;
            console.log('- optimizeSelectedBtn.disabled:', optimizeSelectedBtn.disabled);
        }
        
        if (optimizeAllBtn) {
            optimizeAllBtn.disabled = !this.currentContent.trim() || !this.apiSettings.apiKey;
            console.log('- optimizeAllBtn.disabled:', optimizeAllBtn.disabled);
        }
    }
    
    // 文件操作
    newFile() {
        // 直接创建新标签页
        this.createNewTab();
    }
    
    async openFile() {
        if (window.electronAPI) {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success) {
                    this.openFileInNewTab({ filePath, content: fileResult.content });
                } else {
                    alert(`打开文件失败: ${fileResult.error}`);
                }
            }
        }
    }
    
    openFileInNewTab({ filePath, content }) {
        // 隐藏空状态
        this.hideEmptyState();
        
        const fileName = filePath.split(/[/\\]/).pop() || '未命名文档';
        const tabId = filePath;
        
        // 检查是否已经打开了这个文件
        if (this.tabs.has(tabId)) {
            this.switchTab(tabId);
            return;
        }
        
        // 创建新标签页
        const tab = {
            id: tabId,
            title: fileName,
            content: content,
            filePath: filePath,
            isDirty: false
        };
        
        this.tabs.set(tabId, tab);
        this.renderTabs();
        this.switchTab(tabId);
    }

    async openFolder() {
        console.log('openFolder 方法被调用');
        if (window.electronAPI) {
            console.log('electronAPI 存在，显示文件夹对话框');
            try {
                const result = await window.electronAPI.showFolderDialog();
                console.log('文件夹对话框结果:', result);
                if (!result.canceled && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0];
                    console.log('选择的文件夹:', folderPath);
                    const dirResult = await window.electronAPI.readDirectory(folderPath);
                    console.log('读取文件夹结果:', dirResult);
                    if (dirResult.success) {
                        this.fileTreeManager.loadFolder({ folderPath, files: dirResult.files });
                    } else {
                        alert(`打开文件夹失败: ${dirResult.error}`);
                    }
                }
            } catch (error) {
                console.error('打开文件夹时出错:', error);
                alert(`打开文件夹失败: ${error.message}`);
            }
        } else {
            console.error('electronAPI 不存在');
            alert('Electron API 不可用');
        }
    }
    
    loadFileContent({ filePath, content }) {
        // 使用标签页系统加载文件
        this.openFileInNewTab({ filePath, content });
    }
    
    loadContent(content, fileName = null) {
        this.currentContent = content;
        this.currentFile = fileName;
        this.isDirty = false;
        this.editor.value = content;
        this.updateUI();
    }
    
    async saveFile() {
        if (this.currentFile) {
            await this.saveFileToPath(this.currentFile);
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
            const result = await window.electronAPI.writeFile(filePath, this.currentContent);
            if (result.success) {
                this.currentFile = filePath;
                this.isDirty = false;
                
                // 更新当前标签页
                const currentTab = this.tabs.get(this.activeTabId);
                if (currentTab) {
                    const fileName = filePath.split(/[/\\]/).pop() || '未命名文档';
                    
                    // 如果是第一次保存，需要更新tabId
                    if (!currentTab.filePath) {
                        // 删除旧的tab
                        this.tabs.delete(this.activeTabId);
                        // 创建新的tab
                        const newTabId = filePath;
                        currentTab.id = newTabId;
                        currentTab.title = fileName;
                        currentTab.filePath = filePath;
                        currentTab.isDirty = false;
                        this.tabs.set(newTabId, currentTab);
                        this.activeTabId = newTabId;
                    } else {
                        // 更新现有tab
                        currentTab.title = fileName;
                        currentTab.filePath = filePath;
                        currentTab.isDirty = false;
                    }
                }
                
                this.updateUI();
                this.renderTabs();
            } else {
                alert(`保存文件失败: ${result.error}`);
            }
        }
    }
    
    setDirty(dirty) {
        this.isDirty = dirty;
        this.updateUI();
        
        // 更新当前标签页的dirty状态
        if (this.activeTabId) {
            this.markTabDirty(this.activeTabId, dirty);
        }
    }
    
    // AI 优化功能
    async optimizeSelectedText() {
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            alert('请先选择要优化的文本');
            return;
        }
        
        if (!this.apiSettings.apiKey) {
            alert('请先配置 DeepSeek API Key');
            this.showApiSettings();
            return;
        }
        
        const optimizedText = await this.callDeepSeekAPI(selectedText);
        if (optimizedText) {
            // 显示对比结果
            this.showComparison(
                selectedText, 
                optimizedText, 
                true, 
                this.editor.selectionStart, 
                this.editor.selectionEnd
            );
        }
    }
    
    async optimizeAllText() {
        if (!this.currentContent.trim()) {
            alert('当前文档为空');
            return;
        }
        
        if (!this.apiSettings.apiKey) {
            alert('请先配置 DeepSeek API Key');
            this.showApiSettings();
            return;
        }
        
        const optimizedText = await this.callDeepSeekAPI(this.currentContent);
        if (optimizedText) {
            // 显示对比结果
            this.showComparison(this.currentContent, optimizedText, false);
        }
    }
    
    getSelectedText() {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        return this.currentContent.substring(start, end);
    }
    
    replaceSelectedText(newText) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        
        this.currentContent = this.currentContent.substring(0, start) + newText + this.currentContent.substring(end);
        this.editor.value = this.currentContent;
        
        // 设置新的光标位置
        this.editor.selectionStart = start;
        this.editor.selectionEnd = start + newText.length;
        this.editor.focus();
        
        this.setDirty(true);
        this.updateUI();
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
    
    // 主题切换
    toggleTheme() {
        // 创建主题选择器下拉菜单
        this.showThemeSelector();
    }

    showThemeSelector() {
        // 如果已存在选择器则移除
        let existingSelector = document.getElementById('themeSelector');
        if (existingSelector) {
            existingSelector.remove();
            return;
        }

        // 创建主题选择器容器
        const selector = document.createElement('div');
        selector.id = 'themeSelector';
        selector.className = 'theme-selector';

        // 创建主题列表
        this.themes.forEach(theme => {
            const item = document.createElement('div');
            item.className = `theme-item ${theme.id === this.theme ? 'active' : ''}`;
            item.innerHTML = `
                <span class="theme-icon">${theme.icon}</span>
                <span class="theme-name">${theme.name}</span>
            `;
            item.addEventListener('click', () => {
                this.setTheme(theme.id);
                this.saveSettings();
                selector.remove();
            });
            selector.appendChild(item);
        });

        // 添加到主题按钮附近
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.parentElement.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function closeSelector(e) {
                if (!selector.contains(e.target) && e.target.id !== 'themeToggle') {
                    selector.remove();
                    document.removeEventListener('click', closeSelector);
                }
            });
        }, 100);
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = this.themes.find(t => t.id === theme) || this.themes[0];
        themeToggle.textContent = currentTheme.icon;
        themeToggle.title = `主题: ${currentTheme.name}`;
        this.theme = theme;
    }
    
    // API 设置
    showApiSettings() {
        const modal = document.getElementById('apiSettingsModal');
        const apiKey = document.getElementById('apiKey');
        const apiEndpoint = document.getElementById('apiEndpoint');
        const model = document.getElementById('model');
        const systemPrompt = document.getElementById('systemPrompt');
        
        // 填充当前设置
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
        
        this.saveSettings();
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
    
    // 文件树操作
    
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
        
        // 让编辑器占满整个可用空间，清除之前设置的固定宽度
        editorPanel.style.flex = '1';
        editorPanel.style.removeProperty('flex-basis');
        
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
        
        // 恢复默认布局
        editorPanel.style.flex = '0 0 50%';
        previewPanel.style.flex = '0 0 50%';
        
        this.saveSettings();
    }

    // 标签页管理
    initTabs() {
        // 不创建默认标签页，让用户主动新建或打开文件
        
        // 设置标签页事件监听器
        this.setupTabEventListeners();
        
        // 设置对比模态框事件监听器
        this.setupComparisonModal();
        
        // 显示空白状态
        this.showEmptyState();
    }
    
    setupTabEventListeners() {
        // 新建标签页按钮
        document.getElementById('newTabBtn').addEventListener('click', () => {
            this.createNewTab();
        });
        
        // 标签页点击事件委托
        document.getElementById('tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (!tab) return;
            
            const tabId = tab.dataset.fileId;
            
            if (e.target.classList.contains('tab-close')) {
                // 关闭标签页
                this.closeTab(tabId);
            } else {
                // 切换标签页
                this.switchTab(tabId);
            }
        });
    }
    
    createNewTab() {
        // 隐藏空状态
        this.hideEmptyState();
        
        this.tabCounter++;
        const tabId = `untitled-${this.tabCounter}`;
        const tab = {
            id: tabId,
            title: `未保存的文档 ${this.tabCounter}`,
            content: '',
            filePath: null,
            isDirty: false
        };
        
        this.tabs.set(tabId, tab);
        this.renderTabs();
        this.switchTab(tabId);
    }
    
    switchTab(tabId) {
        if (!this.tabs.has(tabId)) return;
        
        // 保存当前标签页的内容
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const currentTab = this.tabs.get(this.activeTabId);
            currentTab.content = this.editor.value;
            currentTab.isDirty = this.isDirty;
        }
        
        // 切换到新标签页
        this.activeTabId = tabId;
        const tab = this.tabs.get(tabId);
        
        // 更新编辑器内容
        this.editor.value = tab.content;
        this.currentContent = tab.content;
        this.currentFile = tab.filePath;
        this.isDirty = tab.isDirty;
        
        // 更新UI
        this.renderTabs();
        this.updatePreview();
        this.updateUI();
    }
    
    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
        // 如果是当前活动标签页且有未保存内容，询问是否保存
        if (tabId === this.activeTabId && tab.isDirty) {
            const shouldSave = confirm(`文档 "${tab.title}" 有未保存的更改。是否保存？`);
            if (shouldSave) {
                this.saveFile();
                return; // 保存后再次尝试关闭
            }
        }
        
        // 删除标签页
        this.tabs.delete(tabId);
        
        // 如果关闭的是当前活动标签页，切换到其他标签页
        if (tabId === this.activeTabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            } else {
                // 如果没有标签页了，显示空状态
                this.activeTabId = null;
                this.showEmptyState();
            }
        }
        
        this.renderTabs();
    }
    
    renderTabs() {
        const tabsContainer = document.getElementById('tabs');
        tabsContainer.innerHTML = '';
        
        this.tabs.forEach((tab, tabId) => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab ${tabId === this.activeTabId ? 'active' : ''}`;
            tabElement.dataset.fileId = tabId;
            
            tabElement.innerHTML = `
                <span class="tab-title">${tab.title}</span>
                ${tab.isDirty ? '<span class="tab-unsaved-indicator" title="未保存">●</span>' : ''}
                <button class="tab-close" title="关闭">×</button>
            `;
            
            tabsContainer.appendChild(tabElement);
        });
    }
    
    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = title;
            this.renderTabs();
        }
    }
    
    markTabDirty(tabId, isDirty) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.isDirty = isDirty;
            this.renderTabs();
        }
    }
    
    // 对比模态框管理
    setupComparisonModal() {
        // 存储优化相关的数据
        this.optimizationData = {
            originalText: '',
            optimizedText: '',
            isSelectedText: false,
            selectionStart: 0,
            selectionEnd: 0
        };
        
        // 关闭按钮
        document.getElementById('closeComparison').addEventListener('click', () => {
            this.hideComparison();
        });
        
        // 保持原文按钮
        document.getElementById('rejectChanges').addEventListener('click', () => {
            this.hideComparison();
        });
        
        // 应用优化按钮
        document.getElementById('applyChanges').addEventListener('click', () => {
            this.applyOptimization();
        });
        
        // 移除点击外部关闭功能，用户必须主动选择
    }
    
    showComparison(originalText, optimizedText, isSelectedText = false, selectionStart = 0, selectionEnd = 0) {
        // 保存数据
        this.optimizationData = {
            originalText,
            optimizedText,
            isSelectedText,
            selectionStart,
            selectionEnd
        };
        
        // 显示内容
        document.getElementById('originalText').textContent = originalText;
        document.getElementById('optimizedText').textContent = optimizedText;
        
        // 显示模态框
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
            // 替换选中的文本
            const currentValue = this.editor.value;
            const newValue = currentValue.substring(0, data.selectionStart) + 
                           data.optimizedText + 
                           currentValue.substring(data.selectionEnd);
            
            this.editor.value = newValue;
            this.currentContent = newValue;
            this.setDirty(true);
            this.updatePreview();
            
            // 设置光标位置到替换文本的末尾
            const newCursorPosition = data.selectionStart + data.optimizedText.length;
            this.editor.setSelectionRange(newCursorPosition, newCursorPosition);
        } else {
            // 替换全部文本
            this.currentContent = data.optimizedText;
            this.editor.value = data.optimizedText;
            this.setDirty(true);
            this.updatePreview();
        }
        
        this.updateUI();
        this.hideComparison();
    }
    
    // 空白状态管理
    showEmptyState() {
        // 清空编辑器内容
        this.editor.value = '';
        this.currentContent = '';
        this.currentFile = null;
        this.isDirty = false;
        this.activeTabId = null;
        
        // 隐藏标签页容器
        document.getElementById('tabsContainer').style.display = 'none';
        
        // 更新UI状态
        this.updateUI();
        this.updatePreview();
    }
    
    hideEmptyState() {
        // 显示标签页容器
        document.getElementById('tabsContainer').style.display = 'flex';
    }

    // 本地存储
    saveSettings() {
        if (window.storageAPI) {
            window.storageAPI.setItem('markdownEditor.theme', this.theme);
            window.storageAPI.setItem('markdownEditor.apiSettings', this.apiSettings);
            window.storageAPI.setItem('markdownEditor.previewVisible', this.isPreviewVisible);
        }
    }
    
    loadSettings() {
        if (window.storageAPI) {
            const savedTheme = window.storageAPI.getItem('markdownEditor.theme');
            // 验证保存的主题是否在可用主题列表中
            if (savedTheme && this.themes.some(t => t.id === savedTheme)) {
                this.theme = savedTheme;
            }
            
            const savedApiSettings = window.storageAPI.getItem('markdownEditor.apiSettings');
            if (savedApiSettings) {
                this.apiSettings = { ...this.apiSettings, ...savedApiSettings };
            }
            
            
            const savedPreviewVisible = window.storageAPI.getItem('markdownEditor.previewVisible');
            if (savedPreviewVisible !== null) {
                this.isPreviewVisible = savedPreviewVisible;
                if (!this.isPreviewVisible) {
                    this.hidePreview();
                }
            }
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

// 文件树管理器类
class FileTreeManager {
    constructor(app) {
        this.app = app;
        this.currentFolder = null;
        this.files = [];
    }

    loadFolder({ folderPath, files }) {
        this.currentFolder = folderPath;
        this.files = files;
        this.renderTree();
    }

    renderTree() {
        const fileTree = document.getElementById('fileTree');
        
        if (!this.files || this.files.length === 0) {
            fileTree.innerHTML = `
                <div class="file-tree-empty">
                    <p>此文件夹中没有 Markdown 文件</p>
                    <button id="openFolderFromTreeEmpty" class="btn btn-secondary">
                        📁 选择其他文件夹
                    </button>
                </div>
            `;
            document.getElementById('openFolderFromTreeEmpty').addEventListener('click', () => this.app.openFolder());
            return;
        }

        const folderName = this.currentFolder.split('/').pop() || this.currentFolder;
        let html = `<div class="file-tree-folder">
            <div class="file-tree-item folder-item">
                <span class="folder-icon">📁</span>
                <span class="file-name">${folderName}</span>
            </div>
            <div class="folder-content">`;

        html += this.renderFileTreeItems(this.files, 1);
        html += '</div></div>';

        fileTree.innerHTML = html;
        this.bindEvents();
    }

    renderFileTreeItems(items, level) {
        let html = '';
        
        items.forEach(item => {
            const indent = '  '.repeat(level);
            
            if (item.type === 'directory') {
                html += `
                    <div class="file-tree-item folder-item" style="padding-left: ${level * 20}px">
                        <span class="folder-icon">📁</span>
                        <span class="file-name">${item.name}</span>
                    </div>
                `;
                if (item.children && item.children.length > 0) {
                    html += this.renderFileTreeItems(item.children, level + 1);
                }
            } else {
                const isActive = this.app.currentFile === item.path;
                html += `
                    <div class="file-tree-item file-item ${isActive ? 'active' : ''}" 
                         data-path="${item.path}" 
                         style="padding-left: ${level * 20}px"
                         title="${item.path}">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${item.name}</span>
                    </div>
                `;
            }
        });
        
        return html;
    }

    bindEvents() {
        const fileItems = document.querySelectorAll('.file-item');
        
        fileItems.forEach(item => {
            item.addEventListener('click', async () => {
                const filePath = item.dataset.path;
                if (filePath) {
                    try {
                        const result = await window.electronAPI.readFile(filePath);
                        if (result.success) {
                            this.app.loadFileContent({ filePath, content: result.content });
                            this.updateActiveFile(filePath);
                        } else {
                            alert(`打开文件失败: ${result.error}`);
                        }
                    } catch (error) {
                        alert(`打开文件失败: ${error.message}`);
                    }
                }
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const filePath = item.dataset.path;
                if (filePath) {
                    this.showContextMenu(e, filePath);
                }
            });
        });
    }

    updateActiveFile(filePath) {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            if (item.dataset.path === filePath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    showContextMenu(event, filePath) {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="show-in-folder">
                📁 在文件管理器中显示
            </div>
        `;

        contextMenu.style.position = 'fixed';
        contextMenu.style.left = event.clientX + 'px';
        contextMenu.style.top = event.clientY + 'px';
        contextMenu.style.zIndex = '10000';

        document.body.appendChild(contextMenu);

        // 点击菜单项
        contextMenu.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (action === 'show-in-folder') {
                try {
                    await window.electronAPI.showInFolder(filePath);
                } catch (error) {
                    alert(`打开文件位置失败: ${error.message}`);
                }
            }
            contextMenu.remove();
        });

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 10);
    }
}

// 添加简单编辑器的样式
const editorStyles = `
.editor-textarea {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    padding: 1rem;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    resize: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    tab-size: 4;
    box-sizing: border-box;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.editor-textarea::placeholder {
    color: var(--text-muted);
}

[data-theme="dark"] .editor-textarea {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = editorStyles;
document.head.appendChild(styleSheet);

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.markdownEditor = new MarkdownEditorApp();
});