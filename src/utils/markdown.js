/**
 * Markdown 工具模块
 * 提供 Markdown 解析器初始化和相关工具函数
 */

// 初始化 Markdown 解析器
function initMarkdownParser() {
  if (!window.markdownit) {
    console.error('markdown-it library not loaded');
    return null;
  }

  const md = window.markdownit({
    html: true,           // 允许 HTML 标签
    linkify: true,        // 自动转换 URL 为链接
    typographer: true,    // 启用智能引号等排版功能
    breaks: true,         // 转换换行符为 <br>
    
    // 代码高亮配置
    highlight: function (str, lang) {
      if (lang && window.hljs && window.hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code class="language-${lang}">` +
                 window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                 '</code></pre>';
        } catch (error) {
          console.error('Code highlighting error:', error);
        }
      }

      // 使用默认的代码块渲染
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
  });

  // 添加插件和自定义规则
  configureMarkdownPlugins(md);
  
  return md;
}

// 配置 Markdown 插件
function configureMarkdownPlugins(md) {
  // 自定义链接渲染，添加 target="_blank"
  const defaultLinkRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  
  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const aIndex = tokens[idx].attrIndex('target');
    
    if (aIndex < 0) {
      tokens[idx].attrPush(['target', '_blank']);
    } else {
      tokens[idx].attrs[aIndex][1] = '_blank';
    }
    
    // 添加 rel="noopener noreferrer" 以提高安全性
    const relIndex = tokens[idx].attrIndex('rel');
    if (relIndex < 0) {
      tokens[idx].attrPush(['rel', 'noopener noreferrer']);
    }
    
    return defaultLinkRender(tokens, idx, options, env, self);
  };

  // 自定义表格渲染，添加响应式类
  const defaultTableRender = md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  
  md.renderer.rules.table_open = function(tokens, idx, options, env, self) {
    tokens[idx].attrPush(['class', 'markdown-table']);
    return defaultTableRender(tokens, idx, options, env, self);
  };

  // 添加任务列表支持
  md.use(taskListPlugin);
}

// 任务列表插件
function taskListPlugin(md) {
  md.core.ruler.after('inline', 'task-list', function(state) {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') continue;
      
      const content = tokens[i].content;
      const checkboxRegex = /^\[([ xX])\] /;
      
      if (checkboxRegex.test(content)) {
        const checked = content[1] !== ' ';
        const checkbox = checked 
          ? '<input type="checkbox" checked disabled> '
          : '<input type="checkbox" disabled> ';
        
        tokens[i].content = content.replace(checkboxRegex, checkbox);
        
        // 添加任务列表类
        if (tokens[i - 2] && tokens[i - 2].type === 'list_item_open') {
          tokens[i - 2].attrPush(['class', 'task-list-item']);
        }
      }
    }
  });
}

// Markdown 工具函数
const markdownUtils = {
  // 转换 Markdown 为纯文本
  toPlainText(markdown) {
    // 移除 Markdown 语法
    let text = markdown;
    
    // 移除代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]*`/g, '');
    
    // 移除链接
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
    
    // 移除图片
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // 移除标题标记
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // 移除强调标记
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // 移除列表标记
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    // 移除引用标记
    text = text.replace(/^>\s+/gm, '');
    
    // 移除水平线
    text = text.replace(/^([-*_]){3,}$/gm, '');
    
    return text.trim();
  },

  // 计算阅读时间（分钟）
  calculateReadTime(markdown) {
    const text = this.toPlainText(markdown);
    const wordsPerMinute = 200; // 平均阅读速度
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  },

  // 提取标题结构
  extractHeadings(markdown) {
    const headings = [];
    const lines = markdown.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2],
          line: index + 1
        });
      }
    });
    
    return headings;
  },

  // 生成目录
  generateTOC(markdown) {
    const headings = this.extractHeadings(markdown);
    let toc = '## 目录\n\n';
    
    headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      const anchor = this.generateAnchor(heading.text);
      toc += `${indent}- [${heading.text}](#${anchor})\n`;
    });
    
    return toc;
  },

  // 生成锚点
  generateAnchor(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  // 统计 Markdown 信息
  getStatistics(markdown) {
    const text = this.toPlainText(markdown);
    const lines = markdown.split('\n');
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // 统计各种元素
    const codeBlocks = (markdown.match(/```/g) || []).length / 2;
    const links = (markdown.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
    const images = (markdown.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length;
    const headings = this.extractHeadings(markdown).length;
    
    return {
      lines: lines.length,
      words: words.length,
      characters,
      charactersNoSpaces,
      paragraphs: text.split(/\n\n+/).filter(p => p.trim()).length,
      readTime: this.calculateReadTime(markdown),
      codeBlocks,
      links,
      images,
      headings
    };
  },

  // 插入 Markdown 语法
  insertSyntax(text, syntax) {
    const syntaxMap = {
      bold: { prefix: '**', suffix: '**' },
      italic: { prefix: '*', suffix: '*' },
      strikethrough: { prefix: '~~', suffix: '~~' },
      code: { prefix: '`', suffix: '`' },
      link: { prefix: '[', suffix: '](url)' },
      image: { prefix: '![', suffix: '](url)' },
      h1: { prefix: '# ', suffix: '' },
      h2: { prefix: '## ', suffix: '' },
      h3: { prefix: '### ', suffix: '' },
      ul: { prefix: '- ', suffix: '' },
      ol: { prefix: '1. ', suffix: '' },
      quote: { prefix: '> ', suffix: '' },
      hr: { prefix: '\n---\n', suffix: '' },
      codeblock: { prefix: '```\n', suffix: '\n```' }
    };
    
    const s = syntaxMap[syntax];
    if (!s) return text;
    
    return s.prefix + text + s.suffix;
  }
};

// 将函数和工具挂载到全局对象
window.markdownUtils = {
  initMarkdownParser,
  markdownUtils
};