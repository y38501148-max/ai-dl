# 须知
基于GPT 5.5 xhigh开发，本应用可以在离线环境下使用，考试信息等存储在本地

# 人工智能导论题库

基于 Tauri 与 Vue 的本地桌面及 Android 考试程序。每场正式考试从题库随机抽取 50 题，限时 60 分钟，每题 2 分；包含题库完成度、自由练习、错题重练与考试经历统计。

## 功能

- 随机考试仅展示本场 `1-50` 题号，不暴露题库原编号。
- 练习模式可从 360 道题中自由选择，题库默认按每 60 题分为一组，支持全选、单组选题与单题勾选。
- 支持单选、判断与多选，多选仅在答案完全一致时得分。
- 超时自动交卷，进行中的考试可在重新打开应用后继续。
- 统计已作答的唯一题目数，并以完成度百分比展示。
- 错题本保留错误次数和最近答案，重练答对后标记为已掌握。
- 历史记录保存分数、用时、交卷方式和逐题结果。
- 内置题库首次启动释放到应用本地数据目录。

## 本地开发

```bash
npm install
npm run import:questions -- "/path/to/人工智能导论-习题汇总.pdf"
npm run dev
```

题库导入会生成：

```text
resources/question-bank/questions.json
```

Tauri 应用会内置 `resources/question-bank/questions.json`，首次运行释放到以下目录：

- macOS：`~/Library/Application Support/人工智能导论题库/data/`
- Windows：`%APPDATA%\人工智能导论题库\data\`
- Android：应用私有数据目录中的 `data/`

## 构建安装包

```bash
npm run pack:mac
npm run pack:win
```

`pack:mac` 生成 `.dmg` 安装包；`pack:win` 生成 NSIS `.exe` 安装包。跨平台正式签名与公证证书需要在发布环境中另行配置。

## Android 构建

安装 Android SDK、NDK 与 Rust Android targets，并配置 `ANDROID_HOME`、`NDK_HOME`、`JAVA_HOME` 后执行：

```bash
npm run android:init
npm run android:dev
npm run pack:android:apk:debug
npm run pack:android:apk
npm run pack:android:aab
```

`pack:android:apk:debug` 生成自动使用兼容调试签名、可供设备安装测试的 APK。`pack:android:apk` 和
`pack:android:aab` 生成正式发布产物，使用前需要配置 Android 发布签名。
