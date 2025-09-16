/**
 * 主题选择器组件
 * 负责主题切换和管理 - 模态框版本
 */
class ThemeSelector {
  constructor() {
    this.currentTheme = 'default';
    this.themes = [
      { id: 'default', name: '默认浅色', icon: '🌅' },
      { id: 'dark', name: '暗语', icon: '🌙' },
      { id: 'forest', name: '森林', icon: '🌲' },
      { id: 'sunset', name: '日落', icon: '🌇' },
      { id: 'ocean', name: '海洋', icon: '🌊' },
      { id: 'monokai', name: 'Monokai', icon: '🎨' },
      { id: 'rose', name: '玫瑰', icon: '🌹' }
    ];

    this.onThemeChangeCallback = null;
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
        this.showModal();
      });
    }

    // 模态框关闭事件
    const closeBtn = document.getElementById('closeThemeSettings');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal();
      });
    }

    // 重置按钮
    const resetBtn = document.getElementById('resetTheme');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.setTheme('default');
      });
    }

    // 主题选项点击事件
    document.addEventListener('click', (e) => {
      const themeOption = e.target.closest('.theme-option');
      if (themeOption) {
        const themeId = themeOption.dataset.theme;
        this.setTheme(themeId);
      }
    });

    // 点击模态框背景关闭
    const modal = document.getElementById('themeSettingsModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });
  }

  // 显示模态框
  showModal() {
    const modal = document.getElementById('themeSettingsModal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
      this.updateActiveTheme();
    }
  }

  // 隐藏模态框
  hideModal() {
    const modal = document.getElementById('themeSettingsModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }

  // 更新活跃主题显示
  updateActiveTheme() {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
      option.classList.remove('active');
      if (option.dataset.theme === this.currentTheme) {
        option.classList.add('active');
      }
    });
  }

  // 设置主题
  setTheme(themeId) {
    if (this.currentTheme === themeId) return;

    this.currentTheme = themeId;

    // 应用主题到DOM
    this.applyTheme(themeId);

    // 更新活跃状态
    this.updateActiveTheme();

    // 保存到本地存储
    this.saveTheme();

    // 触发回调
    if (this.onThemeChangeCallback) {
      this.onThemeChangeCallback(themeId);
    }

    // 关闭模态框
    this.hideModal();
  }

  // 应用主题
  applyTheme(themeId) {
    const body = document.body;

    // 移除所有主题类
    this.themes.forEach(theme => {
      body.classList.remove(`theme-${theme.id}`);
      body.removeAttribute('data-theme');
    });

    // 添加新主题
    if (themeId !== 'default') {
      body.setAttribute('data-theme', themeId);
    }
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme;
  }

  // 设置主题变更回调
  setOnThemeChange(callback) {
    this.onThemeChangeCallback = callback;
  }

  // 加载保存的主题
  loadSavedTheme() {
    const settings = window.storageService?.loadSettings() || {};
    const savedTheme = settings.theme || 'default';
    this.setTheme(savedTheme);
  }

  // 保存主题设置
  saveTheme() {
    if (window.storageService) {
      const currentSettings = window.storageService.loadSettings() || {};
      currentSettings.theme = this.currentTheme;
      window.storageService.saveSettings(currentSettings);
    }
  }

  // 获取主题列表
  getThemes() {
    return this.themes;
  }

  // 获取主题信息
  getThemeInfo(themeId) {
    return this.themes.find(theme => theme.id === themeId);
  }
}

// 导出组件
window.ThemeSelector = ThemeSelector;