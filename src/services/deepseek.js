/**
 * DeepSeek API 服务模块
 * 用于与 DeepSeek API 进行交互
 */

class DeepSeekService {
    constructor() {
        this.defaultConfig = {
            endpoint: 'https://api.deepseek.com/chat/completions',
            model: 'deepseek-chat',
            systemPrompt: '你是一个专业的文本优化助手。请帮我优化以下文本，让它更清晰、准确、易懂。保持原文的主要意思，但可以改进表达方式、语法和结构。',
            maxTokens: 200000,
            temperature: 0.7,
            timeout: 30000
        };
    }

    /**
     * 调用 DeepSeek API 优化文本
     * @param {string} text - 要优化的文本
     * @param {Object} config - API 配置
     * @returns {Promise<string>} - 优化后的文本
     */
    async optimizeText(text, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        
        if (!finalConfig.apiKey) {
            throw new Error('API Key 未配置');
        }

        if (!text || text.trim() === '') {
            throw new Error('输入文本为空');
        }

        try {
            const response = await this.makeApiCall({
                endpoint: finalConfig.endpoint,
                apiKey: finalConfig.apiKey,
                model: finalConfig.model,
                messages: [
                    {
                        role: "system",
                        content: finalConfig.systemPrompt
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_tokens: finalConfig.maxTokens,
                temperature: finalConfig.temperature,
                stream: false
            }, finalConfig.timeout);

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content;
            } else {
                throw new Error('API 响应格式错误：未找到优化结果');
            }
        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * 批量优化文本段落
     * @param {Array<string>} paragraphs - 文本段落数组
     * @param {Object} config - API 配置
     * @returns {Promise<Array<string>>} - 优化后的段落数组
     */
    async optimizeParagraphs(paragraphs, config = {}) {
        const results = [];
        
        for (let i = 0; i < paragraphs.length; i++) {
            try {
                const optimized = await this.optimizeText(paragraphs[i], config);
                results.push(optimized);
                
                // 添加延迟避免请求过于频繁
                if (i < paragraphs.length - 1) {
                    await this.delay(1000);
                }
            } catch (error) {
                console.error(`优化第 ${i + 1} 段失败:`, error);
                results.push(paragraphs[i]); // 失败时返回原文
            }
        }
        
        return results;
    }

    /**
     * 测试 API 连接
     * @param {Object} config - API 配置
     * @returns {Promise<boolean>} - 连接是否成功
     */
    async testConnection(config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        
        if (!finalConfig.apiKey) {
            throw new Error('API Key 未配置');
        }

        try {
            const response = await this.makeApiCall({
                endpoint: finalConfig.endpoint,
                apiKey: finalConfig.apiKey,
                model: finalConfig.model,
                messages: [
                    {
                        role: "user",
                        content: "Hello"
                    }
                ],
                max_tokens: 10,
                stream: false
            }, 10000);

            return response.choices && response.choices.length > 0;
        } catch (error) {
            console.error('API 连接测试失败:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * 生成优化提示词
     * @param {string} purpose - 优化目的
     * @returns {string} - 生成的提示词
     */
    generateSystemPrompt(purpose) {
        const prompts = {
            'grammar': '你是一个专业的语法检查助手。请检查并修正以下文本中的语法错误、标点符号错误和拼写错误，保持原意不变。',
            'style': '你是一个专业的文本风格优化助手。请改进以下文本的表达方式，使其更加优雅、流畅和专业，但保持原意不变。',
            'clarity': '你是一个专业的文本清晰度优化助手。请让以下文本更加清晰、简洁和易懂，去除冗余表达，但保持完整信息。',
            'professional': '你是一个专业的商务写作助手。请将以下文本改写成更加正式和专业的表达方式。',
            'casual': '你是一个专业的口语化写作助手。请将以下文本改写成更加轻松和口语化的表达方式。',
            'expand': '你是一个专业的内容扩展助手。请在保持原意的基础上，为以下文本增加更多细节和说明。',
            'summarize': '你是一个专业的文本总结助手。请将以下文本进行精简和总结，保留核心信息。'
        };

        return prompts[purpose] || this.defaultConfig.systemPrompt;
    }

    /**
     * 执行 HTTP 请求
     * @param {Object} requestData - 请求数据
     * @param {number} timeout - 超时时间
     * @returns {Promise<Object>} - API 响应
     */
    async makeApiCall(requestData, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(requestData.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${requestData.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: requestData.model,
                    messages: requestData.messages,
                    max_tokens: requestData.max_tokens,
                    temperature: requestData.temperature,
                    stream: requestData.stream
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * 处理 API 错误
     * @param {Error} error - 原始错误
     * @returns {Error} - 处理后的错误
     */
    handleApiError(error) {
        if (error.name === 'AbortError') {
            return new Error('API 请求超时，请稍后重试');
        }

        if (error.message.includes('401')) {
            return new Error('API Key 无效，请检查配置');
        }

        if (error.message.includes('429')) {
            return new Error('API 请求频率过高，请稍后重试');
        }

        if (error.message.includes('500')) {
            return new Error('DeepSeek 服务器错误，请稍后重试');
        }

        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            return new Error('网络连接失败，请检查网络设置');
        }

        return error;
    }

    /**
     * 延迟执行
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} - Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 分割长文本
     * @param {string} text - 长文本
     * @param {number} maxLength - 最大长度
     * @returns {Array<string>} - 分割后的文本数组
     */
    splitLongText(text, maxLength = 2000) {
        if (text.length <= maxLength) {
            return [text];
        }

        const chunks = [];
        const paragraphs = text.split('\\n\\n');
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length <= maxLength) {
                currentChunk += (currentChunk ? '\\n\\n' : '') + paragraph;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                
                // 如果单个段落太长，进一步分割
                if (paragraph.length > maxLength) {
                    const sentences = paragraph.split(/[.!?。！？]/);
                    let sentenceChunk = '';
                    
                    for (const sentence of sentences) {
                        if ((sentenceChunk + sentence).length <= maxLength) {
                            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
                        } else {
                            if (sentenceChunk) {
                                chunks.push(sentenceChunk);
                            }
                            sentenceChunk = sentence;
                        }
                    }
                    
                    if (sentenceChunk) {
                        currentChunk = sentenceChunk;
                    }
                } else {
                    currentChunk = paragraph;
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        return chunks.length > 0 ? chunks : [text];
    }

    /**
     * 获取使用统计
     * @returns {Object} - 使用统计信息
     */
    getUsageStats() {
        const stats = JSON.parse(localStorage.getItem('deepseek-usage-stats') || '{}');
        return {
            totalRequests: stats.totalRequests || 0,
            totalTokens: stats.totalTokens || 0,
            totalCharacters: stats.totalCharacters || 0,
            lastUsed: stats.lastUsed || null
        };
    }

    /**
     * 更新使用统计
     * @param {number} tokens - 使用的 token 数
     * @param {number} characters - 处理的字符数
     */
    updateUsageStats(tokens = 0, characters = 0) {
        const stats = this.getUsageStats();
        stats.totalRequests++;
        stats.totalTokens += tokens;
        stats.totalCharacters += characters;
        stats.lastUsed = new Date().toISOString();
        
        localStorage.setItem('deepseek-usage-stats', JSON.stringify(stats));
    }
}

// 导出服务实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeepSeekService;
} else {
    window.DeepSeekService = DeepSeekService;
}