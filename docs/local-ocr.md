# 本机 OCR（实验性） / Local OCR (Experimental)

**默认关闭、独立资源包、单页识别、实验性标记。** 尚未完成 iPhone、iPad、Android 真机验收，请先用非敏感的清晰印刷样例测试。

## 安装与使用

1. 从 [0.5.0 发布附件](https://github.com/laginae/note-reader-mobile/releases/tag/0.5.0)下载 `cozy-mobile-ocr-resources.zip`，将解压后的 `ocr-assets` 整个目录放到库内 `.obsidian/plugins/note-reader-mobile/ocr-assets/`，不要只复制 manifest。资源包包含约 10 MB 的识别程序和中英文模型，以及许可证，压缩下载约 6.2 MB。普通 Obsidian 插件更新不会自动安装这个额外目录。
2. 在 **学术阅读 → 本机 OCR（实验性）** 中开启。若提示资源包缺失、损坏或版本不匹配，请安装配套包；插件不会跳过哈希校验，也不会自动联网下载代码或模型。
3. 打开 PDF 或 PNG/JPEG/WebP 图片，在命令面板运行 **Recognize PDF or image text (experimental OCR)**；文件菜单也提供入口。打开图片时，“朗读当前文件”会进入识别窗口。
4. 选择一个页码，必要时旋转，点击“识别本页”。只处理这一个页面，不会批量扫描整本 PDF。
5. 校对预览文字，尤其是数字、变量和公式，再点“朗读结果”或“朗读选中文字”。使用当前音色和现有在线处理授权。关闭窗口会清除 OCR 预览；已开始的朗读使用正常播放器停止。

## 性能与隐私

- Tesseract.js 7.0.0，中英文模型，只在点击识别时读取资源包并创建单个工作进程。最多 150 万识别像素，PDF 最大 30 MB，图片最大 12 MB / 1600 万像素，最多 10 万字符；动态图只处理第一帧。
- 识别结束、取消、关闭、关闭功能或卸载插件时释放工作进程；切到后台取消识别，不在锁屏状态持续 OCR。每个识别调用超时两分钟，整次任务超时三分钟。
- 即使资源包只有约 10 MB，解压模型和推理仍可能占用数百 MB 内存。低内存设备可能失败或被系统终止。单页与像素上限不是不会崩溃的保证。
- 图片和 PDF 不上传，识别结果不写设置、日志或磁盘 OCR 缓存，原件不变。在线音色仍会发送您选择朗读的识别文字，且生成的音频遵循原有缓存设置。
- 暂不支持扫描原图高亮、OCR 大纲、隐藏文字层或数学含义识别。正文、数字、公式、手写、表格和复杂分栏可能识别错误，不能视为论文公式转写工具。

## 真机建议测试

使用公开样例，不提供密钥或私人论文：

- [ ] 关闭 OCR 时启动插件，确认普通笔记朗读正常、没有资源包读取或识别等待。
- [ ] 未安装资源包时开启 OCR，确认提示缺失，普通朗读仍可用。
- [ ] 安装配套包后识别一张清晰英文图片、一张中文图片；校对并分别朗读全文/选区。
- [ ] 扫描 PDF 指定第 2 页，确认只显示该页结果；试用 90/180 度旋转。
- [ ] 识别中取消、关闭窗口、切后台，再返回，确认不会自动继续或重复播放。
- [ ] 连续识别三次，观察是否发热、卡顿、崩溃；记录设备型号、系统/Obsidian 版本和文件像素尺寸。
- [ ] 横屏/竖屏、iPad 分屏检查按钮可滚动到、关闭按钮可用，文本选择不被底部工具条遮挡。
- [ ] 断网且资源包已安装时，只做 OCR；确认能识别。系统音色是否离线由设备音色决定，不要把在线 TTS 的网络请求误认为 OCR 上传。

## English Summary

Disabled by default; separate local resource pack; one selected page only; experimental. Install the matching `ocr-assets` folder under this plugin's directory, enable Local OCR in Academic reading, then run the OCR command on a PDF or PNG/JPEG/WebP. Review and edit the result before reading. Assets are hash-verified and never downloaded automatically. Images remain local; online voices still transmit selected recognized text. Backgrounding cancels recognition. Recognition can use hundreds of MB while active despite the small download. No physical iPhone/iPad/Android acceptance is claimed. Source-image highlighting, OCR outlines and searchable-PDF creation are not included.

Developers: `npm run build` generates both `main.js` and the independent `dist/ocr-assets/` package from pinned dependencies. Distribute the complete resource directory, licenses and manifest separately. Never embed the resource JSON into `main.js`.
