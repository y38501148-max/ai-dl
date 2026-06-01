# muz-选填题库

版本：0.1.4

`muz-选填题库` 是基于 Vue、Vite 与 Tauri 的本地/网页题库应用。当前内置「人工智能导论」与「数据结构」两个科目，支持模拟考试、自由练习、本地记录保存、错题复习以及异步版本更新检测。

## 本次更新

- 应用名称调整为 `muz-选填题库`，版本号更新为 `0.1.4`。
- 启动后异步检查 GitHub 上的最新版本；网络异常不会阻塞题库加载和正常使用。
- 左上角新增「科目选择」，不同科目拥有独立的题型、组卷规则、成绩记录和首页统计。
- 新增「数据结构」科目，覆盖栈、队列、树、图四类知识点。
- 数据结构题型为单选题与填空题，填空题支持多个等价答案。
- 数据结构练习模式下，多选题和填空题都需要点击「提交本题查看答案」后才显示结果，避免输入或选择时提前泄露答案。
- 人工智能导论题库不提供题解；数据结构题库已逐题重写思路题解，去除重复题，并校正邻接表、环图生成树和后缀表达式等题目的答案/题干。
- 数据结构模拟考试固定抽取 10 道选择题与 10 道填空题，限时 1 小时，每题 5 分，满分 100 分。
- 数据结构现已支持自由练习、错题本和错题重练。
- 数据结构考试页加入 C 代码书写区：桌面端调用本机 `gcc` 编译运行，网页端尝试使用在线编译服务。
- 数据结构考试与练习记录会保存在本地。
- `/Users/muzermat/Documents/ds-xtlt` 中的例题截图已作为题目图片资源打包，网页端构建也会复制到 `dist/question-bank/ds-assets/`。
- 切换到数据结构时会提示：数据结构不会考原题，本应用中的题目为作业例题+自主命题，主要用于训练 ds 选填能力。

## 科目规则

### 人工智能导论

- 正式考试：随机抽取 50 道题。
- 考试时间：60 分钟。
- 分值：每题 2 分，满分 100 分。
- 题型：单选、多选、判断。
- 支持自由练习、错题本、错题重练和历史记录。

### 数据结构

- 模拟考试：随机抽取 10 道选择题与 10 道填空题。
- 考试时间：60 分钟。
- 分值：每题 5 分，满分 100 分。
- 范围：栈、队列、树、图。
- 支持自由练习、错题本、错题重练和历史记录。
- 选择题均为单选；填空题会进行去空格、大小写和常见中英文标点归一化后判分。

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

人工智能导论题库仍可通过旧导入脚本生成：

```bash
npm run import:questions -- "/path/to/人工智能导论-习题汇总.pdf"
```

## 数据与资源

题库主文件：

```text
resources/question-bank/questions.json
```

数据结构图片资源：

```text
resources/question-bank/ds-assets/
```

Tauri 桌面端首次启动会把内置题库释放到应用数据目录，并在后续启动时用随安装包更新的题库刷新本地题库文件。考试记录、错题本、进度和设置仍保存在本机数据目录中。

网页端使用浏览器本地存储保存记录，静态构建会输出：

```text
dist/question-bank/questions.json
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
release/0.1.4/
```

macOS 根目录 `/release` 可能是只读文件系统，因此本仓库默认使用项目内的 `release/<版本号>/` 作为发布目录。

## C 代码运行说明

桌面端会调用本机 `gcc`。如果运行失败，请先确认命令行中可以执行：

```bash
gcc --version
```

网页端无法直接访问本机编译器，因此会尝试请求在线编译服务。网络不可用、服务不可用或跨域策略变化时，代码书写区仍可使用，但编译运行会显示失败信息。

## 发布与更新检测

应用启动后会异步读取：

```text
https://raw.githubusercontent.com/y38501148-max/AI-DL/main/package.json
```

如果远端版本号高于当前版本，会提示前往 GitHub Releases 更新。检测请求设置了超时并吞掉网络错误，因此不会因为 GitHub 连接失败影响离线使用。
