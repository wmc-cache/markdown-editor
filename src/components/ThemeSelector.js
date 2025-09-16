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

    // 缓存 DOM 元素
    this.cachedElements = {
      modal: null,
      themeOptions: null,
      body: null
    };

    this.init();
  }

  init() {
    // 缓存常用 DOM 元素
    this.cacheElements();
    this.setupEventListeners();
    this.loadSavedTheme();
  }

  // 缓存 DOM 元素避免重复查询
  cacheElements() {
    this.cachedElements.modal = document.getElementById('themeSettingsModal');
    this.cachedElements.body = document.body;
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
    const modal = this.cachedElements.modal;
    if (modal) {
      // 使用 requestAnimationFrame 优化动画
      requestAnimationFrame(() => {
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
          modal.classList.add('show');
        });
      });
      this.updateActiveTheme();
    }
  }

  // 隐藏模态框
  hideModal() {
    const modal = this.cachedElements.modal;
    if (modal) {
      modal.classList.remove('show');
      // 使用 transitionend 事件而非 setTimeout
      const handleTransitionEnd = () => {
        modal.style.display = 'none';
        modal.removeEventListener('transitionend', handleTransitionEnd);
      };
      modal.addEventListener('transitionend', handleTransitionEnd);

      // 备用超时机制
      setTimeout(() => {
        if (modal.style.display !== 'none') {
          modal.style.display = 'none';
          modal.removeEventListener('transitionend', handleTransitionEnd);
        }
      }, 300);
    }
  }

  // 更新活跃主题显示
  updateActiveTheme() {
    // 缓存主题选项元素
    if (!this.cachedElements.themeOptions) {
      this.cachedElements.themeOptions = document.querySelectorAll('.theme-option');
    }

    // 使用 DocumentFragment 批量更新 DOM
    this.cachedElements.themeOptions.forEach(option => {
      const isActive = option.dataset.theme === this.currentTheme;
      option.classList.toggle('active', isActive);
    });
  }

  // 设置主题
  setTheme(themeId) {
    if (this.currentTheme === themeId) return;

    // 使用节流避免频繁切换
    if (this.themeChangeTimeout) {
      clearTimeout(this.themeChangeTimeout);
    }

    this.themeChangeTimeout = setTimeout(() => {
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
    }, 50);
  }

  // 应用主题
  applyTheme(themeId) {
    const body = this.cachedElements.body;

    // 使用单次操作优化性能
    if (this.currentTheme !== 'default') {
      body.removeAttribute('data-theme');
    }

    // 添加新主题
    if (themeId !== 'default') {
      body.setAttribute('data-theme', themeId);
    }

    // 强制重排优化
    body.offsetHeight;
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