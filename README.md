# DevToolbox _(devtools)_

开发者工具箱 - 聚合式离线开发者工具集（Web + Windows 桌面端）

DevToolbox 提供 Web/PWA 与 Windows 桌面端，当前内置 34 个常用开发工具。核心转换和计算均在浏览器或桌面 WebView 本地完成，不依赖后端服务上传输入数据。仓库沿用 `devtools` 名称，应用和 npm 包使用 `DevToolbox`/`devtoolbox` 名称。

## 目录

- [DevToolbox _(devtools)_](#devtoolbox-devtools)
  - [目录](#目录)
  - [安全](#安全)
  - [安装](#安装)
    - [依赖](#依赖)
  - [使用](#使用)
  - [主要特性](#主要特性)
  - [工具列表](#工具列表)
    - [数据格式](#数据格式)
    - [编码解码](#编码解码)
    - [加密哈希](#加密哈希)
    - [时间编号](#时间编号)
    - [文本处理](#文本处理)
    - [转换工具](#转换工具)
    - [其他工具](#其他工具)
  - [桌面端行为](#桌面端行为)
- [开发](#开发)
- [构建](#构建)
- [项目结构](#项目结构)
  - [维护者](#维护者)
  - [参与贡献](#参与贡献)
  - [许可证](#许可证)

## 安全

- 输入内容的解析、转换、加密和生成默认在本机完成。
- 主题、收藏、设置及允许记录的历史输入保存在 `localStorage`。
- AES、RSA、bcrypt、密码、HMAC、JWT 和哈希工具不会保存输入历史。
- Markdown 预览使用 HTML 白名单清理；桌面端另外启用内容安全策略。
- 桌面端仅开放窗口控制、保存对话框和用户所选路径写入权限。

清除浏览器或 WebView 的站点数据会同时清除本地设置和历史记录。用户主动打开外部链接或在 Web 版 Markdown 中引用远程资源时，仍会遵循浏览器的正常网络行为。

## 安装

已发布版本可从 [GitHub Releases](https://github.com/Novices666/devtools/releases) 下载。也可以从源码安装依赖：

```powershell
git clone https://github.com/Novices666/devtools.git
cd devtools
npm ci
```

### 依赖

Web 开发需要：

- Node.js 22 LTS（推荐）
- npm 10 或更高版本

构建 Windows 桌面端还需要：

- Rust stable，最低版本 1.77.2
- Microsoft C++ Build Tools 与 Windows SDK
- Microsoft Edge WebView2 Runtime

## 使用

在线使用：[DevToolbox Web/PWA](https://novices666.github.io/devtools/)

启动 Web 开发服务器：

```powershell
npm run dev
```

启动 Tauri 桌面开发环境：

```powershell
npm run tauri:dev
```

进入应用后，可以通过侧边栏分类或顶部搜索选择工具。文本框支持直接输入、粘贴和按工具能力拖入文件；图片、二维码等生成结果可在 Web 版直接下载，在桌面版通过原生保存窗口选择保存路径。

## 主要特性

- Web 与 Windows 桌面端共享同一套 React 界面和核心逻辑
- 支持工具搜索、分类导航、收藏及上次使用工具记忆
- 支持明亮、暗黑和跟随系统三种主题
- 支持自动处理与手动执行两种模式
- 支持文本、图片及二进制文件的选择和拖放处理
- 支持非敏感工具的本地历史记录
- Web 版支持 PWA 缓存，生产构建首次加载后可离线使用
- 桌面端支持系统托盘、单实例运行、关闭时隐藏到托盘和原生文件保存窗口

## 工具列表

### 数据格式

| 工具 | 功能 |
| --- | --- |
| JSON 工具 | 格式化、压缩、校验、键排序、转义、JSONPath 查询和树形浏览 |
| JSON 转类型 | 根据 JSON 生成 TypeScript、Go、Java 或 Kotlin 类型定义 |
| YAML 工具 | YAML 与 JSON 双向转换及格式化 |
| XML 工具 | JSON 与 XML 双向转换，XML 格式化、压缩和校验 |
| TOML 工具 | TOML 与 JSON 双向转换，支持表、数组表和行内表 |
| CSV 工具 | CSV、JSON、Markdown 表格互转及表格预览 |
| SQL 格式化 | SQL 美化和压缩，支持 MySQL、PostgreSQL、SQLite 方言 |

### 编码解码

| 工具 | 功能 |
| --- | --- |
| Base 编解码 | Base16/32/36/58/62/64/Base64URL/ASCII85 编解码，支持 UTF-8、UTF-16、UTF-32、ISO-8859-1、ASCII 字符编码 |
| URL 编解码 | URL 编码、解码，Query String 参数解析、编辑、重组及复制为 JSON |
| URL 参数 ↔ JSON | URL 查询参数与 JSON 对象双向转换 |
| HTML 实体 | HTML 特殊字符转义与反转义 |
| Unicode 转义 | 中文与 `\uXXXX`、常用字符串转义序列互转 |
| JWT 解析 | 解析 Header、Payload、Signature，检查时间声明并校验 HS、RS、PS、ES 签名 |

Base 工具还支持图片与 Base64 Data URI 双向处理、图片预览和下载。

### 加密哈希

| 工具 | 功能 |
| --- | --- |
| 哈希计算 | MD5、SHA-1、SHA-256、SHA-384、SHA-512，支持文本和文件原始字节 |
| HMAC | 使用密钥生成多种 SHA 系列消息认证码 |
| AES 加解密 | CBC、ECB、CFB、OFB、CTR 模式，多种填充与密钥格式 |
| RSA 加解密 | 本地生成 PEM 密钥对，使用 RSA-OAEP/SHA-256 加解密 |
| bcrypt | 生成 bcrypt 哈希并校验明文与哈希 |
| 随机密码 | 使用加密安全随机数生成可配置密码和 Token |

### 时间编号

| 工具 | 功能 |
| --- | --- |
| 时间戳转换 | Unix 秒/毫秒时间戳、日期时间、时区和相对时间换算 |
| Cron 表达式 | 解析标准五字段 Cron 并预测后续执行时间 |
| ID 生成 | 批量生成 UUID v1/v4、ULID 和 4-64 位 NanoID |
| 雪花 ID 解析 | 解析时间戳、数据中心 ID、机器 ID 和序列号 |

### 文本处理

| 工具 | 功能 |
| --- | --- |
| 文本对比 | 行级、字符级和 JSON 结构化差异对比 |
| 正则测试 | 实时匹配、高亮、捕获分组和常用正则预设 |
| 文本转换 | 大小写、命名风格、行去重/排序和字符统计 |

### 转换工具

| 工具 | 功能 |
| --- | --- |
| 进制转换 | 2、8、10、16 进制实时互转，支持 BigInt 大整数 |
| 颜色转换 | HEX、RGB、HSL、HSV 互转，包含拾色器和预览 |
| 二维码 | 文本或 URL 生成二维码并下载，上传图片识别二维码 |

### 其他工具

| 工具 | 功能 |
| --- | --- |
| Markdown 预览 | 实时渲染表格、任务列表和本地语法高亮代码块 |
| Mock 数据 | 按字段生成姓名、手机号、邮箱、地址、身份证等 JSON/CSV 测试数据 |
| 图片工具 | 本地压缩、缩放及 PNG/JPG/WebP 格式转换 |
| IP 子网计算 | 根据 CIDR 计算网络地址、广播地址、掩码和可用主机范围 |
| UA 解析 | 提取浏览器、渲染引擎、操作系统和设备类型 |

## 桌面端行为

- 重复启动时唤醒已有窗口，不创建第二个实例
- 点击关闭按钮时隐藏到系统托盘
- 单击托盘图标显示并聚焦主窗口
- 托盘菜单提供“显示主窗口”和“退出”
- 图片、二维码等生成文件通过原生保存窗口选择路径
- Windows 安装包支持 NSIS 和 MSI 格式

## 开发

运行代码检查、类型检查和测试：

```powershell
npm run lint
npm run typecheck
npm test
```

监听模式运行测试：

```powershell
npm run test:watch
```

检查桌面端 Rust 代码：

```powershell
cd src-tauri
cargo check --locked
```

## 构建

构建并预览 Web/PWA：

```powershell
npm run build
npm run preview
```

Web 构建产物位于 `dist/`。

构建 Windows 桌面端：

```powershell
npm run tauri:build
```

| 产物 | 路径 |
| --- | --- |
| 单文件免安装版 | `src-tauri/target/release/devtoolbox.exe` |
| NSIS 安装包 | `src-tauri/target/release/bundle/nsis/` |
| MSI 安装包 | `src-tauri/target/release/bundle/msi/` |

单文件版本无需安装，但设置、收藏和历史记录仍由 WebView 保存在当前用户数据目录中，因此它属于免安装版，而不是将数据写入程序所在目录的完全便携模式。

## 项目结构

```text
src/
├─ components/    共享界面组件与桌面桥接组件
├─ core/          格式转换、编码、加密、解析等纯逻辑
├─ hooks/         设置、主题、历史记录和异步处理
├─ tools/         各工具页面
├─ App.tsx        应用框架、搜索、收藏和文件拖放路由
└─ registry.tsx   工具注册表与分类

src-tauri/
├─ capabilities/  桌面端权限声明
├─ icons/         桌面应用图标
├─ src/           Tauri 入口、托盘和单实例逻辑
└─ tauri.conf.json
```

主要技术栈为 React 18、TypeScript、Vite 8、Tailwind CSS、Vitest、Tauri 2 和 Rust。

## 维护者

- [Novices666](https://github.com/Novices666)

## 参与贡献

问题与功能建议请提交到 [GitHub Issues](https://github.com/Novices666/devtools/issues)。项目接受 Pull Request，提交前请：

1. 保持现有 `core`、`hooks`、`components`、`tools` 分层方式。
2. 为行为变更补充与风险相匹配的测试。
3. 运行 `npm run lint`、`npm run typecheck` 和 `npm test`。
4. 使用 `[type]: 描述` 格式编写提交信息，例如 `[fix]: 修复复制失败反馈`。

## 许可证

UNLICENSED © Novices666。当前仓库尚未声明开源许可证，未经版权所有者明确授权，不授予复制、修改或分发许可。
