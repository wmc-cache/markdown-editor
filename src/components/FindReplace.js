/**
 * 查找替换组件
 * 提供查找和替换文本的功能
 */
class FindReplace {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.findInput = null;
    this.replaceInput = null;
    this.caseSensitive = false;
    this.wholeWord = false;
    this.useRegex = false;

    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.isReplaceMode = false;

    this.init();
  }

  init() {
    this.setupElements();
    this.setupEventListeners();
  }

  setupElements() {
    this.panel = document.getElementById('findReplacePanel');
    this.findInput = document.getElementById('findInput');
    this.replaceInput = document.getElementById('replaceInput');
    this.replaceSection = document.getElementById('replaceSection');

    this.findPrevBtn = document.getElementById('findPrevBtn');
    this.findNextBtn = document.getElementById('findNextBtn');
    this.replaceBtn = document.getElementById('replaceBtn');
    this.replaceAllBtn = document.getElementById('replaceAllBtn');
    this.closeFindReplaceBtn = document.getElementById('closeFindReplace');
    this.findResults = document.getElementById('findResults');

    this.caseSensitiveCheckbox = document.getElementById('caseSensitive');
    this.wholeWordCheckbox = document.getElementById('wholeWord');
    this.useRegexCheckbox = document.getElementById('useRegex');
  }

  setupEventListeners() {
    // 查找输入框事件
    this.findInput.addEventListener('input', () => {
      this.performFind();
    });

    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 替换输入框事件
    this.replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.replaceNext();
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 按钮事件
    this.findPrevBtn.addEventListener('click', () => this.findPrevious());
    this.findNextBtn.addEventListener('click', () => this.findNext());
    this.replaceBtn.addEventListener('click', () => this.replaceNext());
    this.replaceAllBtn.addEventListener('click', () => this.replaceAll());
    this.closeFindReplaceBtn.addEventListener('click', () => this.hide());

    // 选项复选框事件
    this.caseSensitiveCheckbox.addEventListener('change', () => {
      this.caseSensitive = this.caseSensitiveCheckbox.checked;
      this.performFind();
    });

    this.wholeWordCheckbox.addEventListener('change', () => {
      this.wholeWord = this.wholeWordCheckbox.checked;
      this.performFind();
    });

    this.useRegexCheckbox.addEventListener('change', () => {
      this.useRegex = this.useRegexCheckbox.checked;
      this.performFind();
    });
  }

  show(isReplaceMode = false) {
    this.isReplaceMode = isReplaceMode;
    this.panel.style.display = 'block';

    // 显示或隐藏替换部分
    if (isReplaceMode) {
      this.replaceSection.style.display = 'flex';
    } else {
      this.replaceSection.style.display = 'none';
    }

    // 如果有选中的文本，将其设置为查找文本
    const selectedText = this.editor.getSelectedText();
    if (selectedText && selectedText.length < 100) {
      this.findInput.value = selectedText;
    }

    this.findInput.focus();
    this.findInput.select();

    if (this.findInput.value) {
      this.performFind();
    }
  }

  hide() {
    this.panel.style.display = 'none';
    this.clearHighlights();
    this.editor.focus();
  }

  performFind() {
    const query = this.findInput.value;
    this.clearHighlights();
    this.currentMatches = [];
    this.currentMatchIndex = -1;

    if (!query) {
      this.updateResults();
      return;
    }

    try {
      const content = this.editor.getContent();
      const matches = this.findMatches(content, query);

      this.currentMatches = matches;
      this.highlightMatches();
      this.updateResults();

      if (matches.length > 0) {
        this.currentMatchIndex = 0;
        this.selectMatch(0);
      }
    } catch (error) {
      console.error('查找错误:', error);
      this.findResults.textContent = '查找表达式错误';
    }
  }

  findMatches(content, query) {
    const matches = [];
    let regex;

    try {
      if (this.useRegex) {
        const flags = this.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(query, flags);
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let pattern = this.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
        const flags = this.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(pattern, flags);
      }

      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });

        // 防止无限循环
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    } catch (error) {
      throw new Error('正则表达式错误');
    }

    return matches;
  }

  highlightMatches() {
    // 这里可以添加高亮显示的逻辑
    // 由于使用的是简单的 textarea，我们暂时跳过视觉高亮
    // 在未来升级到 Monaco Editor 时可以添加更好的高亮效果
  }

  clearHighlights() {
    // 清除高亮显示
  }

  selectMatch(index) {
    if (index < 0 || index >= this.currentMatches.length) {
      return;
    }

    const match = this.currentMatches[index];
    this.editor.setSelection(match.start, match.end);
    this.currentMatchIndex = index;
    this.updateResults();
  }

  findNext() {
    if (this.currentMatches.length === 0) {
      return;
    }

    const nextIndex = (this.currentMatchIndex + 1) % this.currentMatches.length;
    this.selectMatch(nextIndex);
  }

  findPrevious() {
    if (this.currentMatches.length === 0) {
      return;
    }

    const prevIndex = this.currentMatchIndex <= 0
      ? this.currentMatches.length - 1
      : this.currentMatchIndex - 1;
    this.selectMatch(prevIndex);
  }

  replaceNext() {
    if (this.currentMatchIndex === -1 || this.currentMatches.length === 0) {
      return;
    }

    const replaceText = this.replaceInput.value;
    const match = this.currentMatches[this.currentMatchIndex];

    // 执行替换
    const content = this.editor.getContent();
    const newContent = content.slice(0, match.start) +
                      replaceText +
                      content.slice(match.end);

    this.editor.setContent(newContent);

    // 更新光标位置
    const newCursorPos = match.start + replaceText.length;
    this.editor.setCursor(newCursorPos);

    // 重新查找以更新匹配位置
    this.performFind();
  }

  replaceAll() {
    if (this.currentMatches.length === 0) {
      return;
    }

    const replaceText = this.replaceInput.value;
    const content = this.editor.getContent();

    // 从后往前替换，避免位置偏移问题
    let newContent = content;
    for (let i = this.currentMatches.length - 1; i >= 0; i--) {
      const match = this.currentMatches[i];
      newContent = newContent.slice(0, match.start) +
                   replaceText +
                   newContent.slice(match.end);
    }

    this.editor.setContent(newContent);

    // 显示替换结果
    const replacedCount = this.currentMatches.length;
    this.findResults.textContent = `已替换 ${replacedCount} 处`;

    // 清除匹配
    this.currentMatches = [];
    this.currentMatchIndex = -1;

    setTimeout(() => {
      this.performFind();
    }, 1000);
  }

  updateResults() {
    if (this.currentMatches.length === 0) {
      this.findResults.textContent = this.findInput.value ? '未找到' : '';
    } else {
      this.findResults.textContent = `${this.currentMatchIndex + 1} / ${this.currentMatches.length}`;
    }
  }
}

// 导出组件
window.FindReplace = FindReplace;