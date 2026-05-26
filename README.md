# 须知
基于GPT 5.5 xhigh开发，本应用可以在离线环境下使用，考试信息等存储在本地

# 人工智能导论题库

基于 Electron 与 Vue 的本地桌面考试程序。每场正式考试从题库随机抽取 50 题，限时 60 分钟，每题 2 分；包含题库完成度、错题重练与考试经历统计。

## 功能

- 随机考试仅展示本场 `1-50` 题号，不暴露题库原编号。
- 支持单选、判断与多选，多选仅在答案完全一致时得分。
- 超时自动交卷，进行中的考试可在重新打开应用后继续。
- 统计已作答的唯一题目数，并以完成度百分比展示。
- 错题本保留错误次数和最近答案，重练答对后标记为已掌握。
- 历史记录保存分数、用时、交卷方式和逐题结果。
- 内置压缩题库首次启动释放到应用本地数据目录。

## 本地开发

```bash
npm install
npm run import:questions -- "/path/to/人工智能导论-习题汇总.pdf"
npm run dev
```

题库导入会生成：

```text
resources/question-bank/questions.json
resources/question-bank.zip
```

其中 `question-bank.zip` 被打包进安装程序，首次运行释放 `questions.json` 到以下目录：

- macOS：`~/Library/Application Support/人工智能导论题库/data/`
- Windows：`%APPDATA%\人工智能导论题库\data\`

## 构建安装包

```bash
npm run pack:mac
npm run pack:mac:universal
npm run pack:win
```

`pack:mac` 生成 Apple Silicon `.dmg` 安装包；`pack:mac:universal` 生成可覆盖 Intel 与 Apple Silicon 的通用 `.dmg`；`pack:win` 生成常用 Windows x64 的 NSIS `.exe` 安装包。跨平台正式签名与公证证书需要在发布环境中另行配置。
