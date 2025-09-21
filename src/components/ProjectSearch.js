/**
 * 项目级查找替换组件
 * 在已打开的文件夹内（文件树）进行跨文件搜索与替换
 */
class ProjectSearch {
  constructor(fileTreePanelEl, fileTree, openMatchCallback) {
    this.host = fileTreePanelEl;
    this.fileTree = fileTree; // 依赖 FileTree 获取当前根目录与文件列表
    this.openMatch = openMatchCallback; // ({ filePath, start, end }) => Promise

    // 状态
    this.caseSensitive = false;
    this.wholeWord = false;
    this.useRegex = false;
    this.results = []; // [{ filePath, relativePath, matches: [{ start, end, line, col, preview }] }]

    this._buildUI();
    this._bindEvents();
  }

  // 构建侧边栏 UI
  _buildUI() {
    const wrap = document.createElement('div');
    wrap.className = 'project-search-panel';
    wrap.innerHTML = `
      <div class="project-search-header">
        <h3>项目搜索</h3>
        <button class="ps-close btn btn-icon" title="关闭">×</button>
      </div>
      <div class="project-search-body">
        <div class="row">
          <input id="projectFindInput" class="input" placeholder="在项目中查找... (Ctrl+Shift+F)" />
        </div>
        <div class="row">
          <input id="projectReplaceInput" class="input" placeholder="替换为... (可选)" />
        </div>
        <div class="row">
          <input id="projectInclude" class="input" placeholder="包含文件 (逗号分隔)，例: **/*.md, **/*.txt" />
        </div>
        <div class="row">
          <input id="projectExclude" class="input" placeholder="排除文件 (逗号分隔)，例: **/node_modules/**, **/dist/**" />
        </div>
        <div class="row options">
          <label><input type="checkbox" id="projectCaseSensitive"/> 区分大小写</label>
          <label><input type="checkbox" id="projectWholeWord"/> 全词匹配</label>
          <label><input type="checkbox" id="projectUseRegex"/> 正则</label>
        </div>
        <div class="row actions">
          <button id="projectSearchBtn" class="btn btn-sm">搜索</button>
          <button id="projectReplaceAllBtn" class="btn btn-sm btn-primary">替换全部</button>
          <span id="projectSearchStatus" class="status"></span>
        </div>
        <div id="projectSearchResults" class="results"></div>
      </div>
    `;

    // 插入到文件树面板顶部
    this.host.insertBefore(wrap, this.host.firstChild);

    // 搜索图标切换按钮（默认显示）
    const toggle = document.createElement('button');
    toggle.className = 'project-search-toggle btn btn-icon';
    toggle.title = '项目搜索 (Ctrl+Shift+F)';
    toggle.textContent = '🔍';
    this.host.appendChild(toggle);

    // 缓存元素
    this.el = wrap;
    this.findInput = wrap.querySelector('#projectFindInput');
    this.replaceInput = wrap.querySelector('#projectReplaceInput');
    this.caseSensitiveEl = wrap.querySelector('#projectCaseSensitive');
    this.wholeWordEl = wrap.querySelector('#projectWholeWord');
    this.useRegexEl = wrap.querySelector('#projectUseRegex');
    this.searchBtn = wrap.querySelector('#projectSearchBtn');
    this.replaceAllBtn = wrap.querySelector('#projectReplaceAllBtn');
    this.statusEl = wrap.querySelector('#projectSearchStatus');
    this.resultsEl = wrap.querySelector('#projectSearchResults');
    this.includeEl = wrap.querySelector('#projectInclude');
    this.excludeEl = wrap.querySelector('#projectExclude');
    this.toggleBtn = toggle;
    this.closeBtn = wrap.querySelector('.ps-close');

    // 注入极简样式，避免修改全局 CSS
    const styleId = 'project-search-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .file-tree-panel{position:relative}
        .project-search-toggle{position:absolute;top:6px;right:8px;z-index:10}
        .project-search-panel{display:none;padding:8px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary)}
        .project-search-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .project-search-header h3{margin:0;font-size:12px;color:var(--text-secondary);font-weight:600}
        .project-search-header .ps-close{font-size:14px}
        .project-search-body .row{display:flex;gap:8px;margin-bottom:6px}
        .project-search-body .input{flex:1;padding:6px 8px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px}
        .project-search-body .options{gap:12px;color:var(--text-secondary);font-size:12px}
        .project-search-body .actions{align-items:center}
        .project-search-body .btn{padding:4px 8px;font-size:12px;border-radius:6px}
        .project-search-body .btn-primary{color:#fff}
        .project-search-body .status{margin-left:8px;color:var(--text-secondary);font-size:12px}
        .project-search-body .results{max-height:40vh;overflow:auto;border-top:1px solid var(--border-color);padding-top:6px}
        .ps-file{margin:8px 0}
        .ps-file-head{display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:12px;color:var(--text-primary)}
        .ps-file-actions{display:flex;gap:6px}
        .ps-file-actions .link{color:var(--bg-ai);cursor:pointer;font-size:12px;text-decoration:none}
        .ps-match{padding:4px 6px;margin:4px 0;border-radius:4px;background:var(--bg-primary);cursor:pointer;font-size:12px}
        .ps-snippet{color:var(--text-secondary)}
        .ps-mark{background:var(--bg-accent);color:#fff;border-radius:3px;padding:0 2px}
      `;
      document.head.appendChild(style);
    }
  }

  _bindEvents() {
    // 输入回车触发搜索
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
    this.includeEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
    this.excludeEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
    this.searchBtn.addEventListener('click', () => this.search());
    this.replaceAllBtn.addEventListener('click', () => this.replaceAll());
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.hide());

    this.caseSensitiveEl.addEventListener('change', () => this.caseSensitive = this.caseSensitiveEl.checked);
    this.wholeWordEl.addEventListener('change', () => this.wholeWord = this.wholeWordEl.checked);
    this.useRegexEl.addEventListener('change', () => this.useRegex = this.useRegexEl.checked);
  }

  show() {
    this.el.style.display = 'block';
    this.findInput.focus();
    this.findInput.select();
  }

  hide() {
    this.el.style.display = 'none';
  }

  toggle() {
    if (this.el.style.display === 'none' || this.el.style.display === '') {
      this.show();
    } else {
      this.hide();
    }
  }

  // 入口：搜索整个项目（文件树限制为 md/txt）
  async search() {
    const query = (this.findInput.value || '').trim();
    this.results = [];
    this._setStatus('');
    this.resultsEl.innerHTML = '';

    if (!query) {
      this._setStatus('请输入要查找的内容');
      return;
    }
    if (!this.fileTree || !this.fileTree.currentFolder) {
      this._setStatus('请先在左侧打开一个文件夹');
      return;
    }

    let regex;
    try {
      regex = this._compileQuery(query);
    } catch (e) {
      this._setStatus('正则表达式错误');
      return;
    }

    // 扫描文件（顺序扫描，避免阻塞）
    const files = this._flattenFiles(this.fileTree.files);

    // 解析 include/exclude 通配符
    const includes = this._parseGlobs(this.includeEl.value || '');
    const excludes = this._parseGlobs(this.excludeEl.value || '');
    const includeRegexps = includes.map(g => this._globToRegExp(g));
    const excludeRegexps = excludes.map(g => this._globToRegExp(g));
    let totalMatches = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 文件筛选：优先匹配 include，然后排除 exclude
      const rel = this._normalizePath(file.relativePath || file.path);
      const passInclude = includeRegexps.length === 0 || this._matchAny(includeRegexps, rel);
      const passExclude = excludeRegexps.length > 0 && this._matchAny(excludeRegexps, rel);
      if (!passInclude || passExclude) continue;
      this._setStatus(`正在搜索: ${i + 1}/${files.length}`);
      const res = await this._searchFile(file, regex);
      if (res.matches.length > 0) {
        this.results.push(res);
        totalMatches += res.matches.length;
        this._appendFileResults(res);
      }
    }

    this._setStatus(totalMatches > 0 ? `找到 ${totalMatches} 处，${this.results.length} 个文件` : '未找到匹配项');
  }

  // 工具：解析以逗号或空白分隔的通配符列表
  _parseGlobs(str) {
    return (str || '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // 工具：将 glob 转换为 RegExp
  _globToRegExp(glob) {
    const norm = this._normalizePath(glob);
    let re = '^';
    const specials = new Set(['.', '+', '(', ')', '^', '$', '{', '}', '|']);
    for (let i = 0; i < norm.length; i++) {
      const c = norm[i];
      if (c === '*') {
        if (norm[i + 1] === '*') {
          re += '.*';
          i++;
        } else {
          re += '[^/]*';
        }
      } else if (c === '?') {
        re += '[^/]';
      } else if (c === '/') {
        re += '/';
      } else if (specials.has(c)) {
        re += '\\' + c;
      } else {
        re += c.replace(/[\[\]\\]/g, m => '\\' + m);
      }
    }
    re += '$';
    return new RegExp(re);
  }

  _normalizePath(p) {
    return (p || '').replace(/\\\\/g, '/');
  }

  _matchAny(regexps, path) {
    return regexps.some(r => r.test(path));
  }

  _compileQuery(query) {
    if (this.useRegex) {
      return new RegExp(query, this.caseSensitive ? 'g' : 'gi');
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = this.wholeWord ? `\\b${escaped}\\b` : escaped;
    return new RegExp(pattern, this.caseSensitive ? 'g' : 'gi');
  }

  _flattenFiles(items, acc = []) {
    if (!items) return acc;
    for (const it of items) {
      if (it.type === 'file') acc.push(it);
      if (it.children) this._flattenFiles(it.children, acc);
    }
    return acc;
  }

  async _searchFile(file, regex) {
    try {
      const r = await window.electronAPI.readFile(file.path);
      if (!r.success) return { filePath: file.path, relativePath: file.relativePath || file.path, matches: [] };
      const content = r.content || '';

      const matches = [];
      let m;
      // 为捕获多次匹配，需重置 lastIndex
      regex.lastIndex = 0;
      const lineOffsets = this._computeLineOffsets(content);
      while ((m = regex.exec(content)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        const { line, col } = this._offsetToLineCol(lineOffsets, start);
        const preview = this._buildPreview(content, start, end);
        matches.push({ start, end, line, col, preview });
        if (regex.lastIndex === m.index) regex.lastIndex++; // 防止零宽匹配死循环
      }
      return { filePath: file.path, relativePath: file.relativePath || file.path, matches };
    } catch (e) {
      console.error('搜索文件失败:', file.path, e);
      return { filePath: file.path, relativePath: file.relativePath || file.path, matches: [] };
    }
  }

  _computeLineOffsets(text) {
    const offsets = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1);
    return offsets;
  }

  _offsetToLineCol(lineOffsets, offset) {
    // 二分查找行号
    let lo = 0, hi = lineOffsets.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lineOffsets[mid] <= offset) lo = mid + 1; else hi = mid - 1;
    }
    const line = hi + 1; // 1-based
    const col = offset - lineOffsets[hi] + 1; // 1-based
    return { line, col };
    }

  _buildPreview(content, start, end) {
    const ctx = 24;
    const before = content.slice(Math.max(0, start - ctx), start);
    const hit = content.slice(start, end);
    const after = content.slice(end, Math.min(content.length, end + ctx));
    return { before, hit, after };
  }

  _appendFileResults(fileRes) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'ps-file';
    fileDiv.innerHTML = `
      <div class="ps-file-head">
        <span title="${fileRes.filePath}">${fileRes.relativePath}</span>
        <div class="ps-file-actions">
          <a class="link" data-action="open" data-path="${fileRes.filePath}">打开</a>
          <a class="link" data-action="replace-file" data-path="${fileRes.filePath}">替换此文件</a>
        </div>
      </div>
    `;

    // 匹配列表
    fileRes.matches.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = 'ps-match';
      item.setAttribute('data-path', fileRes.filePath);
      item.setAttribute('data-start', m.start);
      item.setAttribute('data-end', m.end);
      item.innerHTML = `
        <div>第 ${m.line}:${m.col}</div>
        <div class="ps-snippet">${this._escape(m.preview.before)}<span class="ps-mark">${this._escape(m.preview.hit)}</span>${this._escape(m.preview.after)}</div>
      `;
      item.addEventListener('click', async () => {
        await this.openMatch({ filePath: fileRes.filePath, start: m.start, end: m.end });
      });
      fileDiv.appendChild(item);
    });

    // 文件级操作
    fileDiv.querySelectorAll('.ps-file-actions .link').forEach(link => {
      link.addEventListener('click', async (e) => {
        const action = link.getAttribute('data-action');
        const path = link.getAttribute('data-path');
        if (action === 'open') {
          // 打开文件并跳到第一个匹配
          const first = fileRes.matches[0];
          if (first) await this.openMatch({ filePath: path, start: first.start, end: first.end });
        } else if (action === 'replace-file') {
          await this._replaceInFile(path);
        }
      });
    });

    this.resultsEl.appendChild(fileDiv);
  }

  _escape(s) {
    return (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  _setStatus(text) {
    this.statusEl.textContent = text;
  }

  async replaceAll() {
    const query = (this.findInput.value || '').trim();
    const replaceText = this.replaceInput.value || '';
    if (!query) return;
    if (this.results.length === 0) {
      await this.search();
      if (this.results.length === 0) return;
    }

    if (!confirm(`确认在整个项目中替换 ${this.results.reduce((n, f) => n + f.matches.length, 0)} 处？`)) return;

    let filesChanged = 0;
    let totalReplaced = 0;
    const regex = this._compileQuery(query);

    for (const f of this.results) {
      const count = await this._replaceInPath(f.filePath, regex, replaceText);
      if (count > 0) {
        filesChanged++;
        totalReplaced += count;
      }
    }
    this._setStatus(`已替换 ${totalReplaced} 处，${filesChanged} 个文件`);

    // 替换后重新搜索，保证结果与文件同步
    await this.search();
    // 刷新文件树（若有必要）
    if (this.fileTree) this.fileTree.refresh();
  }

  async _replaceInFile(filePath) {
    const query = (this.findInput.value || '').trim();
    const replaceText = this.replaceInput.value || '';
    const fileRes = this.results.find(r => r.filePath === filePath);
    if (!fileRes || fileRes.matches.length === 0) return;
    if (!confirm(`确认替换 ${fileRes.matches.length} 处（${fileRes.relativePath}）？`)) return;

    const regex = this._compileQuery(query);
    const count = await this._replaceInPath(filePath, regex, replaceText);
    this._setStatus(`文件已替换 ${count} 处`);
    await this.search();
  }

  async _replaceInPath(filePath, regex, replaceText) {
    try {
      const r = await window.electronAPI.readFile(filePath);
      if (!r.success) return 0;
      const before = r.content || '';
      // 为避免 lastIndex 影响，复制一个新的正则用于替换与计数
      const flags = `${regex.ignoreCase ? 'i' : ''}${regex.multiline ? 'm' : ''}g`;
      const safeRegex = new RegExp(regex.source, flags);
      const after = before.replace(safeRegex, replaceText);
      if (after === before) return 0;
      const w = await window.electronAPI.writeFile(filePath, after);
      // 使用新的正则重新统计数量
      const count = (before.match(safeRegex)?.length) || 0;
      if (w.success) {
        // 若该文件已在标签中打开，刷新其内容
        if (window.markdownEditor && typeof window.markdownEditor.refreshOpenFileFromDisk === 'function') {
          window.markdownEditor.refreshOpenFileFromDisk(filePath);
        }
        return count;
      }
      return 0;
    } catch (e) {
      console.error('替换失败:', filePath, e);
      return 0;
    }
  }
}

// 导出组件
window.ProjectSearch = ProjectSearch;
