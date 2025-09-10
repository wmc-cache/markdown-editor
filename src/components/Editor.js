/**
 * 编辑器组件
 * 负责文本编辑区域的管理和事件处理
 */
class Editor {
  constructor(container, onContentChange) {
    this.container = container;
    this.onContentChange = onContentChange;
    this.editor = null;
    this.currentContent = '';
    
    this.init();
  }

  init() {
    // 创建编辑器文本域
    const textarea = document.createElement('textarea');
    textarea.id = 'editor-textarea';
    textarea.className = 'editor-textarea';
    textarea.placeholder = '在这里输入 Markdown 内容...';
    
    this.container.appendChild(textarea);
    this.editor = textarea;
    
    this.setupEventListeners();
    this.addStyles();
  }

  setupEventListeners() {
    // 内容变化监听
    this.editor.addEventListener('input', (e) => {
      this.currentContent = e.target.value;
      if (this.onContentChange) {
        this.onContentChange(this.currentContent);
      }
    });
    
    // 选择变化监听 - 使用多个事件确保捕获所有选择变化
    const updateSelection = () => {
      if (this.onSelectionChange) {
        const selection = this.getSelection();
        this.onSelectionChange(selection);
      }
    };
    
    this.editor.addEventListener('keyup', updateSelection);
    this.editor.addEventListener('mouseup', updateSelection);
    this.editor.addEventListener('click', updateSelection);
    this.editor.addEventListener('focus', updateSelection);
    
    // 使用定时器检查选中文本变化
    let lastSelection = '';
    setInterval(() => {
      if (this.editor && this.onSelectionChange) {
        const currentSelection = this.getSelectedText();
        if (currentSelection !== lastSelection) {
          lastSelection = currentSelection;
          try {
            this.onSelectionChange(this.getSelection());
          } catch (error) {
            console.error('Selection change callback error:', error);
          }
        }
      }
    }, 200);
  }

  // 获取编辑器内容
  getContent() {
    return this.currentContent;
  }

  // 设置编辑器内容
  setContent(content) {
    this.currentContent = content;
    this.editor.value = content;
  }

  // 获取选中的文本
  getSelectedText() {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    return this.currentContent.substring(start, end);
  }

  // 获取选择信息
  getSelection() {
    return {
      start: this.editor.selectionStart,
      end: this.editor.selectionEnd,
      text: this.getSelectedText(),
      hasSelection: this.editor.selectionStart !== this.editor.selectionEnd
    };
  }

  // 替换选中的文本
  replaceSelectedText(newText) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    
    const newContent = this.currentContent.substring(0, start) + 
                      newText + 
                      this.currentContent.substring(end);
    
    this.setContent(newContent);
    
    // 设置新的光标位置
    this.editor.selectionStart = start;
    this.editor.selectionEnd = start + newText.length;
    this.editor.focus();
    
    if (this.onContentChange) {
      this.onContentChange(newContent);
    }
  }

  // 替换全部内容
  replaceAllContent(newContent) {
    this.setContent(newContent);
    if (this.onContentChange) {
      this.onContentChange(newContent);
    }
  }

  // 获取光标位置信息
  getCursorInfo() {
    const content = this.currentContent;
    const cursorPos = this.editor.selectionStart;
    const beforeCursor = content.substring(0, cursorPos);
    const lines = content.split('\n');
    const currentLine = beforeCursor.split('\n').length;
    
    return {
      position: cursorPos,
      line: currentLine,
      totalLines: lines.length,
      column: beforeCursor.length - beforeCursor.lastIndexOf('\n') - 1
    };
  }

  // 获取字符统计
  getStats() {
    const content = this.currentContent;
    const lines = content.split('\n');
    const cursorInfo = this.getCursorInfo();
    
    return {
      charCount: content.length,
      wordCount: content.match(/\S+/g)?.length || 0,
      lineCount: lines.length,
      currentLine: cursorInfo.line,
      currentColumn: cursorInfo.column
    };
  }

  // 聚焦编辑器
  focus() {
    this.editor.focus();
  }

  // 设置选择变化回调
  setOnSelectionChange(callback) {
    this.onSelectionChange = callback;
  }

  // 添加样式
  addStyles() {
    const styleId = 'editor-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
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
      document.head.appendChild(style);
    }
  }

  // 清理
  destroy() {
    if (this.editor) {
      this.editor.remove();
      this.editor = null;
    }
  }
}

// 将类挂载到全局对象
window.Editor = Editor;