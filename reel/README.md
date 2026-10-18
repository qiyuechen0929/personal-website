# 《一扇门，开成一间屋子》渲染工程

网站首页那支 30 秒短片的全部源码。没有剪辑软件参与：画面是 Canvas 逐帧算的，音轨是
Web Audio 合成的。

## 文件

| 文件 | 作用 |
|---|---|
| `reel30.html` | 画面。单文件 1920×1080，所有样式由 `window.seek(t)` 这个纯函数算出来，没有任何 CSS 动画、计时器或跨帧状态 |
| `render30.mjs` | 用 Playwright 驱动上面的页面，逐帧截 1800 张 PNG（60 fps × 30 s），再交给 ffmpeg 编码 |
| `audio30.mjs` | Web Audio `OfflineAudioContext` 合成音轨，直接写出 WAV |
| `reel.html` / `render.mjs` | 15 秒版（同一套语言，早期的版本，留作对照） |

## 重渲一遍

```bash
cd reel
npm install                      # 只有 playwright 一个依赖
npx playwright install chromium

# 1) 字体：Noto Sans SC 四个字重（OFL 协议），放到 reel/fonts/
#    Black / Bold / Medium / Regular 的 .otf，文件名见 reel30.html 里的 @font-face

# 2) 音轨
node audio30.mjs                 # → audio/soundtrack30.wav

# 3) 画面（约 4 分钟，1800 帧）
node render30.mjs full           # → frames/sub/s_00000.png …

# 4) 编码混音
ffmpeg -framerate 60 -i frames/sub/s_%05d.png -i audio/soundtrack30.wav \
  -c:v libx264 -crf 15 -preset slow -c:a aac -b:a 256k \
  -af "alimiter=limit=0.9:level=disabled,volume=-0.8dB" \
  -movflags +faststart out/final30.mp4
```

## 几个约束（片子的"语法"）

- **120 BPM，每拍一个动作**，所有关键帧落在 1/8 拍的网格上
- **只有一个字体**（Noto Sans SC），**只有三种颜色**（墨黑 / 蓝 / 纸白）+ 黑白
- **每场由上一场变形而来**：不用 crossfade、不用溶解
- **禁用**：粒子爆发、glow、lens flare、镜头抖动、RGB split、弹跳缓动、超过 0.5 秒的静止
- **首帧 = 末帧**：一条线，所以能无缝循环

`node render30.mjs sheet` 会导出 60 张逐拍缩略图，改完动作先看这个。
