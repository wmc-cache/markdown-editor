/**
 * 流式优化处理组件
 * 提供实时的AI优化进度显示和流式响应处理
 */
class StreamingOptimizer {
  constructor() {
    this.modal = null;
    this.isActive = false;
    this.currentRequest = null;
    this.abortController = null;
    this.streamingText = '';
    this.originalText = '';
    this.onApplyCallback = null;

    this.init();
  }

  init() {
    this.setupElements();
    this.setupEventListeners();
  }

  setupElements() {
    this.modal = document.getElementById('optimizationProgressModal');
    this.statusElement = document.getElementById('optimizationStatus');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.originalContent = document.getElementById('originalContent');
    this.streamingContentElement = document.getElementById('streamingContent');
    this.streamingIndicator = document.getElementById('streamingIndicator');
    this.cancelBtn = document.getElementById('cancelOptimization');
    this.applyBtn = document.getElementById('applyStreamingResult');
  }

  setupEventListeners() {
    // 取消按钮
    this.cancelBtn.addEventListener('click', () => {
      this.cancel();
    });

    // 应用结果按钮
    this.applyBtn.addEventListener('click', () => {
      this.applyResult();
    });

    // ESC 键取消
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.cancel();
      }
    });
  }

  show(originalText, onApplyCallback) {
    this.originalText = originalText;
    this.onApplyCallback = onApplyCallback;
    this.streamingText = '';
    this.isActive = true;

    // 显示原始文本
    this.originalContent.textContent = originalText;
    this.streamingContentElement.innerHTML = '';

    // 重置进度
    this.updateProgress(0, '正在连接服务...');
    this.applyBtn.style.display = 'none';

    // 显示模态框
    this.modal.style.display = 'flex';
    setTimeout(() => this.modal.classList.add('show'), 10);
  }

  hide() {
    this.isActive = false;
    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  cancel() {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.hide();
  }

  setAbortController(controller) {
    this.abortController = controller;
  }

  updateProgress(percentage, status) {
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = `${Math.round(percentage)}%`;
    if (status) {
      this.statusElement.textContent = status;
    }
  }

  appendStreamContent(chunk) {
    this.streamingContentElement.innerHTML += chunk;
    // 自动滚动到底部
    this.streamingContentElement.scrollTop = this.streamingContentElement.scrollHeight;
  }

  setStreamContent(content) {
    this.streamingContentElement.textContent = content;
    this.streamingContentElement.scrollTop = this.streamingContentElement.scrollHeight;
  }

  completeStreaming(finalContent) {
    this.streamingText = finalContent;
    this.setStreamContent(finalContent);
    this.streamingIndicator.style.display = 'none';
    this.updateProgress(100, '优化完成');
    this.applyBtn.style.display = 'inline-block';
  }

  applyResult() {
    if (this.onApplyCallback && this.streamingText) {
      this.onApplyCallback(this.streamingText);
    }
    this.hide();
  }

  showError(error) {
    this.updateProgress(0, `错误: ${error}`);
    this.streamingIndicator.style.display = 'none';
    setTimeout(() => {
      if (this.isActive) {
        this.hide();
      }
    }, 3000);
  }

  // 模拟流式处理的方法（用于测试）
  simulateStreaming(finalText, duration = 3000) {
    // 按字符分割，更平滑的效果
    const chars = finalText.split('');
    const totalChars = chars.length;
    let currentIndex = 0;
    let currentContent = '';

    this.updateProgress(30, '正在生成优化内容...');
    this.setStreamContent(''); // 清空内容开始流式显示

    const streamInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(streamInterval);
        return;
      }

      if (currentIndex < totalChars) {
        const char = chars[currentIndex];
        currentContent += char;
        this.setStreamContent(currentContent + '|'); // 添加光标效果
        currentIndex++;

        const progress = 30 + (currentIndex / totalChars) * 60;
        this.updateProgress(progress, '正在生成优化内容...');
      } else {
        clearInterval(streamInterval);
        this.streamingText = finalText;
        this.completeStreaming(finalText);
      }
    }, duration / totalChars);
  }
}

// 导出组件
window.StreamingOptimizer = StreamingOptimizer;