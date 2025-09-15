/**
 * 文件树管理器组件
 * 负责显示和管理文件夹结构
 */
class FileTree {
  constructor(container, onFileSelect) {
    this.container = container;
    this.onFileSelect = onFileSelect;
    this.currentFolder = null;
    this.files = [];
    this.activeFile = null;

    // 跟踪文件夹展开状态
    this.expandedFolders = new Set();

    this.init();
  }

  init() {
    // 初始化完成，事件监听器在 render 时设置
  }

  // 加载文件夹
  loadFolder({ folderPath, files }) {
    this.currentFolder = folderPath;
    this.files = files;
    this.render();
  }

  // 渲染文件树
  render() {
    if (!this.files || this.files.length === 0) {
      this.renderEmptyState();
      return;
    }

    const folderName = this.currentFolder.split('/').pop() || this.currentFolder;
    let html = `
      <div class="file-tree-folder">
        <div class="file-tree-item folder-item">
          <span class="folder-icon">📁</span>
          <span class="file-name">${folderName}</span>
        </div>
        <div class="folder-content">
          ${this.renderItems(this.files, 1)}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  // 递归渲染文件项
  renderItems(items, level) {
    return items.map(item => {
      const indent = level * 20;

      if (item.type === 'directory') {
        const isExpanded = this.expandedFolders.has(item.path);
        const hasChildren = item.children && item.children.length > 0;
        const expandIcon = hasChildren ? (isExpanded ? '▼' : '▶') : '';

        let html = `
          <div class="file-tree-item folder-item"
               data-path="${item.path}"
               data-type="directory"
               style="padding-left: ${indent}px">
            <span class="expand-icon" style="display: ${hasChildren ? 'inline' : 'none'}">${expandIcon}</span>
            <span class="folder-icon">📁</span>
            <span class="file-name">${item.name}</span>
          </div>
        `;

        if (hasChildren && isExpanded) {
          html += `
            <div class="folder-content" data-folder="${item.path}">
              ${this.renderItems(item.children, level + 1)}
            </div>
          `;
        }

        return html;
      } else {
        const isActive = this.activeFile === item.path;
        return `
          <div class="file-tree-item file-item ${isActive ? 'active' : ''}"
               data-path="${item.path}"
               data-type="file"
               style="padding-left: ${indent}px"
               title="${item.path}">
            <span class="file-icon">📄</span>
            <span class="file-name">${item.name}</span>
          </div>
        `;
      }
    }).join('');
  }

  // 渲染空状态
  renderEmptyState() {
    this.container.innerHTML = `
      <div class="file-tree-empty">
        <p>此文件夹中没有 Markdown 文件</p>
        <button id="openFolderFromTreeEmpty" class="btn btn-secondary">
          📁 选择其他文件夹
        </button>
      </div>
    `;
    
    const button = document.getElementById('openFolderFromTreeEmpty');
    if (button && this.onFolderOpen) {
      button.addEventListener('click', this.onFolderOpen);
    }
  }

  // 设置文件夹打开回调
  setOnFolderOpen(callback) {
    this.onFolderOpen = callback;
  }

  // 绑定事件
  bindEvents() {
    const fileItems = this.container.querySelectorAll('.file-item');

    fileItems.forEach(item => {
      const itemType = item.dataset.type;
      const itemPath = item.dataset.path;

      // 单击事件
      item.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (itemType === 'directory') {
          // 文件夹点击：展开/折叠
          this.toggleFolder(itemPath);
        } else if (itemType === 'file') {
          // 文件点击：打开文件
          if (itemPath && this.onFileSelect) {
            this.setActiveFile(itemPath);
            await this.onFileSelect(itemPath);
          }
        }
      });

      // 右键菜单
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (itemPath) {
          this.showContextMenu(e, itemPath);
        }
      });
    });

    // 绑定展开图标点击事件
    const expandIcons = this.container.querySelectorAll('.expand-icon');
    expandIcons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderItem = icon.closest('.folder-item');
        if (folderItem) {
          const folderPath = folderItem.dataset.path;
          this.toggleFolder(folderPath);
        }
      });
    });
  }

  // 设置活动文件
  setActiveFile(filePath) {
    this.activeFile = filePath;
    
    // 更新UI
    const fileItems = this.container.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      if (item.dataset.path === filePath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // 显示右键菜单
  showContextMenu(event, filePath) {
    // 移除已存在的菜单
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
      <div class="context-menu-item" data-action="copy-path">
        📋 复制文件路径
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
        if (window.electronAPI) {
          try {
            await window.electronAPI.showInFolder(filePath);
          } catch (error) {
            console.error('打开文件位置失败:', error);
          }
        }
      } else if (action === 'copy-path') {
        // 复制路径到剪贴板
        if (navigator.clipboard) {
          navigator.clipboard.writeText(filePath);
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

  // 刷新文件树
  refresh() {
    if (this.currentFolder && window.electronAPI) {
      window.electronAPI.readDirectory(this.currentFolder).then(result => {
        if (result.success) {
          this.loadFolder({ 
            folderPath: this.currentFolder, 
            files: result.files 
          });
        }
      });
    }
  }

  // 搜索文件
  searchFiles(query) {
    const results = [];
    const searchInItems = (items) => {
      items.forEach(item => {
        if (item.type === 'file' && item.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(item);
        }
        if (item.children) {
          searchInItems(item.children);
        }
      });
    };
    
    searchInItems(this.files);
    return results;
  }

  // 展开/折叠文件夹
  toggleFolder(folderPath) {
    if (this.expandedFolders.has(folderPath)) {
      this.expandedFolders.delete(folderPath);
    } else {
      this.expandedFolders.add(folderPath);
    }

    // 重新渲染文件树
    this.render();
  }

  // 清空文件树
  clear() {
    this.container.innerHTML = '';
    this.files = [];
    this.currentFolder = null;
    this.activeFile = null;
  }

  // 清理
  destroy() {
    this.clear();
  }
}

// 将类挂载到全局对象
window.FileTree = FileTree;