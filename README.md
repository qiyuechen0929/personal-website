![ChenQiyue 的书房：一间用 Three.js 手搓的 3D 房间](docs/screenshots/00-banner.jpg)

# ChenQiyue 的书房

**一间会呼吸的屋子 —— 你可以在浏览器里推门进去。**

[![在线体验](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%93%E9%AA%8C-chenqiyue.ccwu.cc-b8621b?style=flat-square)](https://chenqiyue.ccwu.cc/)
[![版本](https://img.shields.io/badge/release-v2.0.0-b8621b?style=flat-square)](https://github.com/qiyuechen0929/personal-website/releases/tag/v2.0.0)
[![零依赖](https://img.shields.io/badge/runtime%20deps-0-2ea44f?style=flat-square)](#工程上的讲究)
[![单文件](https://img.shields.io/badge/build-single%20html-2ea44f?style=flat-square)](#工程上的讲究)
[![30s 短片](https://img.shields.io/badge/film-30s%20%C2%B7%20120%20BPM-b8621b?style=flat-square)](#三十秒先看个片子)
[![License](https://img.shields.io/badge/license-MIT-6e6e78?style=flat-square)](LICENSE)

一个纯手搓的个人网站。**门厅是 2D 的**，推门进去是一间 **Three.js 手写的 3D 书房**，屋里每件东西都能点；首页还藏着一支 **30 秒的代码生成短片**。

没有框架、没有构建步骤、没有一张图片素材，主体是**一个 HTML 文件**。

> 🌐 **在线体验：<https://chenqiyue.ccwu.cc/>** —— 手机也能进，拖动环顾，点发光的物件。

---

## V2.0.0 更新亮点

相比 [v1.0.0](https://github.com/qiyuechen0929/personal-website/releases/tag/v1.0.0)，**v2.0.0** 对 2D 落地页与 3D 书房进行了一次从审美到交互的全面重构：

- **暖光建筑书房美学（默认白天）**：告别冷蓝紫风格，默认以**暖宣纸白天模式**迎客，支持一键切换**胡桃炭墨夜色**；叠加纯 SVG 纸张微噪点肌理，建立衬线标题 + 无衬线正文 + 等宽编号的三层编辑排版与极简拱门 Favicon。
- **画册级板块重塑**：关于区改为 `2×2` 建筑细线矩阵，作品区采用 **`3×3` Featured 跨列网格**（8 张卡片零缺口齐平），书架区改为四色书脊目录行；移除所有浮层任务表与多余元素，页面四角彻底零遮挡。
- **3D 书房电影机位导演栏**：底部新增 6 机位一键丝滑切换（`全景 / 书桌 / 书架 / 窗边 / 低机位 / 俯瞰`）与 **电影环绕漫游模式**，支持 `Q / E` 切机位、`R` 开关漫游、`0` 回全景。
- **丁达尔体积光束与工程修复**：窗户新增昼夜联动的斜射体积光束与电影暗角；修平 3D 书架层板方向，根治原版书架随机留空导致的 12% 概率 3D 初始化白屏 Bug。

---

## 目录

- [V2.0.0 更新亮点](#v200-更新亮点)
- [三十秒，先看个片子](#三十秒先看个片子)
- [这是什么](#这是什么)
- [截图](#截图)
- [屋里的小东西](#屋里的小东西)
- [房间里的物件](#房间里的物件)
- [工程上的讲究](#工程上的讲究)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [本地运行](#本地运行)
- [访客计数器](#访客计数器)
- [部署](#部署)
- [作品区的自动同步](#作品区的自动同步)
- [已知限制（说实话）](#已知限制说实话)
- [许可证](#许可证)

---

## 宣传片与短片（V2.0.0 & V1.0.0 完整保留）

### 🎬 V2.0.0 终极高燃宣传大片（36s · 1080p 60fps · 128 BPM）

![V2.0.0 宣传大片动图预览](docs/screenshots/21-v2-promo-preview.gif)

为 V2.0.0 量身打造的 **36 秒 1080p 60fps 电影级宣传片**：融合 **GLSL 丝绸流体光场 Shader**、**macOS 真实光标点击穿屏**、**14 秒真实 Three.js 3D 书房一镜到底实景运镜（实时正午→黄昏→深夜暖灯）**、**广角 3D 弧形作品穹顶**、**3D 钛金手机横竖翻转**、**RGB 光学色散脉冲** 与 **180° 快门运动模糊**，配以纯 DSP 合成的 128 BPM 高燃纯音乐。

👉 [**下载 / 观看 1080p 60fps 有声原片（`docs/media/v2.0.0-promo-60fps.mp4`）**](docs/media/v2.0.0-promo-60fps.mp4) · 🖼️ [**4×3 高清分镜总览**](docs/screenshots/21-v2-promo-storyboard.jpg) · 💻 源码见 [`reel/v4-ultimate/`](reel/v4-ultimate/)

> 制作模型：由 **gemini4 neno** 制作

---

### 🎞️ V1.0.0 原版短片《一扇门，开成一间屋子》（30s · 完整保留）

![V1.0.0 短片预览：一扇门，开成一间屋子](docs/screenshots/07-reel-preview.gif)

**V1.0.0 初代经典短片** —— 30 秒 / 120 BPM / 十个场景 / 60 fps（已完整保留在 [`vendor/reel/reel-1080.mp4`](vendor/reel/reel-1080.mp4)，早期 V1.0.0 演示视频保留在 [`docs/media/demo.mp4`](docs/media/demo.mp4)）。

> 制作模型：由 **deepseek V4.1flash** 制作

没有一个剪辑软件参与：画面是一个 HTML 文件里**逐帧算出来**的，音轨是 **Web Audio 合成**的。
一个字体、三种颜色、每拍一个动作，每一场都由上一场变形而来；首帧和末帧是同一条线，所以它能一直循环。

👉 [**在网站里看（有声音）**](https://chenqiyue.ccwu.cc/#reel) · 👉 [**在 3D 房间的电视里看**](https://chenqiyue.ccwu.cc/)（推门进去，点电视）

<details>
<summary>短片是怎么做的（点开）</summary>

- 画面：`reel/reel30.html`，单文件 1920×1080。所有样式由 `window.seek(t)` 这个**纯函数**算出来 —— 没有 CSS 动画、没有计时器、没有跨帧状态，所以任意一帧都能独立重现。
- 渲染：Playwright 驱动页面，逐帧截 **1800 张 PNG**（60 fps × 30 s），每帧再取 3 个子帧做快门运动模糊；ffmpeg 编码。
- 声音：`reel/audio30.mjs` 用 `OfflineAudioContext` 合成 —— 4/4 底鼓、侧链压缩、16 分音符 hats、A 小调贝斯线、三音动机在四个节点重现，直接写出 WAV。
- 源码都在 [`reel/`](reel/)，重渲命令见 [`reel/README.md`](reel/README.md)。

</details>

---

## 这是什么

不是一页简历式的个人主页，而是「一间屋子」：

| | |
|---|---|
| 🚪 **门厅** | 暖宣纸质感的 2D 落地页：我是谁、在折腾什么、做过什么。右边那扇拱门就是入口。 |
| 🏠 **推门进去** | 切到 3D 书房，拖动环顾、缩放、用底部导演栏一键切机位或开启自动漫游。 |
| 📺 **屋里每件东西都有故事** | 挂钟、鱼缸、吉他、电视、地球仪、纸飞机、窗台气象、桌上便利贴与抽屉手稿…… |
| 🎬 **一支短片** | 首页第一屏之下，以及 3D 房间那台电视里，都在放这 30 秒。 |
| 🌧 **藏了彩蛋** | 连点台灯三次进入「凌晨三点」雨夜模式；键盘输入 `上上下下左右左右 BA` 可玩「抓 Bug」小游戏。 |
| 📊 **真实的访客计数器** | 首页与 3D 房间里的数字是真的人在访问时才增长，不是假数据。 |

---

## 截图

| 门厅（2D · 白天默认） | 3D 房间（白天 · 体积光 + 机位栏） |
|---|---|
| ![门厅](docs/screenshots/01-hall.jpg) | ![3D 房间白天](docs/screenshots/04-room-day.jpg) |
| **3D 房间（夜色）** | **短片区块** |
| ![3D 房间夜色](docs/screenshots/03-room.jpg) | ![短片](docs/screenshots/02-reel.jpg) |

**V2.0.0 电影机位切换** —— 底部导演栏一键切到「书架正面」或「微缩俯瞰」（快捷键 `Q / E` 切机位、`R` 自动漫游）：

| 书架正面机位 | 微缩模型俯瞰机位 |
|---|---|
| ![书架机位](docs/screenshots/19-cam-shelf.jpg) | ![俯瞰机位](docs/screenshots/20-cam-iso.jpg) |

**门厅的其他角落** —— Featured 3×3 作品网格 / 四色书脊书架：

| 桌子上写着的东西 | 架子上的书 |
|---|---|
| ![作品](docs/screenshots/13-work.jpg) | ![书架](docs/screenshots/14-life.jpg) |

**桌上那叠便利贴** —— 撕一张写一句话，全站的人都能看见；桌上那张会显示最新的留言：

![便签墙](docs/screenshots/17-notes.jpg)

**抽屉** —— 拉开来是过程稿：分镜、被推翻的版本、还没走完的路：

![抽屉](docs/screenshots/18-drawer.jpg)

**还有凌晨三点** —— 连点台灯三次，屋子会下雨：

![凌晨三点的书房](docs/screenshots/16-late-night.jpg)

**移动端** —— 门厅 / 横屏 3D 房间：

| 手机竖屏门厅 | 手机横屏 3D 房间（游戏式 HUD） |
|---|---|
| ![移动端](docs/screenshots/06-mobile.jpg) | ![手机横屏的 3D 房间](docs/screenshots/15-mobile-landscape.jpg) |

---

## 屋里的小东西

镜头推到近处，每件东西都是程序化建模的 —— 没有一张贴图、没有一个模型文件。

| 挂钟：指针按北京时间走 | 地球仪：转去一座城，报距离和时差 |
|---|---|
| ![挂钟](docs/screenshots/08-clock.jpg) | ![地球仪](docs/screenshots/09-globe.jpg) |
| **鱼缸：撒一把鱼食，它们会抢** | **电脑：打开是作品清单** |
| ![鱼缸](docs/screenshots/10-tank.jpg) | ![作品面板](docs/screenshots/12-projects.jpg) |

---

## 房间里的物件

| 物件 | 交互 |
|---|---|
| 🎬 **底部机位导演栏** | 一键切换 `全景 / 书桌 / 书架 / 窗边 / 低机位 / 俯瞰` 与 `漫游` 模式（支持 `Q / E / R / 0` 快捷键） |
| 🕰 **挂钟** | 指针按**北京时间**实时走动（时区无关实现） |
| 🐟 **鱼缸** | 视角推近看鱼，还能撒一把鱼食 |
| 🎸 **吉他** | 能拨响 —— WebAudio 实时合成，没有音频文件 |
| 📺 **电视** | 点开就放那支 30 秒短片；关掉时画面**定格在屏幕上**，再点从断点继续 |
| 🌍 **地球仪** | 随机去一个城市，显示**距离 + 当地时间 + 时差** |
| ✈️ **纸飞机** | 桌上纸堆点一下，飞出一架 |
| 📝 **桌上那叠便利贴** | **便签墙**：撕一张，写一句话贴上去，全站访客都看得见；桌上那张会显示最新的留言 |
| 🗄 **抽屉** | 拉开给你看**过程稿**：分镜、被推翻的版本、还在半路的东西 |
| 🕯 **台灯** | 连点三次 → **凌晨三点**：窗外下雨、只剩显示器亮着，角落浮出一行 `3:00 AM · 睡不着` |
| 🌦 **窗台气象** | 点一下看天气 / 切雨晴 |
| 📜 **桌上手稿** | 我的博客，点开跳过去 |
| 🖥 **电脑** | 作品清单 |
| 🖼 **相框** | 关于我 |
| 🚪 **门** | 联系方式（推门有敲门声和吱呀声） |

---

## 工程上的讲究

- **零素材**：界面里没有一张图片、一个音频文件 —— 全部 CSS / SVG / Canvas / WebAudio / 程序化贴图。
  唯一的媒体是那支短片，而它也是代码生成的（成品 5 MB，**不点播放一个字节都不下载**）。
- **零依赖、零构建**：除 `vendor/three.min.js` 外没有运行时依赖，没有打包器。
  改完 `index.html` 刷新即可，部署就是传文件。
- **首屏轻**：单文件 `index.html` 经 gzip/brotli 压缩后体积轻巧（Three.js 单独本地托管）。
- **后端也是零依赖**：`server/server.mjs` 只用 Node 内置 `http` / `https` / `zlib` —— 没有 express。
  HTML/JS 走 gzip/brotli + ETag 304，**206 分段响应**（iOS 拖进度条要靠它）。
- **HTTPS 自动续期**：acme.sh 走 **DNS-01**（不需要 80 端口、不需要备案），证书自动续期并热重载。
- **可访问性与兜底**：WebGL 不可用时给提示而不是白屏；尊重 `prefers-reduced-motion`；
  每个物件都有 `aria-label`，键盘也能玩。
- **移动端**：≤760px / ≤430px 单独处理过，触摸手势、底部抽屉面板、视频 `playsinline` 不劫持全屏。
  进 3D 房间会尝试**全屏 + 锁横屏**，竖屏时视野按屏幕比例反算，横屏时顶栏收成游戏 HUD。

---

## 技术栈

| 层 | 用了什么 |
|---|---|
| 界面 | 原生 HTML + CSS（Warm Architectural Study 设计令牌 + SVG 纸感微噪点）+ 原生 JS |
| 3D | Three.js r152（本地 vendor，程序化建模 + 丁达尔体积光束 + 6 机位运镜系统） |
| 短片 | Canvas 2D 逐帧纯函数 + Playwright 截图 + ffmpeg 编码 |
| 音频 | WebAudio API 实时合成（吉他、音效、整条短片音轨） |
| 后端 | Node.js 原生 `http`/`https`，**零依赖** |
| 部署 | nginx 静态托管 + Node 计数/便签服务 + Let's Encrypt（DNS-01） |

---

## 仓库结构

```
.
├── index.html                 # 网站本体（单文件：2D 门厅 + 3D 房间 + 全部样式/逻辑）
├── vendor/
│   ├── three.min.js           # Three.js r152（本地托管）
│   └── reel/                  # 短片成品：1080p / 720p / 封面（懒加载）
├── reel/                      # 短片渲染工程（源码，可重渲）
│   ├── reel30.html            #   画面：单文件 Canvas，window.seek(t) 纯函数
│   ├── render30.mjs           #   逐帧截图 1800 张
│   ├── audio30.mjs            #   合成 30 秒音轨
│   └── README.md              #   重渲步骤与"片子语法"
├── server/
│   ├── server.mjs             # 访客计数 + 便签墙 + 静态托管 + gzip/brotli + HTTPS
│   └── README.md
├── src/                       # 早期模块化源码分片与构建脚本
├── tools/
│   ├── sync-projects.mjs      # 作品区跟着 GitHub 自动更新
│   └── sync-projects.config.json
├── docs/
│   ├── DEPLOY.md              # 部署到服务器的完整步骤
│   ├── screenshots/           # V2.0.0 全套截图
│   └── media/                 # 早期演示视频
├── .github/workflows/         # 每天自动同步作品区
├── LICENSE
└── README.md
```

---

## 本地运行

### 只看前端

```bash
npx serve .          # 或 python -m http.server 8080
```

> 直接双击 `index.html` 也能看，只是浏览器会限制一部分特性（比如剪贴板、自动播放）。
> 资源用的是**相对路径**，放在任何子路径下（例如 `https://user.github.io/repo/`）都能跑。

### 连上访客计数 & 便签墙后端

```bash
node server/server.mjs        # 默认 8790 端口，同时托管网站 + /api/hit + /api/notes

# 可选环境变量：
#   PORT=6061
#   SITE_DIR=/path/to/site
#   DATA_FILE=./data/visits.json
#   TLS_DIR=<SITE_DIR>/.certs   # 放了 fullchain.pem + privkey.pem 就自动启用 HTTPS
```

---

## 访客计数器

浏览器首次访问时生成一个随机 ID 存在 `localStorage`，之后每次带着它。
服务器**只对没见过的 ID 计数**，见过的只加次数。

| 页面显示 | 含义 | 是否去重 |
|---|---|---|
| 你是第 N 位来到这里的人 | 累计访客 | ✅ 按浏览器去重 |
| 今天来了 N 人 | 当日访客 | ✅ |
| 这间屋子被推开过 N 次 | 总访问次数 | ❌ |
| 这是你第 N 次来 | 单个访客的次数 | ❌ |

**隐私**：不存 IP、不做指纹、不接第三方统计，只有「一个随机 ID + 次数」，存在自己的服务器上。

---

## 部署

线上实例跑在一台 **1.6 GB 内存**的轻量云服务器上：nginx 托管静态文件，一个 Node 进程（systemd `personal-site.service`）负责 `/api/hit` 与 `/api/notes` 接口。

细节见 [`docs/DEPLOY.md`](docs/DEPLOY.md) 与 [`部署说明.md`](部署说明.md)。

---

## 作品区的自动同步

门厅的「作品」卡片和 3D 房间里的作品面板读的是**同一份数据** —— `index.html` 里的 `projects` 数组。这份数据可以自动跟着 GitHub 走：

```bash
cp tools/sync-projects.config.example.json tools/sync-projects.config.json
node tools/sync-projects.mjs      # 拉 GitHub 仓库 → 改写 projects 数组
```

- 手写的中文名称/简介优先保留，其余（语言、链接）从 GitHub 现取
- 可自动追加**其它有真实简介的仓库**，上限自己定（`maxTotal`）
- **幂等**（没变化不写）、写前自动备份、产物语法校验，**失败绝不覆盖**
- 仓库里配了 `.github/workflows/sync-projects.yml`：每天 04:10（北京时间）自动跑一次并提交

---

## 已知限制（说实话）

1. **计数器与便签墙需要后端**：纯静态托管（GitHub Pages / 各类 PaaS）上，计数会退化为本地存储 —— 想要真实数字就得连自己的后端。
2. **3D 需要 WebGL**：极老的设备或禁用了 WebGL 的环境下会自动降级为提示，进不了 3D 房间。
3. **短片是「烘焙」好的**：项目列表变了，片子里那八张卡片不会跟着变 —— 同步脚本会提醒你重渲。

---

## 许可证

[MIT](LICENSE) © 2026 Chen Qiyue

Three.js 版权归其作者所有（MIT）。短片使用的字体为 Noto Sans SC（SIL Open Font License）。

## 关于我

- GitHub：[@qiyuechen0929](https://github.com/qiyuechen0929)
- X：[@chenqiyueapgm](https://x.com/chenqiyueapgm)
- 博客：[060929.xyz](https://060929.xyz)

如果这间屋子让你觉得有意思，欢迎进来逛逛，或者在右上角点个 ⭐。
