/**
 * 标签页管理器组件
 * 负责多标签页的创建、切换和管理
 */
class TabManager {
  constructor(container, onTabChange) {
    this.container = container;
    this.onTabChange = onTabChange;
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabCounter = 0;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  // 设置事件监听器
  setupEventListeners() {
    // 新建标签页按钮
    const newTabBtn = document.getElementById('newTabBtn');
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => {
        this.createNewTab();
      });
    }
    
    // 标签页点击事件委托
    const tabsContainer = document.getElementById('tabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
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
  }

  // 创建新标签页
  createNewTab() {
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
    this.render();
    this.switchTab(tabId);
    
    return tabId;
  }

  // 打开文件创建标签页
  openFile({ filePath, content, title }) {
    const tabId = filePath || `file-${Date.now()}`;
    
    // 检查是否已经打开
    if (this.tabs.has(tabId)) {
      this.switchTab(tabId);
      return tabId;
    }
    
    const fileName = title || filePath?.split(/[/\\]/).pop() || '未命名文档';
    const tab = {
      id: tabId,
      title: fileName,
      content: content || '',
      filePath: filePath,
      isDirty: false
    };
    
    this.tabs.set(tabId, tab);
    this.render();
    this.switchTab(tabId);
    
    return tabId;
  }

  // 切换标签页
  switchTab(tabId) {
    if (!this.tabs.has(tabId)) return;
    
    // 保存当前标签页的内容
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      // 触发保存当前内容的事件
      if (this.onBeforeTabSwitch) {
        this.onBeforeTabSwitch(this.activeTabId);
      }
    }
    
    // 切换到新标签页
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    
    // 触发标签页切换事件
    if (this.onTabChange) {
      this.onTabChange(tab);
    }
    
    // 更新UI
    this.render();
  }

  // 关闭标签页
  async closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    
    // 如果有未保存内容，询问是否保存
    if (tab.isDirty) {
      if (this.onBeforeTabClose) {
        const shouldClose = await this.onBeforeTabClose(tab);
        if (!shouldClose) return;
      }
    }
    
    // 删除标签页
    this.tabs.delete(tabId);
    
    // 如果关闭的是当前活动标签页，切换到其他标签页
    if (tabId === this.activeTabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        this.switchTab(remainingTabs[remainingTabs.length - 1]);
      } else {
        this.activeTabId = null;
        if (this.onAllTabsClosed) {
          this.onAllTabsClosed();
        }
      }
    }
    
    this.render();
  }

  // 更新标签页内容
  updateTab(tabId, updates) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      Object.assign(tab, updates);
      if (updates.title || updates.isDirty !== undefined) {
        this.render();
      }
    }
  }

  // 更新当前标签页
  updateCurrentTab(updates) {
    if (this.activeTabId) {
      this.updateTab(this.activeTabId, updates);
    }
  }

  // 标记标签页为已修改
  markDirty(tabId, isDirty = true) {
    this.updateTab(tabId, { isDirty });
  }

  // 获取标签页
  getTab(tabId) {
    return this.tabs.get(tabId);
  }

  // 获取当前标签页
  getCurrentTab() {
    return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
  }

  // 获取所有标签页
  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  // 检查是否有未保存的标签页
  hasUnsavedTabs() {
    return Array.from(this.tabs.values()).some(tab => tab.isDirty);
  }

  // 渲染标签页
  render() {
    const tabsContainer = document.getElementById('tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    // 显示或隐藏标签页容器
    const tabsContainerWrapper = document.getElementById('tabsContainer');
    if (tabsContainerWrapper) {
      tabsContainerWrapper.style.display = this.tabs.size > 0 ? 'flex' : 'none';
    }
    
    this.tabs.forEach((tab, tabId) => {
      const tabElement = document.createElement('div');
      tabElement.className = `tab ${tabId === this.activeTabId ? 'active' : ''}`;
      tabElement.dataset.fileId = tabId;
      
      tabElement.innerHTML = `
        <span class="tab-title">${this.escapeHtml(tab.title)}</span>
        ${tab.isDirty ? '<span class="tab-unsaved-indicator" title="未保存">●</span>' : ''}
        <button class="tab-close" title="关闭">×</button>
      `;
      
      tabsContainer.appendChild(tabElement);
    });
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 设置标签页切换前回调
  onBeforeTabSwitch(callback) {
    this.onBeforeTabSwitch = callback;
  }

  // 设置标签页关闭前回调
  onBeforeTabClose(callback) {
    this.onBeforeTabClose = callback;
  }

  // 设置所有标签页关闭后回调
  onAllTabsClosed(callback) {
    this.onAllTabsClosed = callback;
  }

  // 关闭所有标签页
  async closeAllTabs() {
    const tabIds = Array.from(this.tabs.keys());
    for (const tabId of tabIds) {
      await this.closeTab(tabId);
    }
  }

  // 关闭其他标签页
  closeOtherTabs(keepTabId) {
    const tabIds = Array.from(this.tabs.keys());
    tabIds.forEach(tabId => {
      if (tabId !== keepTabId) {
        this.closeTab(tabId);
      }
    });
  }

  // 清理
  destroy() {
    this.tabs.clear();
    this.activeTabId = null;
    const tabsContainer = document.getElementById('tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
    }
  }
}

export default TabManager;