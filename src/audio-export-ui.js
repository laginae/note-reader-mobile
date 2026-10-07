'use strict';
const { Modal } = require('obsidian');
const { normalizeSettings } = require('./config');
const { synthesizeOnlineChunk } = require('./speech-services');
const { MAX_EXPORT_CHARS, EXPORT_FOLDER, synthesizeWav, saveExport } = require('./audio-export');

class AudioExportModal extends Modal {
  constructor(plugin) {
    super(plugin.app); this.plugin = plugin; this.closed = false; this.busy = false;
    this.texts = plugin.queue.items.map((item) => item.text);
    this.settings = normalizeSettings(plugin.settings);
  }
  t(zh, en) { return this.plugin.settings.settingsLanguage === 'chinese' ? zh : en; }
  onOpen() {
    this.contentEl.addClass('note-reader-mobile-export');
    this.contentEl.createEl('h2', { text: this.t('导出朗读音频', 'Export reading audio') });
    const count = this.texts.reduce((total, text) => total + text.length, 0);
    this.contentEl.createEl('p', { text: this.t(`当前朗读范围：${this.texts.length} 段，${count} 字符。`, `Current reading range: ${this.texts.length} chunks, ${count} characters.`) });
    this.contentEl.createEl('p', { text: this.t('将重新在线合成所列全部分段，可能产生费用。导出为原速、单声道 WAV，不叠加播放器倍速或音量。上限 30,000 字符及 32 MiB 音频，超限时不生成文件；已发送的请求仍可能计费。', 'All listed chunks will be synthesized again online and may incur charges. Output is normal-speed mono WAV, independent of player speed/volume. Limits: 30,000 characters and 32 MiB audio. Oversized exports produce no file; sent requests may still be billed.') });
    this.contentEl.createEl('p', { text: this.t(`文件保存在仓库的 ${EXPORT_FOLDER}/，包含朗读内容，也可能被仓库同步服务同步。关闭窗口会取消后续合成，不能撤回已发送请求。`, `Files are saved in ${EXPORT_FOLDER}/ in your vault and contain the spoken content; vault sync may copy them. Closing cancels further synthesis, not already-sent requests.`) });
    const label = this.contentEl.createEl('label', { text: this.t('文件名', 'File name') });
    this.nameInput = label.createEl('input', { type: 'text' });
    this.nameInput.value = new Date().toISOString().replace(/[T:]/g, '-').slice(0, 19);
    this.nameInput.setAttr('aria-label', this.t('文件名', 'File name'));
    this.status = this.contentEl.createEl('p'); this.status.setAttr('role', 'status');
    const actions = this.contentEl.createDiv({ cls: 'note-reader-mobile-command-grid' });
    this.startButton = actions.createEl('button', { text: this.t('确认合成并导出', 'Confirm and export'), cls: 'note-reader-mobile-command-button' });
    this.startButton.type = 'button'; this.startButton.disabled = !count || count > MAX_EXPORT_CHARS;
    this.startButton.addEventListener('click', () => { void this.start(); });
    const cancel = actions.createEl('button', { text: this.t('关闭 / 取消', 'Close / Cancel'), cls: 'note-reader-mobile-command-button' });
    cancel.type = 'button'; cancel.addEventListener('click', () => this.close());
    if (count > MAX_EXPORT_CHARS) this.status.textContent = this.t('范围过长，请先选择较短章节或文字。', 'Range too long. Select a shorter section or text.');
  }
  async start() {
    if (this.busy || this.closed) return;
    this.busy = true; this.startButton.disabled = true; this.nameInput.disabled = true;
    const cancelled = () => this.closed;
    try {
      const Decoder = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Decoder) throw new Error(this.t('此设备不支持音频解码导出。', 'Audio decoding is unavailable on this device.'));
      const decoder = new Decoder();
      this.plugin.pauseReading();
      const bytes = await synthesizeWav(this.texts, { decoder, cancelled,
        synthesize: (text) => synthesizeOnlineChunk(text, this.settings, this.plugin.app, undefined, () => {
          if (cancelled()) throw new Error('Export cancelled.');
          return this.plugin.settings;
        }),
        progress: (done, total) => { if (!this.closed) this.status.textContent = `${this.t('正在导出', 'Exporting')} ${done} / ${total}`; },
      });
      if (cancelled()) return;
      const path = await saveExport(this.plugin.app.vault, this.nameInput.value, bytes, cancelled);
      if (cancelled()) return;
      this.status.textContent = `${this.t('已保存：', 'Saved: ')}${path}`;
      const open = this.contentEl.createEl('button', { text: this.t('打开音频', 'Open audio'), cls: 'note-reader-mobile-command-button' });
      open.type = 'button'; open.addEventListener('click', () => { void this.app.workspace.openLinkText(path, '', true); });
    } catch (error) {
      if (!this.closed) this.status.textContent = `${this.t('导出未完成：', 'Export incomplete: ')}${error instanceof Error ? error.message : this.t('请检查服务配置。', 'Check service settings.')}`;
    } finally {
      // A fresh confirmation is required for any retry, since requests may already have been billed.
      this.busy = false; this.texts = [];
      if (!this.closed) this.startButton.disabled = true;
    }
  }
  onClose() { this.closed = true; this.texts = []; this.contentEl.empty(); if (this.plugin.exportModal === this) this.plugin.exportModal = null; }
}
module.exports = { AudioExportModal };
