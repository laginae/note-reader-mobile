'use strict';
const { Modal, setIcon } = require('obsidian');

class PdfOutlineModal extends Modal {
  constructor(plugin, file) {
    super(plugin.app);
    this.plugin = plugin; this.file = file; this.generation = 0; this.closed = false;
    this.selected = -1; this.query = ''; this.limit = 200;
  }
  t(zh, en) { return this.plugin.settings.settingsLanguage === 'chinese' ? zh : en; }
  button(parent, icon, label, action, iconOnly = false) {
    const button = parent.createEl('button', { cls: iconOnly ? 'note-reader-mobile-icon-button' : 'note-reader-mobile-command-button' });
    button.type = 'button'; button.setAttr('aria-label', label);
    if (iconOnly) button.setAttr('title', label);
    const span = button.createSpan({ cls: 'note-reader-mobile-button-icon' }); setIcon(span, icon);
    if (!iconOnly) button.createSpan({ text: label });
    button.addEventListener('click', action);
    return button;
  }
  onOpen() {
    this.modalEl.addClass('note-reader-mobile-outline-modal');
    this.contentEl.addClass('note-reader-mobile-outline');
    const header = this.contentEl.createDiv({ cls: 'note-reader-mobile-outline-header' });
    header.createEl('h2', { text: this.t('文档大纲', 'Document outline') });
    this.refresh = this.button(header, 'refresh-cw', this.t('重新识别', 'Refresh outline'), () => { void this.load(true); }, true);
    this.button(header, 'x', this.t('关闭大纲', 'Close outline'), () => this.close(), true);
    this.contentEl.createDiv({ cls: 'note-reader-mobile-outline-filename', text: this.file.name || this.file.path.split('/').pop() });
    this.status = this.contentEl.createDiv({ cls: 'note-reader-mobile-outline-status' });
    this.status.setAttr('role', 'status');
    this.search = this.contentEl.createEl('input', { type: 'search' });
    this.search.placeholder = this.t('搜索章节', 'Search sections');
    this.search.setAttr('aria-label', this.search.placeholder);
    this.search.addEventListener('input', () => { this.query = this.search.value; this.limit = 200; this.drawList(); });
    this.list = this.contentEl.createDiv({ cls: 'note-reader-mobile-outline-list' });
    this.list.setAttr('role', 'group'); this.list.setAttr('aria-label', this.t('章节', 'Sections'));
    this.more = this.button(this.contentEl, 'chevrons-down', this.t('显示更多章节', 'Show more sections'), () => { this.limit += 200; this.drawList(); });
    const footer = this.contentEl.createDiv({ cls: 'note-reader-mobile-outline-footer' });
    this.selectedLabel = footer.createDiv({ cls: 'note-reader-mobile-outline-selected' });
    const actions = footer.createDiv({ cls: 'note-reader-mobile-command-grid' });
    this.readSection = this.button(actions, 'play', this.t('朗读本节', 'Read section'), () => this.read(false));
    this.readRemaining = this.button(actions, 'list-start', this.t('从本节继续', 'Read from section'), () => this.read(true));
    this.updateSelection();
    void this.load(false);
  }
  async load(force) {
    const generation = ++this.generation;
    const cancelled = () => this.closed || generation !== this.generation;
    this.data = null; this.selected = -1; this.list.empty(); this.more.hidden = true;
    this.refresh.disabled = this.search.disabled = true; this.updateSelection();
    this.status.textContent = this.t('正在本地识别大纲…', 'Scanning outline locally…');
    try {
      const result = await this.plugin.loadPdfOutline(this.file, cancelled, ({ pageNumber, totalPages }) => {
        if (!cancelled()) this.status.textContent = `${this.t('正在解析', 'Scanning')} ${pageNumber} / ${totalPages}`;
      }, force);
      if (cancelled() || !result) return;
      this.data = result.data; this.key = result.key;
      this.status.textContent = this.data.entries.length
        ? `${this.data.source === 'bookmarks' ? this.t('PDF 自带书签', 'PDF bookmarks') : this.data.source === 'headings' ? this.t('文档标题', 'Document headings') : this.t('自动识别，请核对章节', 'Inferred outline; check sections')} · ${this.data.entries.length}`
        : this.t('未找到可用大纲，可关闭后朗读全文或选中文字。', 'No outline found. Read the file or selected text instead.');
      this.drawList();
    } catch {
      if (!cancelled()) this.status.textContent = this.t('无法读取大纲；请确认 PDF 未改变且包含可提取文字，再重试。', 'Could not read the outline. Check that the PDF is unchanged and contains extractable text, then retry.');
    } finally {
      if (!cancelled()) { this.refresh.disabled = this.search.disabled = false; this.updateSelection(); }
    }
  }
  drawList() {
    this.list.empty(); this.rows = [];
    const query = String(this.query || '').trim().toLocaleLowerCase();
    const entries = (this.data?.entries || []).map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !query || entry.title.toLocaleLowerCase().includes(query));
    for (const { entry, index } of entries.slice(0, this.limit)) {
      const group = this.list.createDiv({ cls: 'note-reader-mobile-outline-item' });
      const row = group.createEl('button', { cls: 'note-reader-mobile-outline-row' });
      row.type = 'button'; row.setAttr('data-level', String(Math.min(4, entry.level)));
      row.createSpan({ cls: 'note-reader-mobile-outline-title', text: entry.title });
      row.setAttr('aria-label', `${this.t('定位', 'Go to')} ${entry.title}`);
      if (entry.page) row.createSpan({ cls: 'note-reader-mobile-outline-page', text: `${this.t('第', 'p. ')}${entry.page}${this.t('页', '')}` });
      row.addEventListener('click', () => { void this.locate(index); });
      const select = this.button(group, 'list-start', this.t('选择朗读范围', 'Select reading range'), () => { this.selected = index; this.updateSelection(); }, true);
      this.rows.push({ row, select, index });
    }
    if (this.data?.entries.length && !entries.length) this.list.createEl('p', { text: this.t('没有匹配的章节', 'No matching sections') });
    this.more.hidden = entries.length <= this.limit;
    this.updateSelection();
  }
  async locate(index) {
    if (!this.data || this.closed || this.locating) return;
    this.locating = true;
    try {
      await this.plugin.locateOutlineEntry(this.file, this.key, this.data, index);
      if (!this.closed) this.close();
    } catch {
      if (!this.closed) this.status.textContent = this.t('无法定位标题，请确认原文视图已打开且文件未改变。', 'Could not locate the heading. Open the unchanged source document and try again.');
    } finally { this.locating = false; }
  }
  updateSelection() {
    const entry = this.data?.entries[this.selected];
    if (this.selectedLabel) this.selectedLabel.textContent = entry
      ? `${entry.title}${entry.approximate ? this.t('（按页起读）', ' (starts at page boundary)') : ''}`
      : this.t('选择章节', 'Select a section');
    if (this.readSection) this.readSection.disabled = this.readRemaining.disabled = !entry;
    for (const { row, index } of this.rows || []) {
      row.setAttr('aria-pressed', String(index === this.selected));
      row.toggleClass('is-selected', index === this.selected);
    }
  }
  read(remaining) {
    if (!this.data || this.selected < 0 || this.closed) return;
    try {
      this.plugin.readPdfSection(this.file, this.key, this.data, this.selected, remaining);
      this.close();
    } catch {
      this.status.textContent = this.t('文件或设置已改变，或本节没有所选模式的可读文字。请刷新大纲并检查脚注设置。', 'The file/settings changed, or this section has no text for the selected mode. Refresh and check footnote settings.');
    }
  }
  onClose() {
    this.closed = true; this.generation += 1; this.data = null;
    this.contentEl.empty();
    if (this.plugin.outlineModal === this) this.plugin.outlineModal = null;
  }
}

module.exports = { PdfOutlineModal };
