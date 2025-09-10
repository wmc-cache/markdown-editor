/**
 * 主题选择器组件
 * 负责主题切换和管理
 */
class ThemeSelector {
  constructor() {
    this.currentTheme = 'light';
    this.themes = [
      { id: 'light', name: '默认浅色', icon: '☀️' },
      { id: 'dark', name: '暗夜', icon: '🌙' },
      { id: 'forest', name: '森林', icon: '🌲' },
      { id: 'sunset', name: '日落', icon: '🌅' },
      { id: 'ocean', name: '海洋', icon: '🌊' },
      { id: 'monokai', name: 'Monokai', icon: '🎨' },
      { id: 'rose', name: '玫瑰', icon: '🌹' }
    ];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSavedTheme();
  }

  // 设置事件监听器
  setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.showSelector();
      });
    }
  }

  // 显示主题选择器
  showSelector() {
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
      item.className = `theme-item ${theme.id === this.currentTheme ? 'active' : ''}`;
      item.innerHTML = `
        <span class="theme-icon">${theme.icon}</span>
        <span class="theme-name">${theme.name}</span>
      `;
      item.addEventListener('click', () => {
        this.setTheme(theme.id);
        selector.remove();
      });
      selector.appendChild(item);
    });

    // 添加到主题按钮附近
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && themeToggle.parentElement) {
      themeToggle.parentElement.appendChild(selector);
    }

    // 点击外部关闭
    setTimeout(() => {
      const closeSelector = (e) => {
        if (!selector.contains(e.target) && e.target.id !== 'themeToggle') {
          selector.remove();
          document.removeEventListener('click', closeSelector);
        }
      };
      document.addEventListener('click', closeSelector);
    }, 100);
  }

  // 设置主题
  setTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;
    
    // 应用主题
    document.documentElement.setAttribute('data-theme', themeId);
    
    // 更新按钮图标
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = theme.icon;
      themeToggle.title = `主题: ${theme.name}`;
    }
    
    this.currentTheme = themeId;
    this.saveTheme();
    
    // 触发主题变更事件
    if (this.onThemeChange) {
      this.onThemeChange(themeId);
    }
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme;
  }

  // 获取所有主题
  getThemes() {
    return this.themes;
  }

  // 添加新主题
  addTheme(theme) {
    if (!this.themes.find(t => t.id === theme.id)) {
      this.themes.push(theme);
    }
  }

  // 移除主题
  removeTheme(themeId) {
    const index = this.themes.findIndex(t => t.id === themeId);
    if (index !== -1 && themeId !== 'light' && themeId !== 'dark') {
      this.themes.splice(index, 1);
      if (this.currentTheme === themeId) {
        this.setTheme('light');
      }
    }
  }

  // 保存主题设置
  saveTheme() {
    if (window.storageAPI) {
      window.storageAPI.setItem('markdownEditor.theme', this.currentTheme);
    }
  }

  // 加载保存的主题
  loadSavedTheme() {
    if (window.storageAPI) {
      const savedTheme = window.storageAPI.getItem('markdownEditor.theme');
      if (savedTheme && this.themes.some(t => t.id === savedTheme)) {
        this.setTheme(savedTheme);
      } else {
        this.setTheme('light');
      }
    }
  }

  // 切换到下一个主题
  nextTheme() {
    const currentIndex = this.themes.findIndex(t => t.id === this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    this.setTheme(this.themes[nextIndex].id);
  }

  // 切换到上一个主题
  previousTheme() {
    const currentIndex = this.themes.findIndex(t => t.id === this.currentTheme);
    const prevIndex = (currentIndex - 1 + this.themes.length) % this.themes.length;
    this.setTheme(this.themes[prevIndex].id);
  }

  // 切换明暗主题
  toggleDarkMode() {
    if (this.currentTheme === 'dark') {
      this.setTheme('light');
    } else {
      this.setTheme('dark');
    }
  }

  // 设置主题变更回调
  onThemeChange(callback) {
    this.onThemeChange = callback;
  }

  // 清理
  destroy() {
    const selector = document.getElementById('themeSelector');
    if (selector) {
      selector.remove();
    }
  }
}

export default ThemeSelector;