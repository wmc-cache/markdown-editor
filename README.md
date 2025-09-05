# Markdown 编辑器 - 集成 DeepSeek AI

这是一个基于 Electron 开发的 Markdown 编辑器，集成了 DeepSeek AI 模型，可以智能优化你的文本内容。

## 功能特性

- 🎨 **实时预览** - 三栏布局，文件树、编辑器、实时预览
- 📁 **文件夹管理** - 打开文件夹，文件树浏览，快速切换文件
- 🤖 **AI 优化** - 集成 DeepSeek AI，智能优化文本内容
- 🌙 **主题切换** - 支持明亮和暗色主题
- 💾 **文件管理** - 新建、打开、保存 Markdown 文件
- ⌨️ **快捷键支持** - 丰富的键盘快捷键
- 📱 **响应式设计** - 适配不同屏幕尺寸

## 安装依赖

```bash
# 进入项目目录
cd markdown-editor-deepseek

# 安装依赖
npm install

# 如果遇到权限问题，可以使用临时缓存目录
npm install --cache ./.npm-cache
```

## 运行应用

```bash
# 开发模式
npm start

# 或者使用 electron 直接运行
npx electron .
```

## 使用方法

### 1. 基本编辑
- 在左侧编辑器中输入 Markdown 内容
- 右侧会实时显示预览效果
- 支持完整的 Markdown 语法

### 2. AI 优化功能
1. 点击设置按钮（⚙️）配置 DeepSeek API
2. 输入你的 API Key
3. 选择文本后点击"优化选中"或点击"优化全文"
4. AI 会自动优化你的文本内容

### 3. 文件操作
- `Ctrl/Cmd + N` - 新建文件
- `Ctrl/Cmd + O` - 打开文件
- `Ctrl/Cmd + Shift + O` - 打开文件夹
- `Ctrl/Cmd + S` - 保存文件
- `Ctrl/Cmd + Shift + S` - 另存为

### 4. 文件夹管理
- 点击工具栏的"📁 打开文件夹"按钮选择文件夹
- 左侧文件树显示所有 Markdown 文件（.md、.markdown、.txt）
- 点击文件可直接切换编辑
- 右键文件可在文件管理器中显示
- 点击"◀"按钮可隐藏/显示文件树

### 5. AI 优化快捷键
- `Ctrl/Cmd + Alt + O` - 优化选中文本
- `Ctrl/Cmd + Alt + A` - 优化全文

## DeepSeek API 配置

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 注册并登录账户
3. 创建 API Key
4. 在应用中点击设置按钮配置 API Key

### API 设置选项
- **API Key**: 你的 DeepSeek API 密钥
- **API 地址**: 默认为 `https://api.deepseek.com/chat/completions`
- **模型**: 推荐使用 `deepseek-chat`
- **系统提示词**: 自定义 AI 优化的方向和风格

## 项目结构

```
markdown-editor-deepseek/
├── main.js                 # Electron 主进程
├── preload.js              # 预加载脚本
├── package.json            # 项目配置
├── example.md              # 示例 Markdown 文件
├── src/
│   ├── index.html          # 主页面
│   ├── renderer.js         # 渲染进程逻辑
│   ├── services/
│   │   └── deepseek.js     # DeepSeek API 服务
│   └── styles/
│       └── main.css        # 样式文件
└── README.md               # 项目说明
```

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **JavaScript** - 应用逻辑开发语言
- **HTML/CSS** - 用户界面
- **markdown-it** - Markdown 解析和渲染
- **axios** - HTTP 请求库
- **DeepSeek API** - AI 文本优化服务

## 常见问题

### Q: AI 优化功能无法使用？
A: 请检查以下几点：
- 确认 API Key 配置正确
- 检查网络连接
- 验证 API 配额是否充足

### Q: 应用无法启动？
A: 请确保：
- Node.js 版本 >= 14
- 所有依赖都已正确安装
- Electron 安装成功

### Q: 预览显示异常？
A: 尝试：
- 刷新页面 (Ctrl/Cmd + R)
- 检查 Markdown 语法
- 切换主题试试

## 开发说明

### 添加新功能
1. 在 `src/renderer.js` 中添加新的功能逻辑
2. 在 `src/styles/main.css` 中添加相关样式
3. 在 `main.js` 中添加主进程相关代码（如果需要）

### 自定义主题
修改 `src/styles/main.css` 中的 CSS 变量来自定义主题颜色。

### 扩展 AI 功能
在 `src/services/deepseek.js` 中添加新的 AI 服务方法。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

享受使用这个智能 Markdown 编辑器吧！🎉