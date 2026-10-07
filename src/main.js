'use strict';

const {
  ItemView,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  SecretComponent,
  Setting,
  loadPdfJs,
  setIcon,
} = require('obsidian');
const {
  createIncrementalSpeechChunker,
  createPlaybackQueueState,
  createReadingAnchor,
  getCurrentPlaybackItem,
  normalizeReadingPositions,
  parseChunkLimits,
  reducePlaybackQueueState,
  academicOptions,
  sanitizeAcademicTextForSpeech,
  splitOpeningAudioParts,
  sliceTextFromReadingPosition,
  splitTextForSpeechChunks,
  upsertReadingPosition,
} = require('@laginae/note-reader-core');
const {
  DEFAULT_SETTINGS,
  MICROSOFT_VOICES,
  MIMO_VOICES,
  ONLINE_CHUNK_LIMITS,
  OPENROUTER_MODELS,
  getDefaultOpenRouterVoice,
  getOpenRouterVoices,
  normalizeSettings,
} = require('./config');
const { extractPdfPages, extractPdfDocument } = require('./pdf-extractor');
const { buildPdfOutline, sectionPages, outlineKey } = require('./pdf-outline');
const { PdfOutlineModal } = require('./pdf-outline-ui');
const { normalizeFootnoteMode, splitFootnotesInRange } = require('./pdf-footnotes');
const { MAX_HTML_BYTES, isHtmlFile, extractHtmlText, htmlReaderDocument, captureHtmlSelection } = require('./html-text');
const { AudioExportModal } = require('./audio-export-ui');
const { synthesizeOnlineChunk } = require('./speech-services');
const { BYOK_PROVIDERS, updateByokProfile, hasByokConsent, grantByokConsent, getByokConfigurationError } = require('./byok');

const VIEW_TYPE = 'note-reader-mobile-control';
const GITHUB_ISSUES_URL = 'https://github.com/laginae/note-reader-mobile/issues';
const SPEED_PRESETS = [1, 1.25, 1.5, 2];

const UI = {
  english: {
    title: 'Note Reader Mobile',
    toolbar: 'Reading toolbar',
    openPanel: 'Expand player',
    backToText: 'Back to document',
    closeReader: 'Stop and close reader',
    readingScope: 'Reading scope',
    pdfOutline: 'PDF outline',
    exportAudio: 'Export reading audio',
    exportUnavailable: 'Start a reading range with an online engine first. Device system speech cannot be exported.',
    readFootnotes: 'Read PDF footnotes only',
    noFootnotes: 'No confidently identified footnotes were found in this range.',
    idle: 'Ready',
    extracting: 'Extracting PDF locally',
    synthesizing: 'Synthesizing current chunk',
    playing: 'Reading',
    paused: 'Paused',
    audioBlocked: 'Playback needs a user gesture. Tap Resume; the synthesized audio is kept.',
    complete: 'Complete',
    error: 'Error',
    readSelection: 'Read selection',
    readFromSelection: 'Continue from selection',
    readFile: 'Read file',
    resumeFile: 'Resume file',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    previous: 'Previous chunk',
    next: 'Next chunk',
    noSelection: 'Select text in a note or PDF first.',
    noFile: 'Open a Markdown note, local HTML file or PDF first.',
    noResume: 'No saved reading position exists for this file.',
    sourceSelection: 'selection',
    sourceFile: 'file',
    sourceResume: 'saved position',
    progress: (current, total) => `${current} / ${total}`,
    settingsLanguage: 'Settings language',
    settingsLanguageDesc: 'Choose the language used on this settings page.',
    engine: 'Speech engine',
    engineDesc: 'Use a voice exposed by your device, or allow an online engine to process the current text chunk. Offline availability depends on the device voice.',
    system: 'Device system speech',
    azure: 'Microsoft Azure Speech',
    openRouter: 'OpenRouter TTS',
    remote: 'HTTPS remote CosyVoice',
    systemVoice: 'System voice',
    systemVoiceDesc: 'Voices exposed by your device; leaving this blank uses its default. The plugin makes no speech API request in this mode, but some OS voices may require network processing. Choose a downloaded local voice for offline use.',
    deviceDefault: 'Device default',
    consent: 'Allow online processing',
    azureConsentDesc: 'Permit sending the current chunk to the configured Azure Speech resource.',
    openRouterConsentDesc: 'Permit sending the current chunk to OpenRouter and a ZDR-eligible upstream provider.',
    remoteConsentDesc: 'Permit sending the current chunk to the configured HTTPS CosyVoice server.',
    secret: 'API secret',
    azureSecretDesc: 'Select an Obsidian secret containing the Azure Speech resource key.',
    openRouterSecretDesc: 'Select an Obsidian secret containing the OpenRouter API key.',
    remoteSecretDesc: 'Optional Obsidian secret sent as a Bearer token to the remote server.',
    secretUnavailable: 'Obsidian SecretStorage is unavailable. Update Obsidian to 1.11.4 or later.',
    azureCloud: 'Azure cloud',
    publicCloud: 'Azure public cloud',
    chinaCloud: 'Azure China operated by 21Vianet',
    region: 'Azure region',
    voice: 'Voice',
    model: 'TTS model',
    endpoint: 'Remote CosyVoice endpoint',
    endpointDesc: 'HTTPS endpoint accepting JSON input, voice, speed, and response_format. Redirects are refused; the server must allow browser CORS requests.',
    remoteVoice: 'Remote CosyVoice voice',
    speed: 'Speed',
    volume: 'Volume',
    seekBack: 'Back 5 seconds',
    seekForward: 'Forward 5 seconds',
    seekUnavailable: 'Seeking is unavailable for device system speech.',
    currentAudio: 'Current audio',
    systemControls: 'System voice speed and volume changes take effect from the next chunk; device volume also applies.',
    engineTab: 'Engine',
    playbackTab: 'Playback',
    academicTab: 'Academic',
    rapidStart: 'Rapid start',
    rapidStartDesc: 'Use a complete first sentence of 5–19 characters when possible; otherwise use the normal 20/40-character opening stages. Audio parts are requested only as playback reaches them.',
    privacyTab: 'Privacy',
    mimo: 'Xiaomi MiMo TTS',
    byok: 'Custom speech API (BYOK)',
    chunks: 'Chunk limits',
    chunksDesc: 'Comma-separated character limits. The default 200,400,800 starts promptly without preparing unused online audio.',
    stripMarkdown: 'Strip Markdown',
    stripMarkdownDesc: 'Remove common Markdown and verbalize short formulas before reading.',
    mathLanguage: 'Math reading language',
    english: 'English',
    chinese: 'Chinese',
    skip: 'Skip math',
    remember: 'Remember reading position',
    rememberDesc: 'Store only a short anchor, file path, page or chunk number, and timestamp; never the complete document text.',
    privacy: 'Privacy boundary',
    privacyDesc: 'The plugin has no developer relay server or usage telemetry. Online engines send text directly to the selected service. Retention and training depend on that service; OpenRouter requests require ZDR and deny provider data collection. Device voice processing depends on the selected installed voice. Settings and optional reading anchors remain in your vault; temporary audio is held in memory until playback cleanup.',
    feedback: 'Feedback and bug reports',
    feedbackDesc: 'Open GitHub Issues. Do not include API keys or private note text.',
    openIssues: 'Open GitHub Issues',
  },
  chinese: {
    title: '移动朗读器',
    toolbar: '朗读工具栏',
    openPanel: '展开播放器',
    backToText: '返回正文',
    closeReader: '停止并关闭朗读器',
    readingScope: '朗读范围',
    pdfOutline: 'PDF 大纲',
    exportAudio: '导出朗读音频',
    exportUnavailable: '请先使用在线引擎开始一个朗读范围。设备系统语音不支持导出。',
    readFootnotes: '只读 PDF 脚注',
    noFootnotes: '此范围内没有可靠识别出的脚注。',
    idle: '已就绪',
    extracting: '正在本地解析 PDF',
    synthesizing: '正在合成当前分段',
    playing: '正在朗读',
    paused: '已暂停',
    audioBlocked: '播放需要手动确认，请点击继续；已保留合成音频，不会重新请求。',
    complete: '朗读完成',
    error: '发生错误',
    readSelection: '朗读选中文字',
    readFromSelection: '从选中位置继续',
    readFile: '朗读当前文件',
    resumeFile: '从保存位置继续',
    pause: '暂停',
    resume: '继续',
    stop: '停止',
    previous: '上一分段',
    next: '下一分段',
    noSelection: '请先在笔记或 PDF 中选择文字。',
    noFile: '请先打开 Markdown 笔记、本地 HTML 文件或 PDF。',
    noResume: '当前文件没有已保存的朗读位置。',
    sourceSelection: '选中文字',
    sourceFile: '当前文件',
    sourceResume: '保存位置',
    progress: (current, total) => `${current} / ${total}`,
    settingsLanguage: '设置界面语言',
    settingsLanguageDesc: '选择本设置页面使用的语言。',
    engine: '语音引擎',
    engineDesc: '使用设备提供的音色，或授权在线引擎处理当前朗读分段。能否离线使用取决于设备音色。',
    system: '设备系统语音',
    azure: 'Microsoft Azure Speech',
    openRouter: 'OpenRouter TTS',
    remote: 'HTTPS 远程 CosyVoice',
    systemVoice: '系统音色',
    systemVoiceDesc: '未选择时使用设备默认音色。本模式下插件不请求语音 API，但部分系统音色可能需要联网处理；离线使用请选择已下载的本地音色。',
    deviceDefault: '设备默认音色',
    consent: '允许在线处理',
    azureConsentDesc: '允许把当前分段发送到配置的 Azure Speech 资源。',
    openRouterConsentDesc: '允许把当前分段发送给 OpenRouter 及符合 ZDR 的上游服务商。',
    remoteConsentDesc: '允许把当前分段发送到配置的 HTTPS CosyVoice 服务器。',
    secret: 'API 秘密',
    azureSecretDesc: '选择保存 Azure Speech 资源密钥的 Obsidian 秘密。',
    openRouterSecretDesc: '选择保存 OpenRouter API 密钥的 Obsidian 秘密。',
    remoteSecretDesc: '可选；作为 Bearer 令牌发送给远程服务器的 Obsidian 秘密。',
    secretUnavailable: 'Obsidian SecretStorage 不可用，请升级到 Obsidian 1.11.4 或更高版本。',
    azureCloud: 'Azure 云环境',
    publicCloud: 'Azure 公有云',
    chinaCloud: '由世纪互联运营的 Azure 中国区',
    region: 'Azure 区域',
    voice: '音色',
    model: 'TTS 模型',
    endpoint: '远程 CosyVoice 接口',
    endpointDesc: '必须使用 HTTPS，并接收 input、voice、speed 和 response_format JSON 字段。拒绝重定向，服务器须允许浏览器 CORS 请求。',
    remoteVoice: '远程 CosyVoice 音色',
    speed: '播放倍速',
    volume: '音量',
    seekBack: '后退 5 秒',
    seekForward: '前进 5 秒',
    seekUnavailable: '设备系统语音不支持按秒跳转。',
    currentAudio: '当前音频',
    systemControls: '系统语音的倍速和音量调整从下一分段生效，也受设备音量控制。',
    engineTab: '语音引擎',
    playbackTab: '播放设置',
    academicTab: '学术阅读',
    rapidStart: '极速起读',
    rapidStartDesc: '首个完整句子为 5–19 字时优先起读，否则使用常规 20/40 字起读门槛。仅在播放到对应音频小段时请求合成。',
    privacyTab: '隐私与帮助',
    mimo: '小米 MiMo TTS',
    byok: '自定义语音 API (BYOK)',
    chunks: '分段长度',
    chunksDesc: '以英文逗号分隔。默认 200,400,800，能够较快开始且不会提前合成未使用的在线音频。',
    stripMarkdown: '移除 Markdown 格式',
    stripMarkdownDesc: '朗读前移除常见 Markdown，并把短公式转换为可朗读文本。',
    mathLanguage: '数学公式朗读语言',
    english: '英语',
    chinese: '中文',
    skip: '跳过公式',
    remember: '记住朗读位置',
    rememberDesc: '只保存短文本锚点、文件路径、页码或分段号和时间，不保存完整正文。',
    privacy: '隐私边界',
    privacyDesc: '插件没有开发者中转服务器，也不内置使用情况遥测。在线语音将文本直接发送到所选服务，数据留存和训练政策取决于该服务；OpenRouter 请求要求 ZDR 并拒绝供应商收集数据。系统语音的处理方式取决于所选设备音色。配置和可选续读记录保存在仓库，临时音频保存在内存中并在播放清理时释放。',
    feedback: '反馈与问题报告',
    feedbackDesc: '打开 GitHub Issues。请勿提交 API 密钥或私密笔记正文。',
    openIssues: '打开 GitHub Issues',
  },
};

function getUi(settings) {
  return UI[settings.settingsLanguage === 'chinese' ? 'chinese' : 'english'];
}

function isTextInputTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const tagName = String(target.tagName || '').toLowerCase();
  return Boolean(target.isContentEditable || ['input', 'textarea', 'select', 'button'].includes(tagName));
}

function getWindowSelectionContext() {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') {
    return { pageNumber: 1, text: '' };
  }
  const selection = window.getSelection();
  const text = selection ? String(selection.toString() || '').trim() : '';
  let element = selection && selection.anchorNode;
  if (element && element.nodeType !== 1) {
    element = element.parentElement;
  }
  const pageElement = element && typeof element.closest === 'function'
    ? element.closest('[data-page-number], .pdf-page, .page')
    : null;
  const candidates = pageElement ? [
    pageElement.getAttribute && pageElement.getAttribute('data-page-number'),
    pageElement.getAttribute && pageElement.getAttribute('aria-label'),
    pageElement.id,
  ] : [];
  let pageNumber = 1;
  for (const candidate of candidates) {
    const match = /(?:page[-_ ]*)?(\d+)/i.exec(String(candidate || ''));
    if (match) {
      pageNumber = Math.max(1, Math.floor(Number(match[1]) || 1));
      break;
    }
  }
  return { pageNumber, text };
}

function createButton(parent, options) {
  const button = parent.createEl('button', {
    cls: options.iconOnly
      ? 'note-reader-mobile-icon-button'
      : 'note-reader-mobile-command-button',
  });
  button.type = 'button';
  button.disabled = options.disabled === true;
  button.setAttr('aria-label', options.label);
  button.setAttr('title', options.tooltip || options.label);
  if (options.icon) {
    const icon = button.createSpan({ cls: 'note-reader-mobile-button-icon' });
    setIcon(icon, options.icon);
  }
  if (!options.iconOnly) {
    button.createSpan({ text: options.label });
  }
  button.addEventListener('click', options.onClick);
  return button;
}

class NoteReaderMobileView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return 'Note and PDF Voice Reader';
  }

  getIcon() {
    return 'audio-lines';
  }

  async onOpen() {
    this.plugin.renderView(this.contentEl);
  }
}

class NoteReaderMobilePlugin extends Plugin {
  async onload() {
    this.settings = normalizeSettings(await this.loadData());
    this.settings.readingPositions = normalizeReadingPositions(this.settings.readingPositions);
    this.queue = createPlaybackQueueState();
    this.sessionId = 0;
    this.runId = 0;
    this.sourceLabel = '';
    this.statusDetail = '';
    this.phaseOverride = '';
    this.activeAudio = null;
    this.activeAudioUrl = '';
    this.activeUtterance = null;
    this.activePlaybackSettle = null;
    this.pauseRequested = false;
    this.resumeWaiters = [];
    this.lastSpeechConfiguration = this.speechConfigurationKey();

    this.registerView(VIEW_TYPE, (leaf) => new NoteReaderMobileView(leaf, this));
    this.addRibbonIcon('audio-lines', getUi(this.settings).toolbar, () => this.showToolbar());
    this.addCommand({ id: 'open-reader', name: 'Show reading toolbar', callback: () => this.showToolbar() });
    this.addCommand({ id: 'open-reader-panel', name: 'Expand reader panel', callback: () => this.runSafely(() => this.activateView()) });
    this.addCommand({ id: 'close-reader', name: 'Stop and close reader', callback: () => this.runSafely(() => this.closeReader()) });
    this.addCommand({ id: 'read-selection', name: 'Read selected text', callback: () => this.runSafely(() => this.readSelection()) });
    this.addCommand({ id: 'read-from-selection', name: 'Continue reading from selection', callback: () => this.runSafely(() => this.readFromSelection()) });
    this.addCommand({ id: 'read-file', name: 'Read active note or PDF', callback: () => this.runSafely(() => this.readFile()) });
    this.addCommand({ id: 'pdf-outline', name: 'Open PDF outline', callback: () => this.openPdfOutline() });
    this.addCommand({ id: 'export-audio', name: 'Export current reading range to WAV', callback: () => this.openAudioExport() });
    this.addCommand({ id: 'read-pdf-footnotes', name: 'Read PDF footnotes only', callback: () => this.runSafely(() => this.readFootnotes()) });
    this.addCommand({ id: 'resume-file', name: 'Resume active file', callback: () => this.runSafely(() => this.resumeFile()) });
    this.addCommand({ id: 'toggle-pause', name: 'Pause or resume reading', callback: () => this.togglePause() });
    this.addCommand({ id: 'stop-reading', name: 'Stop reading', callback: () => this.stopReading() });
    this.addSettingTab(new NoteReaderMobileSettingTab(this.app, this));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.syncToolbar()));
    this.registerEvent(this.app.workspace.on('layout-change', () => this.syncToolbar()));
    this.registerEvent(this.app.workspace.on('editor-change', (_editor, view) => {
      if (this.selectionSnapshot?.filePath === view?.file?.path) this.selectionSnapshot = null;
    }));
    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (this.selectionSnapshot?.filePath === file.path) this.selectionSnapshot = null;
      if (this.pdfOutlineCache?.path === file.path) this.pdfOutlineCache = null;
    }));
    this.registerDomEvent(document, 'selectionchange', () => this.captureSelection());
    this.registerDomEvent(document, 'pointerdown', (event) => {
      const source = this.getSourceLeaf();
      if (source?.view?.contentEl?.contains(event.target)) this.selectionSnapshot = null;
    });

    this.registerDomEvent(document, 'keydown', (event) => {
      if (isTextInputTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey || event.repeat
        || !event.target?.closest?.('.note-reader-mobile-root')) {
        return;
      }
      if (event.code === 'Space' && this.queue.items.length) {
        event.preventDefault();
        this.togglePause();
      } else if (event.code === 'ArrowLeft' && this.queue.items.length) {
        event.preventDefault();
        this.seekAudioBy(-5);
      } else if (event.code === 'ArrowRight' && this.queue.items.length) {
        event.preventDefault();
        this.seekAudioBy(5);
      }
    });
    this.registerDomEvent(document, 'visibilitychange', () => {
      if (document.hidden && this.queue.items.length) {
        this.pauseReading();
      }
    });
  }

  onunload() {
    this.exportModal?.close();
    this.clearHtmlSelectionListener();
    this.outlineModal?.close();
    this.pdfOutlineCache = null;
    this.toolbarEnabled = false;
    this.removeToolbar();
    this.selectionSnapshot = null;
    this.stopReading({ quiet: true });
  }

  async saveSettings() {
    this.settings = normalizeSettings(this.settings);
    const configuration = this.speechConfigurationKey();
    if (this.lastSpeechConfiguration && configuration !== this.lastSpeechConfiguration) this.stopReading({ quiet: true });
    this.lastSpeechConfiguration = configuration;
    this.settings.readingPositions = normalizeReadingPositions(this.settings.readingPositions);
    await this.saveData(this.settings);
  }

  speechConfigurationKey() {
    const { speed, volume, settingsLanguage, readingPositions, rememberReadingPosition, chunkLimits, stripMarkdown, mathReadingLanguage, pdfSkipHeaders, pdfFootnoteMode, ...speech } = this.settings;
    return JSON.stringify(speech);
  }

  getChunkLimits() {
    const cap = this.settings.speechEngine === 'mimo' ? 200 : this.settings.speechEngine === 'system' ? Infinity : 800;
    return parseChunkLimits(this.settings.chunkLimits, ONLINE_CHUNK_LIMITS).map((limit) => Math.min(limit, cap));
  }

  async updateRemoteEndpoint(value) {
    const endpoint = String(value || '').trim();
    if (endpoint !== this.settings.remoteEndpoint) {
      this.settings.remoteEndpoint = endpoint;
      this.settings.remoteSecretName = '';
      this.settings.remoteConsent = false;
    }
    await this.saveSettings();
  }

  runSafely(action) {
    void Promise.resolve()
      .then(action)
      .catch((error) => this.fail(error));
  }

  async activateView() {
    this.captureSelection();
    const source = this.getSourceLeaf();
    if (source) this.sourceLeaf = source;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const leaf = leaves[0]
      || (this.app.workspace.getLeaf ? this.app.workspace.getLeaf(true) : this.app.workspace.getRightLeaf(false));
    if (!leaf) {
      return;
    }
    if (!leaves.length) {
      await leaf.setViewState({ active: true, type: VIEW_TYPE });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  getSourceLeaf() {
    const active = this.app.workspace.activeLeaf;
    if (active?.view?.file) return active;
    // Only fall back while our own panel is active, never from an unrelated tab.
    if (active?.view?.getViewType?.() === VIEW_TYPE && this.sourceLeaf?.view?.containerEl?.isConnected) return this.sourceLeaf;
    return null;
  }

  captureSelection() {
    const leaf = this.getSourceLeaf();
    const view = leaf?.view;
    if (!view?.file || this.app.workspace.activeLeaf !== leaf) return;
    const editorText = view.getMode?.() === 'preview' ? '' : String(view.editor?.getSelection?.() || '').trim();
    let context;
    if (isHtmlFile(view.file)) {
      const htmlDocument = htmlReaderDocument(view);
      const captured = captureHtmlSelection(htmlDocument);
      if (captured) context = { ...captured, htmlDocument };
    } else if (editorText) {
      context = { text: editorText, from: view.editor.getCursor('from'), pageNumber: 1 };
    } else if (typeof window !== 'undefined') {
      const selection = window.getSelection?.();
      if (!selection?.anchorNode || !selection.focusNode
        || !view.contentEl?.contains(selection.anchorNode) || !view.contentEl.contains(selection.focusNode)) return;
      context = getWindowSelectionContext();
    }
    if (!context?.text) return;
    this.sourceLeaf = leaf;
    this.selectionSnapshot = { ...context, leaf, filePath: view.file.path, mtime: view.file.stat?.mtime };
  }

  getSelectionSnapshot() {
    this.captureSelection();
    const saved = this.selectionSnapshot;
    const leaf = this.getSourceLeaf();
    return saved && saved.leaf === leaf && saved.filePath === leaf?.view?.file?.path
      && saved.mtime === leaf.view.file.stat?.mtime
      && (!isHtmlFile(leaf.view.file) || saved.htmlDocument === htmlReaderDocument(leaf.view)) ? saved : null;
  }

  showToolbar() {
    this.captureSelection();
    this.toolbarEnabled = true;
    this.syncToolbar();
    if (!this.getSourceLeaf()) new Notice(getUi(this.settings).noFile);
  }

  removeToolbar() {
    this.dock?.host.removeClass('note-reader-mobile-docked-view');
    this.dock?.root.remove();
    this.dock = null;
  }

  async closeReader(stop = true) {
    if (stop) {
      this.toolbarEnabled = false;
      this.stopReading({ quiet: true });
      this.removeToolbar();
    } else this.toolbarEnabled = true;
    const source = this.getSourceLeaf() || this.sourceLeaf;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.detach();
    if (source?.view?.containerEl?.isConnected) await this.app.workspace.revealLeaf(source);
    if (stop) this.selectionSnapshot = null;
    this.syncToolbar();
  }

  syncToolbar() {
    if (!this.toolbarEnabled) return;
    const leaf = this.getSourceLeaf();
    const host = leaf?.view?.containerEl;
    if (!host || !['md', 'markdown', 'txt', 'pdf', 'html', 'htm'].includes(String(leaf.view.file?.extension).toLowerCase())) {
      this.removeToolbar();
      return;
    }
    this.sourceLeaf = leaf;
    this.syncHtmlSelectionListener(leaf);
    if (this.dock?.host === host && this.dock.root.isConnected && this.dock.language === this.settings.settingsLanguage) {
      this.updateToolbar();
      return;
    }
    this.removeToolbar();
    const ui = getUi(this.settings);
    host.addClass('note-reader-mobile-docked-view');
    const root = host.createDiv({ cls: 'note-reader-mobile-dock' });
    // Keep controls above the scrollable document, away from iOS floating navigation.
    let content = leaf.view.contentEl;
    while (content?.parentElement && content.parentElement !== host) content = content.parentElement;
    if (content?.parentElement === host) host.insertBefore(root, content);
    else host.insertBefore(root, host.firstElementChild);
    root.setAttr('role', 'region'); root.setAttr('aria-label', ui.toolbar);
    root.addEventListener('pointerdown', () => this.captureSelection(), true);
    const header = root.createDiv({ cls: 'note-reader-mobile-dock-header' });
    const scope = header.createEl('select');
    scope.setAttr('aria-label', ui.readingScope);
    for (const [value, label] of [['file', ui.readFile], ['selection', ui.readSelection], ['from', ui.readFromSelection], ['saved', ui.resumeFile], ['footnotes', ui.readFootnotes]]) {
      const option = scope.createEl('option', { text: label }); option.value = value;
    }
    scope.value = this.readingScope || 'file';
    scope.addEventListener('change', () => { this.readingScope = scope.value; this.updateToolbar(); });
    const outline = createButton(header, { icon: 'list-tree', iconOnly: true, label: ui.pdfOutline, onClick: () => this.openPdfOutline() });
    createButton(header, { icon: 'panel-top', iconOnly: true, label: ui.openPanel, onClick: () => this.runSafely(() => this.activateView()) });
    createButton(header, { icon: 'x', iconOnly: true, label: ui.closeReader, onClick: () => this.runSafely(() => this.closeReader()) });
    const controls = root.createDiv({ cls: 'note-reader-mobile-dock-controls' });
    const previous = createButton(controls, { icon: 'skip-back', iconOnly: true, label: ui.previous, onClick: () => this.moveChunk(-1) });
    const play = createButton(controls, { icon: 'play', iconOnly: true, label: ui.readFile, onClick: () => {
      if (this.queue.items.length && !['complete', 'error'].includes(this.queue.status)) this.togglePause();
      else this.runSafely(() => this[({ selection: 'readSelection', from: 'readFromSelection', saved: 'resumeFile', footnotes: 'readFootnotes' })[scope.value] || 'readFile']());
    } });
    const stop = createButton(controls, { icon: 'square', iconOnly: true, label: ui.stop, onClick: () => this.stopReading({ quiet: true }) });
    const next = createButton(controls, { icon: 'skip-forward', iconOnly: true, label: ui.next, onClick: () => this.moveChunk(1) });
    const timeline = controls.createDiv({ cls: 'note-reader-mobile-dock-timeline' });
    const seek = timeline.createEl('input', { cls: 'note-reader-mobile-range' });
    seek.type = 'range'; seek.min = '0'; seek.max = '1'; seek.step = '0.1';
    seek.setAttr('aria-label', ui.currentAudio);
    const status = timeline.createDiv({ cls: 'note-reader-mobile-dock-status' });
    let scrubbing = false;
    seek.addEventListener('input', () => { scrubbing = true; });
    seek.addEventListener('change', () => { this.seekAudioTo(Number(seek.value)); scrubbing = false; this.updateToolbar(); });
    seek.addEventListener('blur', () => { scrubbing = false; this.updateToolbar(); });
    const speed = controls.createEl('select'); speed.setAttr('aria-label', ui.speed);
    for (const value of SPEED_PRESETS) { const option = speed.createEl('option', { text: `${value}x` }); option.value = String(value); }
    speed.addEventListener('change', () => this.runSafely(() => this.setPlaybackSpeed(Number(speed.value))));
    this.dock = { root, host, header, outline, language: this.settings.settingsLanguage, scope, play, stop, previous, next, seek, speed, status, isScrubbing: () => scrubbing };
    this.updateToolbar();
  }

  updateToolbar() {
    const refs = this.dock;
    if (!refs) return;
    const ui = getUi(this.settings);
    const isPdf = String(this.getSourceLeaf()?.view.file?.extension).toLowerCase() === 'pdf';
    refs.outline.hidden = !isPdf;
    refs.header.toggleClass('has-pdf-outline', isPdf);
    const footnotesOption = Array.from(refs.scope.children).find((child) => child.value === 'footnotes');
    footnotesOption.hidden = footnotesOption.disabled = !isPdf;
    if (!isPdf && refs.scope.value === 'footnotes') { refs.scope.value = 'file'; this.readingScope = 'file'; }
    const active = this.queue.items.length > 0 && !['complete', 'error'].includes(this.queue.status);
    const label = active ? (this.pauseRequested ? ui.resume : ui.pause) : ui[({ selection: 'readSelection', from: 'readFromSelection', saved: 'resumeFile', footnotes: 'readFootnotes' })[refs.scope.value] || 'readFile'];
    const icon = active && !this.pauseRequested ? 'pause' : 'play';
    if (refs.icon !== icon) { setIcon(refs.play.firstElementChild, icon); refs.icon = icon; }
    refs.play.setAttr('aria-label', label); refs.play.setAttr('title', label);
    refs.scope.disabled = !!active || this.phaseOverride === 'extracting';
    refs.play.disabled = this.phaseOverride === 'extracting';
    refs.stop.disabled = !this.queue.items.length && this.phaseOverride !== 'extracting';
    refs.previous.disabled = this.queue.currentIndex <= 0;
    refs.next.disabled = this.queue.currentIndex < 0 || this.queue.currentIndex >= this.queue.items.length - 1;
    refs.seek.disabled = !this.canSeekAudio();
    if (!refs.isScrubbing()) {
      refs.seek.max = String(this.canSeekAudio() ? this.activeAudio.duration : 1);
      refs.seek.value = String(this.canSeekAudio() ? this.activeAudio.currentTime : 0);
    }
    refs.speed.value = String(this.settings.speed);
    const phase = this.pauseRequested ? 'paused' : this.phaseOverride || this.queue.status;
    const path = getCurrentPlaybackItem(this.queue)?.metadata?.filePath;
    const filename = path ? path.split('/').pop() : '';
    refs.status.textContent = `${ui[phase] || ui.idle} · ${ui.progress(Math.max(0, this.queue.currentIndex + 1), this.queue.items.length)}`;
    if (filename && path !== this.getSourceLeaf()?.view.file?.path) refs.status.textContent = `${filename} · ${refs.status.textContent}`;
    refs.status.setAttr('title', this.statusDetail || refs.status.textContent);
  }

  renderViews() {
    this.syncToolbar();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view && leaf.view.contentEl) {
        this.renderView(leaf.view.contentEl);
      }
    }
  }

  renderView(containerEl) {
    const ui = getUi(this.settings);
    this.playerViews ||= new WeakMap();
    const existing = this.playerViews.get(containerEl);
    if (existing && existing.language === this.settings.settingsLanguage) {
      this.updatePlayer(existing);
      return;
    }
    containerEl.empty();
    containerEl.addClass('note-reader-mobile-root');
    const header = containerEl.createDiv({ cls: 'note-reader-mobile-panel-header' });
    createButton(header, { icon: 'arrow-left', iconOnly: true, label: ui.backToText, onClick: () => this.runSafely(() => this.closeReader(false)) });
    header.createEl('h2', { text: ui.title });
    createButton(header, { icon: 'x', iconOnly: true, label: ui.closeReader, onClick: () => this.runSafely(() => this.closeReader()) });

    const status = containerEl.createDiv({ cls: 'note-reader-mobile-status' });
    const displayedPhase = this.phaseOverride || this.queue.status;
    const phaseEl = status.createDiv({
      cls: `note-reader-mobile-phase is-${displayedPhase}`,
      text: this.statusDetail || ui[displayedPhase] || ui.idle,
    });
    const sourceEl = status.createDiv({ cls: 'note-reader-mobile-source', text: this.sourceLabel });

    const navigation = containerEl.createDiv({ cls: 'note-reader-mobile-navigation' });
    const previous = createButton(navigation, {
      disabled: this.queue.currentIndex <= 0,
      icon: 'skip-back',
      iconOnly: true,
      label: ui.previous,
      onClick: () => this.moveChunk(-1),
    });
    const current = this.queue.currentIndex >= 0 ? this.queue.currentIndex + 1 : 0;
    const progress = navigation.createDiv({
      cls: 'note-reader-mobile-progress',
      text: ui.progress(current, this.queue.items.length),
    });
    const next = createButton(navigation, {
      disabled: this.queue.currentIndex < 0 || this.queue.currentIndex >= this.queue.items.length - 1,
      icon: 'skip-forward',
      iconOnly: true,
      label: ui.next,
      onClick: () => this.moveChunk(1),
    });

    const transport = containerEl.createDiv({ cls: 'note-reader-mobile-transport' });
    const back = createButton(transport, { icon: 'rotate-ccw', iconOnly: true, label: ui.seekBack, onClick: () => this.seekAudioBy(-5) });
    const pause = createButton(transport, { icon: 'pause', iconOnly: true, label: ui.pause, onClick: () => this.togglePause() });
    const stop = createButton(transport, { icon: 'square', iconOnly: true, label: ui.stop, onClick: () => this.stopReading() });
    const forward = createButton(transport, { icon: 'rotate-cw', iconOnly: true, label: ui.seekForward, onClick: () => this.seekAudioBy(5) });
    const audioSection = containerEl.createDiv({ cls: 'note-reader-mobile-section' });
    const time = audioSection.createDiv({ cls: 'note-reader-mobile-section-label' });
    const seek = audioSection.createEl('input', { cls: 'note-reader-mobile-range' });
    seek.type = 'range'; seek.min = '0'; seek.max = '1'; seek.step = '0.1';
    seek.setAttr('aria-label', ui.currentAudio);
    let scrubbing = false;
    seek.addEventListener('input', () => { scrubbing = true; });
    seek.addEventListener('change', () => { this.seekAudioTo(Number(seek.value)); scrubbing = false; this.renderViews(); });
    seek.addEventListener('blur', () => { scrubbing = false; this.renderViews(); });

    const speedSection = containerEl.createDiv({ cls: 'note-reader-mobile-section' });
    const speedLabel = speedSection.createDiv({ cls: 'note-reader-mobile-section-label' });
    const speeds = speedSection.createDiv({ cls: 'note-reader-mobile-segmented' });
    const speedButtons = [];
    for (const speed of SPEED_PRESETS) {
      const button = speeds.createEl('button', { text: `${speed}x` });
      button.type = 'button';
      button.toggleClass('is-active', this.settings.speed === speed);
      button.addEventListener('click', () => this.runSafely(() => this.setPlaybackSpeed(speed)));
      speedButtons.push([speed, button]);
    }
    const systemNote = speedSection.createDiv({ cls: 'note-reader-mobile-section-label', text: ui.systemControls });
    const volumeSection = containerEl.createDiv({ cls: 'note-reader-mobile-section' });
    const volumeLabel = volumeSection.createDiv({ cls: 'note-reader-mobile-section-label' });
    const volume = volumeSection.createEl('input', { cls: 'note-reader-mobile-range' });
    volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '0.01';
    volume.setAttr('aria-label', ui.volume);
    volume.addEventListener('input', () => this.applyVolume(Number(volume.value)));
    volume.addEventListener('change', () => this.runSafely(() => this.saveSettings()));

    const commands = containerEl.createDiv({ cls: 'note-reader-mobile-command-grid' });
    createButton(commands, { icon: 'text-select', label: ui.readSelection, onClick: () => this.runSafely(() => this.readSelection()) });
    createButton(commands, { icon: 'list-start', label: ui.readFromSelection, onClick: () => this.runSafely(() => this.readFromSelection()) });
    createButton(commands, { icon: 'file-audio', label: ui.readFile, onClick: () => this.runSafely(() => this.readFile()) });
    createButton(commands, { icon: 'history', label: ui.resumeFile, onClick: () => this.runSafely(() => this.resumeFile()) });
    const outline = createButton(commands, { icon: 'list-tree', label: ui.pdfOutline, onClick: () => this.openPdfOutline() });
    const footnotes = createButton(commands, { icon: 'text-quote', label: ui.readFootnotes, onClick: () => this.runSafely(() => this.readFootnotes()) });
    const exportAudio = createButton(commands, { icon: 'download', label: ui.exportAudio, onClick: () => this.openAudioExport() });
    const text = containerEl.createEl('p', { cls: 'note-reader-mobile-current-text' });
    const refs = { language: this.settings.settingsLanguage, ui, phaseEl, sourceEl, previous, next, progress, back, forward, pause, stop, seek, time, speedLabel, speedButtons, systemNote, volumeLabel, volume, outline, footnotes, exportAudio, text, isScrubbing: () => scrubbing };
    this.playerViews.set(containerEl, refs);
    this.updatePlayer(refs);
  }

  updatePlayer(refs) {
    const { ui } = refs;
    refs.outline.hidden = refs.footnotes.hidden = String(this.getSourceLeaf()?.view.file?.extension).toLowerCase() !== 'pdf';
    refs.exportAudio.disabled = this.settings.speechEngine === 'system' || !this.queue.items.length;
    const phase = this.pauseRequested ? 'paused' : this.phaseOverride || this.queue.status;
    refs.phaseEl.textContent = this.pauseRequested ? (this.playbackBlocked ? ui.audioBlocked : ui.paused) : this.statusDetail || ui[phase] || ui.idle;
    refs.phaseEl.className = `note-reader-mobile-phase is-${phase}`;
    refs.sourceEl.textContent = this.sourceLabel;
    refs.previous.disabled = this.queue.currentIndex <= 0;
    refs.next.disabled = this.queue.currentIndex < 0 || this.queue.currentIndex >= this.queue.items.length - 1;
    refs.progress.textContent = ui.progress(Math.max(0, this.queue.currentIndex + 1), this.queue.items.length);
    refs.pause.disabled = !this.queue.items.length || ['complete', 'error'].includes(this.queue.status);
    const pauseLabel = this.pauseRequested ? ui.resume : ui.pause;
    refs.pause.setAttr('aria-label', pauseLabel); refs.pause.setAttr('title', pauseLabel);
    if (refs.pauseIcon !== this.pauseRequested) {
      setIcon(refs.pause.firstElementChild, this.pauseRequested ? 'play' : 'pause');
      refs.pauseIcon = this.pauseRequested;
    }
    refs.stop.disabled = !this.queue.items.length && this.phaseOverride !== 'extracting';
    const canSeek = this.canSeekAudio();
    refs.back.disabled = refs.forward.disabled = refs.seek.disabled = !canSeek;
    refs.back.setAttr('title', this.settings.speechEngine === 'system' ? ui.seekUnavailable : ui.seekBack);
    refs.forward.setAttr('title', this.settings.speechEngine === 'system' ? ui.seekUnavailable : ui.seekForward);
    const duration = canSeek ? this.activeAudio.duration : 0;
    const position = canSeek ? this.activeAudio.currentTime : 0;
    const clock = (value) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
    refs.time.textContent = `${ui.currentAudio} ${clock(position)} / ${clock(duration)}`;
    if (!refs.isScrubbing()) { refs.seek.max = String(duration || 1); refs.seek.value = String(position); }
    refs.speedLabel.textContent = `${ui.speed} ${this.settings.speed}x`;
    refs.speedButtons.forEach(([speed, button]) => { button.toggleClass('is-active', speed === this.settings.speed); button.setAttr('aria-pressed', String(speed === this.settings.speed)); });
    refs.systemNote.hidden = this.settings.speechEngine !== 'system';
    refs.volumeLabel.textContent = `${ui.volume} ${Math.round((this.settings.volume ?? 1) * 100)}%`;
    refs.volume.value = String(this.settings.volume ?? 1);
    const text = getCurrentPlaybackItem(this.queue)?.text || '';
    if (refs.text.textContent !== text) refs.text.textContent = text;
  }

  async setPlaybackSpeed(value) {
    const number = Number(value);
    this.settings.speed = Number.isFinite(number) ? Math.max(0.5, Math.min(2, number)) : 1;
    if (this.activeAudio) this.activeAudio.playbackRate = this.settings.speed;
    this.renderViews();
    await this.saveSettings();
  }

  applyVolume(value) {
    const number = Number(value);
    this.settings.volume = Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 1;
    if (this.activeAudio) this.activeAudio.volume = this.settings.volume;
    this.renderViews();
  }

  canSeekAudio() {
    return this.settings.speechEngine !== 'system' && !!this.activeAudio && Number.isFinite(this.activeAudio.duration) && this.activeAudio.duration > 0;
  }

  seekAudioTo(value) {
    if (!this.canSeekAudio() || !Number.isFinite(value)) return false;
    this.activeAudio.currentTime = Math.max(0, Math.min(this.activeAudio.duration, value));
    this.renderViews();
    return true;
  }

  seekAudioBy(seconds) {
    return this.canSeekAudio() && this.seekAudioTo(this.activeAudio.currentTime + seconds);
  }

  getActiveFile() {
    return this.getSourceLeaf()?.view.file || (this.app.workspace.getActiveFile ? this.app.workspace.getActiveFile() : null);
  }

  getMarkdownView() {
    const source = this.getSourceLeaf()?.view;
    if (source?.editor) return source;
    return this.app.workspace.getActiveViewOfType
      ? this.app.workspace.getActiveViewOfType(MarkdownView)
      : null;
  }

  getSelectedText() {
    const saved = this.getSelectionSnapshot();
    if (saved) return saved.text;
    const view = this.getMarkdownView();
    const editorSelection = view && view.getMode?.() !== 'preview' && view.editor && typeof view.editor.getSelection === 'function'
      ? String(view.editor.getSelection() || '').trim()
      : '';
    return editorSelection;
  }

  getMarkdownTextFromSelection() {
    const view = this.getMarkdownView();
    const saved = this.getSelectionSnapshot();
    if (saved?.from && view?.editor) {
      const lastLine = Math.max(0, view.editor.lineCount() - 1);
      return String(view.editor.getRange(saved.from, { line: lastLine, ch: String(view.editor.getLine(lastLine) || '').length }) || '');
    }
    if (view && view.editor && typeof view.editor.getCursor === 'function') {
      const selection = String(view.editor.getSelection ? view.editor.getSelection() : '').trim();
      if (selection) {
        const start = view.editor.getCursor('from');
        const lastLine = Math.max(0, view.editor.lineCount() - 1);
        const end = { line: lastLine, ch: String(view.editor.getLine(lastLine) || '').length };
        return String(view.editor.getRange(start, end) || '');
      }
    }
    return '';
  }

  async readSelection() {
    const ui = getUi(this.settings);
    const text = this.getSelectedText();
    if (!text) {
      new Notice(ui.noSelection);
      return;
    }
    const file = this.getActiveFile();
    this.startTextSession(text, {
      file,
      kind: file && String(file.extension).toLowerCase() === 'pdf' ? 'pdf' : 'markdown',
      pageNumber: this.getSelectionSnapshot()?.pageNumber || 1,
      sourceLabel: ui.sourceSelection,
    });
  }

  async readFromSelection() {
    const ui = getUi(this.settings);
    const file = this.getActiveFile();
    const selectedText = this.getSelectedText();
    if (!file || !selectedText) {
      new Notice(!file ? ui.noFile : ui.noSelection);
      return;
    }
    if (isHtmlFile(file)) {
      const selected = this.getSelectionSnapshot();
      if (selected?.htmlFrom) {
        this.startTextSession(selected.htmlFrom, { file, kind: 'markdown', sourceLabel: ui.sourceSelection });
      } else await this.readHtml(file, selectedText, ui.sourceSelection);
      return;
    }
    if (String(file.extension || '').toLowerCase() === 'pdf') {
      const selection = this.getSelectionSnapshot() || { text: selectedText, pageNumber: 1 };
      await this.readPdf(file, {
        anchor: selection.text,
        sourceLabel: ui.sourceSelection,
        startPageNumber: selection.pageNumber,
      });
      return;
    }

    let text = this.getMarkdownTextFromSelection();
    if (!text) {
      const fullText = await this.app.vault.cachedRead(file);
      text = sliceTextFromReadingPosition(fullText, { anchor: selectedText }).text;
    }
    this.startTextSession(text, { file, kind: 'markdown', sourceLabel: ui.sourceSelection });
  }

  async readFile() {
    const ui = getUi(this.settings);
    const file = this.getActiveFile();
    if (!file) {
      new Notice(ui.noFile);
      return;
    }
    if (isHtmlFile(file)) { await this.readHtml(file, '', ui.sourceFile); return; }
    if (String(file.extension || '').toLowerCase() === 'pdf') {
      await this.readPdf(file, { sourceLabel: ui.sourceFile, startPageNumber: 1 });
      return;
    }
    if (!['md', 'markdown', 'txt'].includes(String(file.extension || '').toLowerCase())) {
      new Notice(ui.noFile);
      return;
    }
    const text = await this.app.vault.cachedRead(file);
    this.startTextSession(text, { file, kind: 'markdown', sourceLabel: ui.sourceFile });
  }

  async resumeFile() {
    const ui = getUi(this.settings);
    const file = this.getActiveFile();
    const position = file && this.settings.readingPositions[file.path];
    if (!file || !position) {
      new Notice(!file ? ui.noFile : ui.noResume);
      return;
    }
    if (isHtmlFile(file)) { await this.readHtml(file, position.anchor, ui.sourceResume); return; }
    if (position.kind === 'pdf' && String(file.extension || '').toLowerCase() === 'pdf') {
      await this.readPdf(file, {
        anchor: position.anchor,
        sourceLabel: ui.sourceResume,
        startPageNumber: position.pageNumber,
      });
      return;
    }
    const text = await this.app.vault.cachedRead(file);
    const sliced = sliceTextFromReadingPosition(text, position);
    this.startTextSession(sliced.text, { file, kind: 'markdown', sourceLabel: ui.sourceResume });
  }

  prepareText(text) {
    return this.settings.stripMarkdown
      ? sanitizeAcademicTextForSpeech(text, academicOptions(this.settings))
      : String(text || '').replace(/\r\n?/g, '\n').trim();
  }

  openAudioExport() {
    if (this.settings.speechEngine === 'system' || !this.queue.items.length) { new Notice(getUi(this.settings).exportUnavailable); return; }
    if (this.exportModal && !this.exportModal.closed) return;
    this.exportModal = new AudioExportModal(this); this.exportModal.open();
  }

  clearHtmlSelectionListener() {
    if (this.htmlSelectionBinding) {
      const { doc, listener, pointer } = this.htmlSelectionBinding;
      doc.removeEventListener('selectionchange', listener);
      doc.removeEventListener('pointerdown', pointer);
      this.htmlSelectionBinding = null;
    }
  }

  syncHtmlSelectionListener(leaf) {
    const doc = isHtmlFile(leaf?.view.file) ? htmlReaderDocument(leaf.view) : null;
    if (this.htmlSelectionBinding?.doc === doc) return;
    this.clearHtmlSelectionListener();
    if (doc) {
      const listener = () => { if (this.app.workspace.activeLeaf === leaf) this.captureSelection(); };
      const pointer = () => { if (this.app.workspace.activeLeaf === leaf) this.selectionSnapshot = null; };
      doc.addEventListener('selectionchange', listener);
      doc.addEventListener('pointerdown', pointer);
      this.htmlSelectionBinding = { doc, listener, pointer };
    }
  }

  async readHtml(file, anchor, sourceLabel) {
    if (file.stat?.size > MAX_HTML_BYTES) throw new Error('HTML exceeds the 20 MiB limit.');
    const operation = this.beginOperation('extracting');
    const mtime = file.stat?.mtime;
    const source = await this.app.vault.cachedRead(file);
    if (operation !== this.sessionId) return;
    if (file.stat?.mtime !== mtime) throw new Error('HTML changed; select the starting point again.');
    let text = extractHtmlText(source, this.settings.stripMarkdown ? academicOptions(this.settings) : {});
    if (anchor) {
      const sliced = sliceTextFromReadingPosition(text, { anchor });
      if (!sliced.matched) throw new Error('Could not find the selected/saved HTML position. Select it again in HTML Reader. / 无法定位所选或保存位置，请在 HTML Reader 中重新选择。');
      text = sliced.text;
    }
    this.startTextSession(text, { file, kind: 'markdown', sourceLabel });
  }

  openPdfOutline() {
    const file = this.getActiveFile();
    if (String(file?.extension).toLowerCase() !== 'pdf') { new Notice(getUi(this.settings).noFile); return; }
    if (this.outlineModal?.file === file && !this.outlineModal.closed) return;
    this.outlineModal?.close();
    this.outlineModal = new PdfOutlineModal(this, file);
    this.outlineModal.open();
  }

  async loadPdfOutline(file, isCancelled, onProgress, force = false) {
    const key = outlineKey(file, this.settings.pdfSkipHeaders);
    if (!force && this.pdfOutlineCache?.key === key) return this.pdfOutlineCache;
    // Retain only one parsed PDF in memory; never put document text in settings.
    this.pdfOutlineCache = null;
    const result = await extractPdfDocument(this.app, file, {
      loadPdfJs, includeOutline: true, skipHeaders: this.settings.pdfSkipHeaders, isCancelled, onProgress,
    });
    if (isCancelled()) return null;
    if (!this.isOutlineCurrent(file, key)) throw new Error('PDF or settings changed.');
    const cached = { path: file.path, key, data: buildPdfOutline(result.pages, result.bookmarks) };
    this.pdfOutlineCache = cached;
    return cached;
  }

  isOutlineCurrent(file, key) {
    return outlineKey(file, this.settings.pdfSkipHeaders) === key
      && (!this.app.vault.getAbstractFileByPath || this.app.vault.getAbstractFileByPath(file.path) === file);
  }

  readPdfSection(file, key, data, index, remaining) {
    if (!this.isOutlineCurrent(file, key) || this.getActiveFile() !== file) throw new Error('PDF or settings changed.');
    const pages = sectionPages(data, index, remaining);
    const chunks = this.buildPdfChunks(pages, {});
    if (!chunks.length) throw new Error('No readable text in the section.');
    this.startPreparedChunks(chunks, { file, kind: 'pdf', sourceLabel: data.entries[index].title });
  }

  async readFootnotes() {
    const file = this.getActiveFile();
    if (String(file?.extension).toLowerCase() !== 'pdf') { new Notice(getUi(this.settings).noFile); return; }
    await this.readPdf(file, { startPageNumber: 1, footnoteMode: 'footnotes', sourceLabel: getUi(this.settings).readFootnotes });
  }

  buildPdfChunks(pages, context) {
    const chunker = createIncrementalSpeechChunker(
      this.getChunkLimits(),
      { detailed: true }
    );
    const chunks = [];
    pages.forEach((page, pageIndex) => {
      let text = page.text;
      if (pageIndex === 0 && context.anchor) {
        const sliced = sliceTextFromReadingPosition(text, { anchor: context.anchor });
        text = sliced.text;
        // Preserve an explicitly chosen edge anchor if filtering removed it on the starting page.
        if (!sliced.matched && page.unfilteredText) {
          const original = sliceTextFromReadingPosition(page.unfilteredText, { anchor: context.anchor });
          if (original.matched) text = original.text;
        }
      }
      const mode = normalizeFootnoteMode(context.footnoteMode || this.settings.pdfFootnoteMode);
      if (mode !== 'inline') {
        const parts = splitFootnotesInRange(text, page.layout?.lines.filter((line) => line.footnote) || []);
        text = mode === 'footnotes' ? parts.notes : parts.body;
      }
      const clean = this.prepareText(text);
      chunks.push(...chunker.push(clean, { pageNumber: page.pageNumber }));
    });
    chunks.push(...chunker.finish());
    return chunks;
  }

  async readPdf(file, context) {
    const operationId = this.beginOperation('extracting');
    const ui = getUi(this.settings);
    try {
      const pages = await extractPdfPages(this.app, file, {
        loadPdfJs,
        startPageNumber: context.startPageNumber,
        skipHeaders: this.settings.pdfSkipHeaders,
        isCancelled: () => operationId !== this.sessionId,
        onProgress: ({ pageNumber, totalPages }) => {
          this.statusDetail = `${ui.extracting} ${pageNumber}/${totalPages}`;
          this.renderViews();
        },
      });
      if (operationId !== this.sessionId) {
        return;
      }
      const chunks = this.buildPdfChunks(pages, context);
      if (!chunks.length && (context.footnoteMode || this.settings.pdfFootnoteMode) === 'footnotes') {
        this.stopReading({ quiet: true }); new Notice(ui.noFootnotes); return;
      }
      this.startPreparedChunks(chunks, {
        file,
        kind: 'pdf',
        sourceLabel: context.sourceLabel,
      });
    } catch (error) {
      if (operationId === this.sessionId) {
        this.fail(error);
      }
    }
  }

  startTextSession(text, context) {
    const clean = this.prepareText(text);
    const chunks = splitTextForSpeechChunks(
      clean,
      this.getChunkLimits()
    );
    this.startPreparedChunks(chunks, context);
  }

  startPreparedChunks(chunks, context) {
    this.toolbarEnabled = true;
    this.syncToolbar();
    const items = (Array.isArray(chunks) ? chunks : []).map((chunk, index) => {
      const detailed = chunk && typeof chunk === 'object' ? chunk : { metadata: null, text: chunk };
      return {
        id: `chunk-${index + 1}`,
        text: String(detailed.text || ''),
        metadata: {
          chunkIndex: index,
          fileMtime: Number(context.file && context.file.stat && context.file.stat.mtime) || 0,
          filePath: String(context.file && context.file.path || ''),
          kind: context.kind || 'markdown',
          pageNumber: Number(detailed.metadata && detailed.metadata.pageNumber) || Number(context.pageNumber) || 1,
        },
      };
    }).filter((item) => item.text.trim());
    if (!items.length) {
      this.fail(new Error('No readable text was found.'));
      return;
    }
    this.cancelActivePlayback();
    this.sessionId += 1;
    this.runId += 1;
    this.pauseRequested = false;
    this.queue = createPlaybackQueueState(items);
    this.sourceLabel = context.sourceLabel || '';
    this.statusDetail = '';
    this.phaseOverride = '';
    this.renderViews();
    void this.runFromCurrent();
  }

  beginOperation(status) {
    this.toolbarEnabled = true;
    this.syncToolbar();
    this.cancelActivePlayback();
    this.sessionId += 1;
    this.runId += 1;
    this.pauseRequested = false;
    this.queue = createPlaybackQueueState();
    this.phaseOverride = status;
    this.sourceLabel = '';
    this.statusDetail = '';
    this.renderViews();
    return this.sessionId;
  }

  async runFromCurrent() {
    const sessionId = this.sessionId;
    const runId = ++this.runId;
    while (sessionId === this.sessionId && runId === this.runId) {
      const item = getCurrentPlaybackItem(this.queue);
      if (!item) {
        return;
      }
      await this.waitUntilResumed(sessionId, runId);
      if (sessionId !== this.sessionId || runId !== this.runId) {
        return;
      }
      this.queue = reducePlaybackQueueState(this.queue, { type: 'play' });
      this.statusDetail = '';
      this.renderViews();
      try {
        const outcome = this.settings.speechEngine === 'system'
          ? await this.playSystemChunk(item.text)
          : await this.playOnlineParts(item.text, sessionId, runId);
        if (outcome !== 'ended' || sessionId !== this.sessionId || runId !== this.runId) {
          return;
        }
        await this.rememberPosition(item);
        if (sessionId !== this.sessionId || runId !== this.runId) return;
        if (this.queue.currentIndex >= this.queue.items.length - 1) {
          this.queue = reducePlaybackQueueState(this.queue, { type: 'next' });
          this.statusDetail = '';
          this.renderViews();
          return;
        }
        this.queue = reducePlaybackQueueState(this.queue, { type: 'next' });
      } catch (error) {
        if (sessionId === this.sessionId && runId === this.runId) {
          this.fail(error);
        }
        return;
      }
    }
  }

  async playSystemChunk(text) {
    const sessionId = this.sessionId;
    const runId = this.runId;
    await this.waitUntilResumed(sessionId, runId);
    if (sessionId !== this.sessionId || runId !== this.runId) return 'cancelled';
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.reject(new Error('System speech is unavailable on this device. Choose an online engine.'));
    }
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.speed;
    utterance.volume = this.settings.volume ?? 1;
    const voice = synthesis.getVoices().find((entry) => entry.voiceURI === this.settings.systemVoiceUri);
    if (voice) {
      utterance.voice = voice;
    }
    this.activeUtterance = utterance;
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (outcome, error) => {
        if (settled) {
          return;
        }
        settled = true;
        this.activePlaybackSettle = null;
        this.activeUtterance = null;
        if (error) {
          reject(error);
        } else {
          resolve(outcome);
        }
      };
      this.activePlaybackSettle = (outcome = 'cancelled') => settle(outcome);
      utterance.onend = () => settle('ended');
      utterance.onerror = (event) => {
        const code = String(event && event.error || 'speech error');
        if (code === 'canceled' || code === 'interrupted') {
          settle('cancelled');
        } else {
          settle('', new Error(`System speech failed: ${code}.`));
        }
      };
      synthesis.speak(utterance);
    });
  }

  async playOnlineParts(text, sessionId, runId) {
    const parts = splitOpeningAudioParts(text, this.settings.rapidStart === true);
    for (const part of parts) {
      await this.waitUntilResumed(sessionId, runId);
      if (sessionId !== this.sessionId || runId !== this.runId) return 'cancelled';
      const outcome = await this.playOnlineChunk(part, sessionId, runId);
      if (outcome !== 'ended' || sessionId !== this.sessionId || runId !== this.runId) return 'cancelled';
    }
    return 'ended';
  }

  async playOnlineChunk(text, sessionId, runId) {
    await this.waitUntilResumed(sessionId, runId);
    if (sessionId !== this.sessionId || runId !== this.runId) return 'cancelled';
    this.statusDetail = getUi(this.settings).synthesizing;
    this.phaseOverride = 'synthesizing';
    this.renderViews();
    const audioData = await synthesizeOnlineChunk(text, this.settings, this.app, undefined, () => this.settings);
    if (sessionId !== this.sessionId || runId !== this.runId) {
      return 'cancelled';
    }
    await this.waitUntilResumed(sessionId, runId);
    if (sessionId !== this.sessionId || runId !== this.runId) {
      return 'cancelled';
    }
    const blob = new Blob([audioData.arrayBuffer], { type: audioData.mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = this.settings.speed;
    audio.volume = this.settings.volume ?? 1;
    audio.onloadedmetadata = audio.ontimeupdate = audio.ondurationchange = () => this.renderViews();
    this.activeAudio = audio;
    this.activeAudioUrl = url;
    this.statusDetail = '';
    this.phaseOverride = '';
    this.renderViews();

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (outcome, error) => {
        if (settled) {
          return;
        }
        settled = true;
        this.activePlaybackSettle = null;
        this.cleanupAudio();
        if (error) {
          reject(error);
        } else {
          resolve(outcome);
        }
      };
      this.activePlaybackSettle = (outcome = 'cancelled') => settle(outcome);
      audio.onended = () => settle('ended');
      audio.onerror = () => settle('', new Error('The synthesized audio could not be played on this device.'));
      this.requestAudioPlayback(audio, (error) => {
        if (!settled && !this.pauseForBlockedAudio(error, audio)) {
          settle('', new Error('The synthesized audio could not be played on this device.'));
        }
      });
    });
  }

  cleanupAudio() {
    this.playbackBlocked = false;
    if (this.activeAudio) {
      this.activeAudio.onended = this.activeAudio.onerror = this.activeAudio.onloadedmetadata = this.activeAudio.ontimeupdate = this.activeAudio.ondurationchange = null;
      this.activeAudio.pause();
      this.activeAudio.removeAttribute('src');
      this.activeAudio.load();
      this.activeAudio = null;
    }
    if (this.activeAudioUrl) {
      URL.revokeObjectURL(this.activeAudioUrl);
      this.activeAudioUrl = '';
    }
  }

  requestAudioPlayback(audio, onError) {
    try {
      const result = audio.play();
      if (result && typeof result.catch === 'function') void result.catch(onError);
    } catch (error) {
      onError(error);
    }
  }

  cancelActivePlayback() {
    const settle = this.activePlaybackSettle;
    this.activePlaybackSettle = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
    this.cleanupAudio();
    if (settle) {
      settle('cancelled');
    }
    this.releaseResumeWaiters();
  }

  async waitUntilResumed(sessionId, runId) {
    if (typeof document !== 'undefined' && document.hidden && sessionId === this.sessionId && runId === this.runId) {
      this.pauseReading();
    }
    while (this.pauseRequested && sessionId === this.sessionId && runId === this.runId) {
      await new Promise((resolve) => this.resumeWaiters.push(resolve));
    }
  }

  releaseResumeWaiters() {
    const waiters = this.resumeWaiters.splice(0);
    waiters.forEach((resolve) => resolve());
  }

  pauseReading() {
    if (!this.queue.items.length || this.pauseRequested) {
      return;
    }
    this.pauseRequested = true;
    this.queue = reducePlaybackQueueState(this.queue, { type: 'pause' });
    if (this.activeAudio) {
      this.activeAudio.pause();
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    this.renderViews();
  }

  resumeReading() {
    if (!this.pauseRequested) {
      return;
    }
    if (typeof document !== 'undefined' && document.hidden) return;
    this.pauseRequested = false;
    this.queue = reducePlaybackQueueState(this.queue, { type: 'resume' });
    if (this.activeAudio) {
      const sessionId = this.sessionId;
      const runId = this.runId;
      const audio = this.activeAudio;
      this.playbackBlocked = false;
      this.requestAudioPlayback(audio, (error) => {
        if (sessionId === this.sessionId && runId === this.runId && !this.pauseForBlockedAudio(error, audio)) this.fail(new Error('The synthesized audio could not be played on this device.'));
      });
    }
    this.statusDetail = '';
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
    this.releaseResumeWaiters();
    this.renderViews();
  }

  pauseForBlockedAudio(error, audio) {
    if (error?.name !== 'NotAllowedError' || this.activeAudio !== audio) return false;
    this.playbackBlocked = true;
    this.phaseOverride = '';
    this.pauseReading();
    this.renderViews();
    return true;
  }

  togglePause() {
    if (this.pauseRequested) {
      this.resumeReading();
    } else {
      this.pauseReading();
    }
  }

  moveChunk(delta) {
    if (!this.queue.items.length) {
      return;
    }
    const target = Math.max(0, Math.min(
      this.queue.items.length - 1,
      this.queue.currentIndex + Math.sign(Number(delta) || 0)
    ));
    if (target === this.queue.currentIndex) {
      return;
    }
    this.runId += 1;
    this.cancelActivePlayback();
    this.pauseRequested = false;
    this.queue = reducePlaybackQueueState(this.queue, { type: 'select', index: target });
    this.renderViews();
    void this.runFromCurrent();
  }

  stopReading(options = {}) {
    this.sessionId += 1;
    this.runId += 1;
    this.cancelActivePlayback();
    this.pauseRequested = false;
    this.queue = createPlaybackQueueState();
    this.sourceLabel = '';
    this.statusDetail = '';
    this.phaseOverride = '';
    this.renderViews();
    if (!options.quiet) {
      new Notice(getUi(this.settings).stop);
    }
  }

  fail(error) {
    const message = error && error.message ? String(error.message) : String(error || 'Unknown error');
    this.sessionId += 1;
    this.runId += 1;
    this.cancelActivePlayback();
    this.phaseOverride = '';
    this.queue = reducePlaybackQueueState(this.queue, { type: 'fail', error: message });
    this.statusDetail = message;
    this.renderViews();
    new Notice(message, 10000);
  }

  async rememberPosition(item) {
    if (!this.settings.rememberReadingPosition || !item || !item.metadata || !item.metadata.filePath) {
      return;
    }
    this.settings.readingPositions = upsertReadingPosition(this.settings.readingPositions, {
      anchor: createReadingAnchor(item.text),
      chunkIndex: item.metadata.chunkIndex,
      fileMtime: item.metadata.fileMtime,
      filePath: item.metadata.filePath,
      kind: item.metadata.kind,
      pageNumber: item.metadata.pageNumber,
      updatedAt: Date.now(),
    });
    await this.saveSettings();
  }
}

class NoteReaderMobileSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  addSecretSetting(containerEl, ui, description, settingKey) {
    if (typeof SecretComponent !== 'function' || !this.app.secretStorage) {
      new Setting(containerEl).setName(ui.secret).setDesc(ui.secretUnavailable);
      return;
    }
    let component;
    new Setting(containerEl)
      .setName(ui.secret)
      .setDesc(description)
      .addComponent((element) => component = new SecretComponent(this.app, element)
        .setValue(this.plugin.settings[settingKey] || '')
        .onChange(async (value) => {
          this.plugin.settings[settingKey] = String(value || '').trim();
          await this.plugin.saveSettings();
        }));
    return component;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const ui = getUi(this.plugin.settings);
    containerEl.addClass('note-reader-mobile-settings');
    containerEl.createEl('h2', { text: ui.title });
    const languageIndex = this.plugin.settings.settingsLanguage === 'chinese' ? 2 : 1;

    new Setting(containerEl)
      .setName(ui.settingsLanguage)
      .addDropdown((dropdown) => dropdown
        .addOption('english', 'English')
        .addOption('chinese', '中文')
        .setValue(this.plugin.settings.settingsLanguage)
        .onChange(async (value) => {
          this.plugin.settings.settingsLanguage = value;
          await this.plugin.saveSettings();
          this.display();
          this.plugin.renderViews();
        }));

    const tabs = containerEl.createDiv({ cls: 'note-reader-mobile-settings-tabs' });
    tabs.setAttr('role', 'tablist');
    this.activeTab ||= 'engine';
    for (const [id, label] of [['engine', ui.engineTab], ['playback', ui.playbackTab], ['academic', ui.academicTab], ['privacy', ui.privacyTab]]) {
      const button = tabs.createEl('button', { text: label });
      button.type = 'button';
      button.setAttr('role', 'tab');
      button.setAttr('aria-selected', String(this.activeTab === id));
      button.toggleClass('is-active', this.activeTab === id);
      button.addEventListener('click', () => { this.activeTab = id; this.display(); });
    }

    if (this.activeTab === 'engine') {

    new Setting(containerEl)
      .setName(ui.engine)
      .setDesc(ui.engineDesc)
      .addDropdown((dropdown) => dropdown
        .addOption('system', ui.system)
        .addOption('azure', ui.azure)
        .addOption('openrouter', ui.openRouter)
        .addOption('mimo', ui.mimo)
        .addOption('byok', ui.byok)
        .addOption('remote-cosyvoice', ui.remote)
        .setValue(this.plugin.settings.speechEngine)
        .onChange(async (value) => {
          this.plugin.settings.speechEngine = value;
          await this.plugin.saveSettings();
          this.display();
        }));

    if (this.plugin.settings.speechEngine === 'system') {
      const voices = typeof window !== 'undefined' && window.speechSynthesis
        ? window.speechSynthesis.getVoices()
        : [];
      new Setting(containerEl)
        .setName(ui.systemVoice)
        .setDesc(ui.systemVoiceDesc)
        .addDropdown((dropdown) => {
          dropdown.addOption('', ui.deviceDefault);
          voices.forEach((voice) => dropdown.addOption(voice.voiceURI, `${voice.name} (${voice.lang})${voice.localService === true ? (languageIndex === 2 ? ' · 本地' : ' · Local') : ''}`));
          dropdown.setValue(this.plugin.settings.systemVoiceUri).onChange(async (value) => {
            this.plugin.settings.systemVoiceUri = value;
            await this.plugin.saveSettings();
          });
        });
    }

    if (this.plugin.settings.speechEngine === 'azure') {
      new Setting(containerEl)
        .setName(ui.consent)
        .setDesc(ui.azureConsentDesc)
        .addToggle((toggle) => toggle.setValue(this.plugin.settings.azureConsent).onChange(async (value) => {
          this.plugin.settings.azureConsent = value;
          await this.plugin.saveSettings();
        }));
      new Setting(containerEl)
        .setName(ui.azureCloud)
        .addDropdown((dropdown) => dropdown
          .addOption('public', ui.publicCloud)
          .addOption('china', ui.chinaCloud)
          .setValue(this.plugin.settings.azureCloud)
          .onChange(async (value) => {
            this.plugin.settings.azureCloud = value;
            await this.plugin.saveSettings();
          }));
      new Setting(containerEl)
        .setName(ui.region)
        .addText((text) => text.setValue(this.plugin.settings.azureRegion).onChange(async (value) => {
          this.plugin.settings.azureRegion = value;
          await this.plugin.saveSettings();
        }));
      new Setting(containerEl)
        .setName(ui.voice)
        .addDropdown((dropdown) => {
          MICROSOFT_VOICES.forEach((voice) => dropdown.addOption(voice[0], voice[languageIndex]));
          dropdown.setValue(this.plugin.settings.azureVoice).onChange(async (value) => {
            this.plugin.settings.azureVoice = value;
            await this.plugin.saveSettings();
          });
        });
      this.addSecretSetting(containerEl, ui, ui.azureSecretDesc, 'azureSecretName');
    }

    if (this.plugin.settings.speechEngine === 'openrouter') {
      new Setting(containerEl)
        .setName(ui.consent)
        .setDesc(ui.openRouterConsentDesc)
        .addToggle((toggle) => toggle.setValue(this.plugin.settings.openRouterConsent).onChange(async (value) => {
          this.plugin.settings.openRouterConsent = value;
          await this.plugin.saveSettings();
        }));
      new Setting(containerEl)
        .setName(ui.model)
        .addDropdown((dropdown) => {
          OPENROUTER_MODELS.forEach((model) => dropdown.addOption(model[0], model[languageIndex]));
          dropdown.setValue(this.plugin.settings.openRouterModel).onChange(async (value) => {
            this.plugin.settings.openRouterModel = value;
            this.plugin.settings.openRouterVoice = getDefaultOpenRouterVoice(value);
            await this.plugin.saveSettings();
            this.display();
          });
        });
      new Setting(containerEl)
        .setName(ui.voice)
        .addDropdown((dropdown) => {
          getOpenRouterVoices(this.plugin.settings.openRouterModel)
            .forEach((voice) => dropdown.addOption(voice[0], voice[languageIndex]));
          dropdown.setValue(this.plugin.settings.openRouterVoice).onChange(async (value) => {
            this.plugin.settings.openRouterVoice = value;
            await this.plugin.saveSettings();
          });
        });
      this.addSecretSetting(containerEl, ui, ui.openRouterSecretDesc, 'openRouterSecretName');
    }

    if (this.plugin.settings.speechEngine === 'remote-cosyvoice') {
      let remoteConsentToggle;
      let remoteSecretComponent;
      new Setting(containerEl)
        .setName(ui.consent)
        .setDesc(ui.remoteConsentDesc)
        .addToggle((toggle) => {
          remoteConsentToggle = toggle;
          toggle.setValue(this.plugin.settings.remoteConsent).onChange(async (value) => {
          this.plugin.settings.remoteConsent = value;
          await this.plugin.saveSettings();
          });
        });
      new Setting(containerEl)
        .setName(ui.endpoint)
        .setDesc(ui.endpointDesc)
        .addText((text) => text
          .setPlaceholder('https://tts.example.com/v1/audio/speech')
          .setValue(this.plugin.settings.remoteEndpoint)
          .onChange(async (value) => {
            const saved = this.plugin.updateRemoteEndpoint(value);
            remoteConsentToggle.setValue(this.plugin.settings.remoteConsent);
            remoteSecretComponent?.setValue(this.plugin.settings.remoteSecretName);
            await saved;
          }));
      new Setting(containerEl)
        .setName(ui.remoteVoice)
        .addText((text) => text.setValue(this.plugin.settings.remoteVoice).onChange(async (value) => {
          this.plugin.settings.remoteVoice = value.trim();
          await this.plugin.saveSettings();
        }));
      remoteSecretComponent = this.addSecretSetting(containerEl, ui, ui.remoteSecretDesc, 'remoteSecretName');
    }

    if (this.plugin.settings.speechEngine === 'mimo') {
      const zh = this.plugin.settings.settingsLanguage === 'chinese';
      new Setting(containerEl).setName(ui.consent)
        .setDesc(zh ? '允许发送当前分段到小米 MiMo。请核对当前服务的数据政策和费用；每段最多 200 字符。' : 'Allow sending the current chunk to Xiaomi MiMo. Review its current data policy and pricing; chunks are capped at 200 characters.')
        .addToggle((toggle) => toggle.setValue(this.plugin.settings.mimoConsent).onChange(async (value) => {
          this.plugin.settings.mimoConsent = value;
          await this.plugin.saveSettings();
        }));
      this.addSecretSetting(containerEl, ui, zh ? '选择保存 MiMo API 密钥的 Obsidian 秘密。' : 'Select the Obsidian secret containing your MiMo API key.', 'mimoSecretName');
      new Setting(containerEl).setName(ui.voice).addDropdown((dropdown) => {
        MIMO_VOICES.forEach((voice) => dropdown.addOption(voice, voice));
        dropdown.setValue(this.plugin.settings.mimoVoice).onChange(async (value) => {
          this.plugin.settings.mimoVoice = value;
          await this.plugin.saveSettings();
        });
      });
    }
    if (this.plugin.settings.speechEngine === 'byok') this.displayByok(containerEl, ui);
    }

    if (this.activeTab === 'playback') {

    new Setting(containerEl)
      .setName(ui.speed)
      .addSlider((slider) => slider
        .setLimits(0.5, 2, 0.05)
        .setValue(this.plugin.settings.speed)
        .setDynamicTooltip()
        .onChange(async (value) => {
          await this.plugin.setPlaybackSpeed(value);
        }));
    new Setting(containerEl).setName(ui.volume).addSlider((slider) => slider
      .setLimits(0, 1, 0.01).setValue(this.plugin.settings.volume).setDynamicTooltip().onChange(async (value) => {
        this.plugin.applyVolume(value);
        await this.plugin.saveSettings();
      }));
    if (this.plugin.settings.speechEngine === 'system') containerEl.createEl('p', { cls: 'setting-item-description', text: ui.systemControls });
    new Setting(containerEl).setName(ui.rapidStart).setDesc(ui.rapidStartDesc)
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.rapidStart).onChange(async (value) => {
        this.plugin.settings.rapidStart = value;
        await this.plugin.saveSettings();
      }));
    new Setting(containerEl)
      .setName(ui.chunks)
      .setDesc(ui.chunksDesc)
      .addText((text) => text.setValue(this.plugin.settings.chunkLimits).onChange(async (value) => {
        this.plugin.settings.chunkLimits = parseChunkLimits(value, ONLINE_CHUNK_LIMITS).join(',');
        await this.plugin.saveSettings();
      }));
    }
    if (this.activeTab === 'academic') {
    new Setting(containerEl)
      .setName(ui.stripMarkdown)
      .setDesc(ui.stripMarkdownDesc)
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.stripMarkdown).onChange(async (value) => {
        this.plugin.settings.stripMarkdown = value;
        await this.plugin.saveSettings();
      }));
    new Setting(containerEl)
      .setName(ui.mathLanguage)
      .addDropdown((dropdown) => dropdown
        .addOption('english', ui.english)
        .addOption('chinese', ui.chinese)
        .addOption('skip', ui.skip)
        .setValue(this.plugin.settings.mathReadingLanguage)
        .onChange(async (value) => {
          this.plugin.settings.mathReadingLanguage = value;
          await this.plugin.saveSettings();
        }));
    const options = academicOptions(this.plugin.settings);
    const zh = this.plugin.settings.settingsLanguage === 'chinese';
    const label = (en, cn) => zh ? cn : en;
    new Setting(containerEl).setName(label('Skip PDF headers and footers', '跳过 PDF 页眉页脚'))
      .setDesc(label('Locally filters repeated short edge lines and page numbers. Uncertain text and selection-only reading are preserved. Applies to the next reading session; disable if body text is omitted.', '在本地过滤页边重复短行和页码；不确定的文字和仅选中文字保留。下次朗读生效；发现正文误删时可关闭。'))
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.pdfSkipHeaders).onChange(async (value) => {
        this.plugin.settings.pdfSkipHeaders = value;
        await this.plugin.saveSettings();
      }));
    new Setting(containerEl).setName(label('PDF footnote reading', 'PDF 脚注朗读'))
      .setDesc(label('Body only by default. Uses bottom-page markers, smaller type and spacing to identify notes and first-page correspondence blocks. Uncertain text and selection-only reading are preserved. Applies next session.', '默认只读正文。结合页底标号、小字号及间距识别脚注和首页作者信息；不确定的文字及仅选中文字保留。下次朗读生效。'))
      .addDropdown((dropdown) => dropdown.addOption('body', label('Body only', '只读正文'))
        .addOption('inline', label('Original order, including footnotes', '保留原顺序（含脚注）'))
        .addOption('footnotes', label('Footnotes only', '只读脚注'))
        .setValue(this.plugin.settings.pdfFootnoteMode).onChange(async (value) => {
          this.plugin.settings.pdfFootnoteMode = normalizeFootnoteMode(value);
          await this.plugin.saveSettings();
        }));
    for (const [key, name] of [['academicMathMode', label('Formula reading', '公式朗读')], ['academicTableMode', label('Table reading', '表格朗读')]]) {
      new Setting(containerEl).setName(name)
        .setDesc(label('Applies when Strip Markdown is enabled. Smart mode skips complex formulas or long numeric tables. All mode still omits formulas that cannot be parsed safely.', '开启“移除 Markdown 格式”后生效。智能模式跳过复杂公式或较长数字表格；完整模式仍会略过无法可靠解析的公式。'))
        .addDropdown((dropdown) => dropdown.addOption('smart', label('Smart', '智能'))
          .addOption('all', label('All supported content', '全部支持的内容')).addOption('skip', label('Skip', '略过'))
          .setValue(options[key]).onChange(async (value) => {
            this.plugin.settings[key] = value;
            await this.plugin.saveSettings();
          }));
    }
    new Setting(containerEl).setName(label('Formula wording', '公式用词'))
      .addDropdown((dropdown) => dropdown.addOption('concise', 'sub / bar').addOption('verbose', label('Expanded wording', '完整术语'))
        .setValue(options.academicMathStyle).onChange(async (value) => {
          this.plugin.settings.academicMathStyle = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl).setName(label('Announce omitted content', '提示略过内容'))
      .addToggle((toggle) => toggle.setValue(options.academicSkipNotice).onChange(async (value) => {
        this.plugin.settings.academicSkipNotice = value;
        await this.plugin.saveSettings();
      }));
    }
    if (this.activeTab === 'playback') {
    new Setting(containerEl)
      .setName(ui.remember)
      .setDesc(ui.rememberDesc)
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.rememberReadingPosition).onChange(async (value) => {
        this.plugin.settings.rememberReadingPosition = value;
        await this.plugin.saveSettings();
      }));
    }
    if (this.activeTab === 'privacy') {
    new Setting(containerEl).setName(ui.privacy).setDesc(ui.privacyDesc);
    new Setting(containerEl)
      .setName(ui.feedback)
      .setDesc(ui.feedbackDesc)
      .addButton((button) => button.setButtonText(ui.openIssues).onClick(() => {
        const opened = typeof window !== 'undefined'
          && typeof window.open === 'function'
          && window.open(GITHUB_ISSUES_URL, '_blank', 'noopener,noreferrer');
        if (!opened) {
          new Notice(GITHUB_ISSUES_URL, 8000);
        }
      }));
    }
  }

  displayByok(containerEl, ui) {
    const zh = this.plugin.settings.settingsLanguage === 'chinese';
    const label = (en, cn) => zh ? cn : en;
    const settings = this.plugin.settings;
    let consentToggle;
    let secretComponent;
    const update = async (patch) => {
      this.plugin.settings.byokProfile = updateByokProfile(this.plugin.settings.byokProfile, patch);
      consentToggle?.setValue(hasByokConsent(this.plugin.settings.byokProfile));
      secretComponent?.setValue(this.plugin.settings.byokProfile.secretName);
      await this.plugin.saveSettings();
    };
    new Setting(containerEl).setName(ui.consent)
      .setDesc(label('Allow this configuration to send text and incur charges. The service may retain text or use it for training; BYOK does not guarantee ZDR. Review the provider policy before enabling. Revoking consent cannot recall sent text.', '允许此配置发送文本并产生费用。服务可能留存文本或用于训练，BYOK 不保证 ZDR；开启前请核对服务商政策。撤销授权无法收回已发送文本。'))
      .addToggle((toggle) => {
        consentToggle = toggle;
        toggle.setValue(hasByokConsent(settings.byokProfile)).onChange(async (value) => {
          const profile = this.plugin.settings.byokProfile;
          const error = value && getByokConfigurationError(profile, false);
          if (error) { toggle.setValue(false); new Notice(error); return; }
          this.plugin.settings.byokProfile = value ? grantByokConsent(profile) : { ...profile, consent: '' };
          await this.plugin.saveSettings();
        });
      });
    new Setting(containerEl).setName(label('API type', '接口类型')).addDropdown((dropdown) => {
      Object.entries(BYOK_PROVIDERS).forEach(([id, preset]) => dropdown.addOption(id, preset.name));
      dropdown.setValue(settings.byokProfile.provider).onChange(async (value) => {
        const preset = BYOK_PROVIDERS[value];
        await update({ provider: value, endpoint: preset.endpoint, model: preset.model, voice: preset.voice });
        this.display();
      });
    });
    const endpoint = new Setting(containerEl).setName(label('Speech endpoint', '语音接口地址'))
      .setDesc(label('HTTPS only, with browser CORS support. Redirects are refused. Changing the endpoint clears the selected secret and consent; no automatic fallback.', '仅支持 HTTPS，服务器须允许浏览器 CORS 请求。拒绝重定向；修改地址会清除密钥关联和授权，不自动回退。'));
    if (settings.byokProfile.provider === 'minimax') {
      endpoint.addDropdown((dropdown) => dropdown.addOption('https://api.minimax.io/v1/t2a_v2', label('International', '国际站'))
        .addOption('https://api.minimaxi.com/v1/t2a_v2', label('China', '中国站')).setValue(settings.byokProfile.endpoint)
        .onChange(async (value) => { await update({ endpoint: value }); this.display(); }));
    } else if (settings.byokProfile.provider === 'openai-compatible') {
      endpoint.addText((text) => text.setValue(settings.byokProfile.endpoint).onChange(async (value) => {
        await update({ endpoint: value });
      }));
    } else endpoint.setDesc(settings.byokProfile.endpoint);
    for (const [key, name] of [['model', ui.model], ['voice', label('Voice ID', '音色 ID')]]) {
      new Setting(containerEl).setName(name).addText((text) => text.setValue(settings.byokProfile[key]).onChange((value) => update({ [key]: value })));
    }
    if (typeof SecretComponent === 'function' && this.app.secretStorage) {
      new Setting(containerEl).setName(ui.secret).addComponent((element) => {
        secretComponent = new SecretComponent(this.app, element)
          .setValue(settings.byokProfile.secretName).onChange((value) => update({ secretName: value }));
        return secretComponent;
      });
    } else new Setting(containerEl).setName(ui.secret).setDesc(ui.secretUnavailable);
    const help = containerEl.createEl('a', { text: label('Provider API and voice documentation', '接口与音色文档') });
    help.href = BYOK_PROVIDERS[settings.byokProfile.provider].docs;
    help.setAttr('target', '_blank'); help.setAttr('rel', 'noopener noreferrer');
  }
}

module.exports = {
  default: NoteReaderMobilePlugin,
  __test: {
    GITHUB_ISSUES_URL,
    UI,
    VIEW_TYPE,
    getUi,
    getWindowSelectionContext,
    isTextInputTarget,
    NoteReaderMobileSettingTab,
  },
};
