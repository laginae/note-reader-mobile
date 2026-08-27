# Note and PDF Voice Reader Mobile

这是面向 Obsidian 手机和平板端的笔记与 PDF 朗读插件。

## 当前功能

- 朗读笔记或 PDF 中选中的文字
- 从选中位置继续朗读
- 朗读当前完整笔记或文本型 PDF
- 从仅包含短文本锚点的保存位置继续朗读
- 按坐标识别 PDF 单栏、双栏和单双栏混合排版
- 默认使用设备系统语音，插件不会向在线 TTS 服务发送文本
- 可选 Azure Speech、OpenRouter TTS 和 HTTPS 远程 CosyVoice
- 适合触控和竖屏的控制界面，可暂停、继续和跳转分段
- 在线语音严格按需合成当前分段，不提前合成后续段落

## 隐私边界

默认的设备系统语音模式不会由本插件发起 TTS 网络请求。Azure、OpenRouter 和远程 CosyVoice 都必须由用户主动开启；开启后也只发送当前分段。

API 密钥保存在 Obsidian SecretStorage 中，`data.json` 只记录秘密名称。OpenRouter 请求固定要求 ZDR，并拒绝供应商收集数据。PDF 文本提取和阅读顺序计算均在本地完成；纯扫描 PDF 需要先进行 OCR。

## 开发与测试

```bash
npm install
npm test
```

正式提交社区目录前，还必须完成 Obsidian 移动模拟、Android 真机和 iOS 真机测试。系统可能在 Obsidian 进入后台后限制音频，本插件会在页面隐藏时主动暂停。

## 相关仓库

- 共享核心：<https://github.com/laginae/note-reader-core>
- 桌面版：<https://github.com/laginae/note-reader-cosyvoice>

## 许可证

MIT
