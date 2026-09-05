# 汉字闪练 / AP Chinese Flash Cards

面向 AP 中文备考学生的本地优先字卡 PWA。无需账号或服务器，学习资料、字库标签、会话和统计保存在浏览器 IndexedDB 中。

## 功能

- 产品整理的“AP 备考常用 1000 字”（不是 College Board 官方字表）
- 七个可重叠字库、随机不放回会话、未复习大轮次和可继续会话
- 点击、空格键和可选语音翻面；近似严格的浏览器语音识别与手动覆盖
- 字卡批量提取、搜索、编辑、恢复、删除和内容完整性状态
- JSON 完整备份/恢复与 CSV 内容编辑
- 可安装、可离线手动复习的响应式 PWA

## 本地运行

需要 Node.js 20.19 或更新版本。

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run validate:seed
npm run build
npm run test:e2e
```

首次运行 E2E 前安装浏览器：`npx playwright install chromium`。

## 内容与隐私

内置字表按 SUBTLEX-CH-CHR 频率数据筛选，读音和释义内容来自 CC-CEDICT；完整归属见 [NOTICE.md](NOTICE.md)。应用不会长期保存录音或识别文本。浏览器语音服务可能将音频发送给浏览器供应商。

## 发布前人工检查

- [ ] Chrome 与 Edge 的麦克风允许、拒绝、超时和识别流程
- [ ] 非 Chromium 浏览器的完整手动模式
- [ ] 安装、升级和断网冷启动
- [ ] 干净浏览器配置中的 JSON 恢复
- [ ] 键盘导航、320px 布局和减少动态效果
- [ ] 1000 张字卡的代表性人工内容抽样

## 产品文档

实现依据：

- [Product Definition Document](docs/superpowers/specs/2026-09-05-ap-chinese-flash-card-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-09-05-ap-chinese-flash-cards.md)
