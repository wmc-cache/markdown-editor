/**
 * 图像生成组件
 */

class ImageGenerator {
  constructor() {
    this.modal = null;
    this.promptInput = null;
    this.modelSelect = null;
    this.generateButton = null;
    this.imagePreview = null;
    this.generatedImage = null;
    this.imageInfo = null;
    
    this.currentImageData = null;
    this.onImageGenerated = null;
    
    this.init();
  }
  
  init() {
    this.setupElements();
    this.setupEventListeners();
  }
  
  setupElements() {
    this.modal = document.getElementById('imageGenerationModal');
    this.promptInput = document.getElementById('imagePrompt');
    this.modelSelect = document.getElementById('imageModel');
    this.generateButton = document.getElementById('generateImageAction');
    this.imagePreview = document.getElementById('imagePreview');
    this.generatedImage = document.getElementById('generatedImage');
    this.imageInfo = document.getElementById('imageInfo');
  }
  
  setupEventListeners() {
    // 关闭模态框
    document.getElementById('closeImageGeneration').addEventListener('click', () => {
      this.hide();
    });
    
    // 点击模态框外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
    
    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
    
    // 生成图像按钮
    this.generateButton.addEventListener('click', () => {
      this.generateImage();
    });
    
    // 清空按钮
    document.getElementById('clearImagePrompt').addEventListener('click', () => {
      this.clearForm();
    });
    
    // 插入到文档
    document.getElementById('insertImageBtn').addEventListener('click', () => {
      this.insertImageToDocument();
    });
    
    // 下载图像
    document.getElementById('downloadImageBtn').addEventListener('click', () => {
      this.downloadImage();
    });
    
    // 复制图像
    document.getElementById('copyImageBtn').addEventListener('click', () => {
      this.copyImageToClipboard();
    });
    
    // 提示词输入框快捷键
    this.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.generateImage();
      }
    });
  }
  
  show() {
    this.modal.style.display = 'flex';
    this.promptInput.focus();
    
    // 检查智谱 API Key
    try {
      window.cogviewService.ensureZhipuApiKey();
    } catch (error) {
      this.showError(error.message);
      return;
    }
  }
  
  hide() {
    this.modal.style.display = 'none';
    this.clearPreview();
  }
  
  isVisible() {
    return this.modal.style.display === 'flex';
  }
  
  async generateImage() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      this.showError('请输入图像描述');
      this.promptInput.focus();
      return;
    }
    
    const model = this.modelSelect.value;
    
    this.setGeneratingState(true);
    this.clearPreview();
    
    try {
      const result = await window.cogviewService.generateImage(prompt, { model });
      
      if (result.images && result.images.length > 0) {
        this.currentImageData = {
          ...result,
          prompt: prompt,
          model: model
        };
        
        this.showImageResult(result.images[0]);
        
        if (this.onImageGenerated) {
          this.onImageGenerated(this.currentImageData);
        }
      } else {
        this.showError('未生成任何图像');
      }
    } catch (error) {
      this.showError(`生成失败: ${error.message}`);
    } finally {
      this.setGeneratingState(false);
    }
  }
  
  showImageResult(imageData) {
    this.generatedImage.src = imageData.url;
    this.generatedImage.alt = this.promptInput.value;
    
    // 显示图像信息
    const info = [];
    info.push(`模型: ${this.modelSelect.options[this.modelSelect.selectedIndex].text}`);
    info.push(`提示词: ${this.promptInput.value}`);
    
    if (imageData.revised_prompt) {
      info.push(`优化提示词: ${imageData.revised_prompt}`);
    }
    
    if (this.currentImageData.usage) {
      info.push(`用量信息: ${JSON.stringify(this.currentImageData.usage)}`);
    }
    
    info.push(`生成时间: ${new Date(this.currentImageData.timestamp).toLocaleString()}`);
    
    this.imageInfo.innerHTML = info.join('<br>');
    this.imagePreview.style.display = 'block';
  }
  
  clearPreview() {
    this.imagePreview.style.display = 'none';
    this.generatedImage.src = '';
    this.imageInfo.innerHTML = '';
    this.currentImageData = null;
  }
  
  clearForm() {
    this.promptInput.value = '';
    this.modelSelect.selectedIndex = 0;
    this.clearPreview();
    this.promptInput.focus();
  }
  
  setGeneratingState(isGenerating) {
    const buttonText = this.generateButton.querySelector('.btn-text');
    const buttonLoading = this.generateButton.querySelector('.btn-loading');
    
    if (isGenerating) {
      buttonText.style.display = 'none';
      buttonLoading.style.display = 'flex';
      this.generateButton.disabled = true;
    } else {
      buttonText.style.display = 'inline';
      buttonLoading.style.display = 'none';
      this.generateButton.disabled = false;
    }
  }
  
  showError(message) {
    // 使用应用的通知系统或简单的 alert
    alert(message);
  }
  
  async insertImageToDocument() {
    if (!this.currentImageData) {
      this.showError('没有可插入的图像');
      return;
    }
    
    try {
      const imageUrl = this.currentImageData.images[0].url;
      const altText = this.promptInput.value;
      const markdown = window.cogviewService.generateMarkdownImage(imageUrl, altText);
      
      if (this.onInsertImage) {
        this.onInsertImage(markdown);
      }
      
      this.hide();
    } catch (error) {
      console.error('插入图像失败:', error);
      this.showError('插入图像失败');
    }
  }
  
  async downloadImage() {
    if (!this.currentImageData) {
      this.showError('没有可下载的图像');
      return;
    }
    
    try {
      const imageUrl = this.currentImageData.images[0].url;
      const filename = `cogview_${this.currentImageData.model}_${Date.now()}.png`;
      
      await window.cogviewService.downloadImage(imageUrl, filename);
    } catch (error) {
      this.showError('下载图像失败');
    }
  }
  
  async copyImageToClipboard() {
    if (!this.currentImageData) {
      this.showError('没有可复制的图像');
      return;
    }
    
    try {
      const imageUrl = this.currentImageData.images[0].url;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      
      // 显示成功提示
      this.showSuccess('图像已复制到剪贴板');
    } catch (error) {
      // 降级方案：复制图像 URL
      try {
        await navigator.clipboard.writeText(this.currentImageData.images[0].url);
        this.showSuccess('图像链接已复制到剪贴板');
      } catch (urlError) {
        this.showError('复制失败');
      }
    }
  }
  
  showSuccess(message) {
    // 临时显示成功消息
    const originalInfo = this.imageInfo.innerHTML;
    this.imageInfo.innerHTML = `<span style="color: var(--bg-ai);">✓ ${message}</span>`;
    setTimeout(() => {
      this.imageInfo.innerHTML = originalInfo;
    }, 3000);
  }
  
  // 设置回调函数
  setOnImageGenerated(callback) {
    this.onImageGenerated = callback;
  }
  
  setOnInsertImage(callback) {
    this.onInsertImage = callback;
  }
  
  // 获取历史生成记录
  getHistory() {
    return JSON.parse(localStorage.getItem('cogview_history') || '[]');
  }
  
  // 保存到历史记录
  saveToHistory(imageData) {
    const history = this.getHistory();
    history.unshift(imageData);
    
    // 限制历史记录数量
    if (history.length > 50) {
      history.splice(50);
    }
    
    localStorage.setItem('cogview_history', JSON.stringify(history));
  }
  
  // 清除历史记录
  clearHistory() {
    localStorage.removeItem('cogview_history');
  }
}

// 全局实例
window.ImageGenerator = ImageGenerator;