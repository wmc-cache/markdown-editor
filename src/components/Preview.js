/**
 * 预览组件
 * 负责 Markdown 内容的实时预览渲染
 */
class Preview {
  constructor(container, markdownParser) {
    this.container = container;
    this.markdownParser = markdownParser;
    this.previewElement = null;
    
    this.init();
  }

  init() {
    // 预览容器已经存在于 HTML 中，直接获取
    this.previewElement = this.container;
  }

  // 更新预览内容
  update(markdownContent) {
    if (!markdownContent || markdownContent.trim() === '') {
      this.showEmptyState();
    } else {
      this.renderMarkdown(markdownContent);
    }
  }

  // 渲染 Markdown
  renderMarkdown(content) {
    const html = this.markdownParser.render(content);
    // 使用居中限制容器，保持内容在大宽度下也居中显示
    this.previewElement.innerHTML = `
      <div class="preview-content">${html}</div>
    `;
  }

  // 显示空白状态
  showEmptyState() {
    this.previewElement.innerHTML = `
      <div class="preview-content">
        <div class="empty-state">
          <h2>欢迎使用 Markdown 编辑器</h2>
          <p>开始输入 Markdown 内容，右侧将显示实时预览</p>
          <div class="features">
            <h3>功能特性：</h3>
            <ul>
              <li>实时 Markdown 预览</li>
              <li>DeepSeek AI 提示词优化</li>
              <li>明暗主题切换</li>
              <li>文件管理功能</li>
              <li>丰富的快捷键支持</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // 滚动到指定位置
  scrollTo(position) {
    if (position === 'top') {
      this.previewElement.scrollTop = 0;
    } else if (position === 'bottom') {
      this.previewElement.scrollTop = this.previewElement.scrollHeight;
    } else if (typeof position === 'number') {
      this.previewElement.scrollTop = position;
    }
  }

  // 获取滚动位置
  getScrollPosition() {
    return {
      top: this.previewElement.scrollTop,
      height: this.previewElement.scrollHeight,
      viewHeight: this.previewElement.clientHeight
    };
  }

  // 同步滚动
  syncScroll(percentage) {
    const maxScroll = this.previewElement.scrollHeight - this.previewElement.clientHeight;
    this.previewElement.scrollTop = maxScroll * percentage;
  }

  // 清空预览
  clear() {
    this.previewElement.innerHTML = '';
  }

  // 显示加载状态
  showLoading() {
    this.previewElement.innerHTML = `
      <div class="preview-loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    `;
  }

  // 显示错误信息
  showError(message) {
    this.previewElement.innerHTML = `
      <div class="preview-error">
        <h3>预览出错</h3>
        <p>${message}</p>
      </div>
    `;
  }

  // 导出 HTML
  exportHTML() {
    return this.previewElement.innerHTML;
  }

  // 打印预览
  print() {
    const printWindow = window.open('', '_blank');
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Markdown Preview</title>
        <style>
          ${styles}
          @media print {
            body { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        ${this.previewElement.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  }

  // 清理
  destroy() {
    this.clear();
  }
}

// 将类挂载到全局对象
window.Preview = Preview;
