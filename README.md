# muz-选填题库

版本：0.1.6

`muz-选填题库` 是基于 Vue、Vite 与 Tauri 的本地/网页题库应用。当前内置「人工智能导论」与「数据结构」两个科目，支持模拟考试、自由练习、本地记录保存、错题复习、应用版本检测以及独立题库热更新。

## 本次更新

- 题库内容版本更新为 `0.1.5.3`。
- 「人工智能导论」题库保留从 `v0.1.4` 历史题库恢复的 360 道题，并修正逐题题解与题干、选项不匹配的问题。
- 数据结构题库新增第七套作业中的 20 道选填例题，并补充对应题解。
- 题库文件改为按科目分隔维护：人工智能导论与数据结构分别位于独立目录，根 `manifest.json` 只负责声明科目、数量与下载地址。
- 旧题库已切换为 `ds1-` 新编号体系，避免与旧版本 `ds-` 编号冲突。
- 新增独立题库 manifest：题库更新可单独检测、下载和替换，不需要每次重新下载软件本体。
- 版本更新和题库更新弹窗都会显示更新说明；桌面端「前往更新」会调用系统浏览器打开 GitHub Releases。
- 启动后异步检查 GitHub 上的最新版本；网络异常不会阻塞题库加载和正常使用。
- 当前总题量 738 道：人工智能导论 360 道，数据结构 378 道。
- 当前数据结构题库包含 378 道题：图片例题、第七套作业例题、2019-2022 非编程题、自主命题题与专题补充题；2018 文件未包含选择/填空段。
- 数据结构范围扩展到字符串初步、结构体基础、指针基础、链表、栈、队列、树、图、排序基础、查找基础等。
- 数据结构题型为单选题、多选题与填空题，填空题支持多个等价答案。
- 数据结构练习模式下，多选题和填空题都需要点击「提交本题查看答案」后才显示结果，避免输入或选择时提前泄露答案。
- 人工智能导论与数据结构题库都要求每道题都有题解。
- 数据结构模拟考试固定抽取 10 道选择题与 10 道填空题，限时 1 小时，每题 5 分，满分 100 分。
- 数据结构现已支持自由练习、错题本和错题重练。
- 数据结构考试页加入 C 代码书写区：桌面端调用本机 `gcc` 编译运行，网页端尝试使用在线编译服务。
- 数据结构考试与练习记录会保存在本地。
- `/Users/muzermat/Documents/ds-xtlt` 中的例题截图已作为题目图片资源打包，其中第七套作业的 20 道选填已加入题库；网页端构建也会复制到 `dist/question-bank/ds-assets/`。
- 切换到数据结构时会提示：数据结构不会考原题，本应用中的题目为作业例题+自主命题，主要用于训练 ds 选填能力。

## 科目规则

### 人工智能导论

- 正式考试：随机抽取 50 道题。
- 考试时间：60 分钟。
- 分值：每题 2 分，满分 100 分。
- 题型：单选、多选、判断。
- 支持自由练习、错题本、错题重练和历史记录。
- 题库来源：从 `v0.1.4:resources/question-bank/questions.json` 恢复的历史题库。
- 当前 360 道题均包含逐题题解。

### 数据结构

- 模拟考试：随机抽取 10 道选择题与 10 道填空题。
- 考试时间：60 分钟。
- 分值：每题 5 分，满分 100 分。
- 范围：字符串初步、结构体基础、指针基础、链表、栈、队列、树、图、排序基础、查找基础。
- 支持自由练习、错题本、错题重练和历史记录。
- 题库生成后会按题干归一化查重，重复题优先保留图片例题/原始来源题，并用补题池补足去除数量。
- 选择题以单选为主，部分综合题为多选；填空题会进行去空格、大小写和常见中英文标点归一化后判分。

## 本地开发

```bash
npm install
npm run dev:web
```

桌面端开发：

```bash
npm run dev
```

重新生成数据结构题库：

```bash
npm run generate:ds
```

重新导入人工智能导论题库：

```bash
npm run import:questions -- "/path/to/人工智能导论-习题汇总.pdf"
```

## 数据与资源

题库按科目分文件维护：

```text
resources/question-bank/ai/questions.json
resources/question-bank/data-structure/questions.json
```

不要把不同科目的题目重新合并到单个源文件中维护；运行时会根据 manifest 聚合加载，维护和发布资源仍按科目分隔，便于后续继续增加新科目。

数据结构图片资源：

```text
resources/question-bank/ds-assets/
```

Tauri 桌面端首次启动会把内置题库释放到应用数据目录，并在后续启动时用随安装包更新的题库刷新本地题库文件。考试记录、错题本、进度和设置仍保存在本机数据目录中。

题库清单：

```text
resources/question-bank/manifest.json
```

清单中的 `subjects[]` 会记录每个科目的 `id`、科目级 `bankTag`、题量、题解数量、相对路径和远端下载地址；根 `releaseNotes[]` 和科目级 `releaseNotes[]` 用于题库热更新弹窗展示本次更新内容。题库热更新按科目比较 `subjects[].bankTag`，只下载发生变化的科目，再在本地聚合给考试逻辑使用。

当远端 manifest 中某个科目的 `bankTag` 高于本地同科目题库时，应用会提示单独更新这些科目；未变化的科目保留本地当前题库。桌面端会把下载后的题库按科目写入应用数据目录，网页端也会按科目写入浏览器本地存储，只在运行时为考试逻辑聚合为内存数组。

### 题库热更新发布方式

1. 修改对应科目的题库文件，例如 `resources/question-bank/ai/questions.json`。
2. 在 `resources/question-bank/manifest.json` 中提升根 `bankTag` 和该科目的 `subjects[].bankTag`，例如从 `multi-0.1.5.2-20260603` 提升到 `multi-0.1.5.3-20260603`，从 `ai-0.1.5.2-20260603` 提升到 `ai-0.1.5.3-20260603`。
3. 保持 `questionCount`、`subjects[].questionCount`、`subjects[].explanations` 与实际题库一致，并更新 `releaseNotes[]`。
4. 确认 `subjects[].questionsUrl` 和 `manifestUrl` 指向 GitHub raw 上的当前分支资源。
5. 运行 `npm run build:web` 做类型检查和静态构建；如只验证网页题库资源，可启动 `npm run dev:web` 后运行 `node scripts/smoke-web.mjs 5173`。
6. 推送到 GitHub 后，旧客户端启动时会拉取远端 manifest；发现科目级 `bankTag` 变大后，只下载变化科目的 JSON，再与本地未变化科目合并写入本地题库目录或浏览器本地存储。

网页端使用浏览器本地存储保存记录，静态构建会输出：

```text
dist/question-bank/ai/questions.json
dist/question-bank/data-structure/questions.json
dist/question-bank/manifest.json
dist/question-bank/ds-assets/
```

## 构建与发布

建议每次发布前先确认依赖完整：

```bash
npm install
```

网页构建：

```bash
npm run build:web
```

GitHub Pages 构建与预览：

```bash
npm run build:pages
npm run preview:pages
```

仓库已配置 `.github/workflows/deploy-pages.yml`，推送到 `main` 后会自动运行 `npm run build:pages` 并部署 GitHub Pages。

macOS 安装包：

```bash
npm run pack:mac
npm run pack:mac:universal
```

`pack:mac` 输出 Apple Silicon DMG；`pack:mac:universal` 输出通用 DMG。

Windows 安装包：

```bash
npm run pack:win:cross
```

macOS 本地路径含空格时，MinGW 的 `dlltool` 会拆断路径导致 Windows 交叉构建失败，所以 `pack:win:cross` 会自动复制仓库到 `/tmp/aidl-win-build` 后构建，并把 NSIS 安装包同步回 `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/`。非 Windows 主机生成的安装包默认不签名。

如果在 Windows 主机本机打包，也可以使用：

```bash
npm run pack:win
```

Android：

```bash
npm run android:init
npm run android:dev
npm run pack:android:apk:debug
npm run pack:android:apk
npm run pack:android:aab
```

Android 打包脚本会先清理 `src-tauri/gen/android/app/src/main/assets/question-bank/`，再让 Tauri 复制当前分科题库资源，避免旧版合并 `questions.json` 残留进 APK/AAB。

发布版 Android 使用本机 JDK 21 与 Android NDK 29，例如：

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/29.0.13846066"
export NDK_HOME="$ANDROID_NDK_HOME"
npm run pack:android:apk
npm run pack:android:aab
```

Debian 安装包使用 Docker 构建：

```bash
npm run pack:linux:deb
```

首次运行会创建可复用镜像 `muz-choice-blank-bank-debian-builder:bookworm`，后续会直接复用这个镜像，不再每次从临时容器里重新安装 GTK/WebKit/Rust 依赖。脚本还会复用以下 Docker volume 加速后续构建：

```text
muz-choice-blank-bank-node-modules
muz-choice-blank-bank-cargo-registry
muz-choice-blank-bank-cargo-git
```

如需强制重建 Debian 构建镜像：

```bash
docker build -f docker/Dockerfile.debian -t muz-choice-blank-bank-debian-builder:bookworm .
```

汇总安装包：

```bash
npm run release:collect
```

产物会输出到：

```text
release/0.1.6/
```

发布目录中的安装包文件名使用纯 ASCII，例如 `muz-choice-blank-bank_0.1.6_windows-x64-setup.exe`，便于上传到 GitHub Releases；应用内显示名称仍为 `muz-选填题库`。

0.1.6 的安装包构建需在 GitHub Pages 调试确认无误后进行；平台列表沿用 `release/0.1.4/` 的发布产物范围。

macOS 根目录 `/release` 可能是只读文件系统，因此本仓库默认使用项目内的 `release/<版本号>/` 作为发布目录。

## C 代码运行说明

桌面端会调用本机 `gcc`。如果运行失败，请先确认命令行中可以执行：

```bash
gcc --version
```

网页端无法直接访问本机编译器，因此会尝试请求在线编译服务。网络不可用、服务不可用或跨域策略变化时，代码书写区仍可使用，但编译运行会显示失败信息。

## 发布与更新检测

应用启动后会优先异步读取 GitHub 最新 Release：

```text
https://api.github.com/repos/y38501148-max/AI-DL/releases/latest
```

只有 Release 不是草稿/预发布、包含安装包资产，并且 Release 名称或 tag 能解析为高于当前版本的语义化版本号时，才会提示前往该 Release 更新，并展示 GitHub Release 正文中的更新说明。桌面端会通过系统浏览器打开 Releases 页面，网页端使用新标签页打开。GitHub Releases API 不可用时才降级读取 `main` 分支的 `package.json`；检测请求设置了超时并吞掉网络错误，因此不会因为 GitHub 连接失败影响离线使用。
