/**
 * CogView 图像生成服务
 */

class CogViewService {
  constructor() {
    this.apiBaseUrl = 'https://open.bigmodel.cn/api/paas/v4/images/generations';
    this.apiKey = '';
    this.defaultModel = 'cogview-4';
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * 生成图像
   */
  async generateImage(prompt, options = {}) {
    console.log('CogView API Key:', this.apiKey);
    if (!this.apiKey) {
      throw new Error('请先配置智谱 API Key');
    }

    if (!prompt || !prompt.trim()) {
      throw new Error('请输入图像生成提示词');
    }

    const requestBody = {
      model: options.model || this.defaultModel,
      prompt: prompt.trim(),
      ...options
    };

    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || '图像生成失败');
      }

      return this.processImageResult(result);
    } catch (error) {
      console.error('CogView API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 处理图像生成结果
   */
  processImageResult(result) {
    if (!result.data || !result.data.length) {
      throw new Error('未收到图像数据');
    }

    return {
      id: this.generateImageId(),
      timestamp: Date.now(),
      images: result.data.map(item => ({
        url: item.url,
        revised_prompt: item.revised_prompt || null
      })),
      usage: result.usage || null
    };
  }

  /**
   * 生成图像 ID
   */
  generateImageId() {
    return `cogview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 下载图像到本地
   */
  async downloadImage(imageUrl, filename) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `cogview_image_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('下载图像失败:', error);
      throw error;
    }
  }

  /**
   * 将图像转换为 base64
   */
  async imageToBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`获取图像失败: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('图像转换失败:', error);
      throw error;
    }
  }

  /**
   * 生成 Markdown 图片语法
   */
  generateMarkdownImage(imageUrl, alt = '生成的图像', title = '') {
    return `![${alt}](${imageUrl}${title ? ` "${title}"` : ''})`;
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(apiKey) {
    const originalKey = this.apiKey;
    this.apiKey = apiKey;

    try {
      // 使用简单的提示词测试 API
      await this.generateImage('test', { model: 'cogview-3' });
      return true;
    } catch (error) {
      console.warn('API Key 验证失败:', error.message);
      return false;
    } finally {
      this.apiKey = originalKey;
    }
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels() {
    return [
      { id: 'cogview-3', name: 'CogView-3', description: '高质量图像生成模型' },
      { id: 'cogview-4', name: 'CogView-4', description: '最新版本，支持中文字符生成' }
    ];
  }
}

// 全局实例
window.cogviewService = new CogViewService();