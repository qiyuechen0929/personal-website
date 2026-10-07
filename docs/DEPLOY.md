# 部署说明：个人网站 + 访客计数

## 需要什么
- 网站本体：`index.html` + `vendor/three.min.js`（单文件站、零构建、零依赖）
- 访客计数：`server/server.mjs`（只用 Node 内置模块，内存约 25~30MB）
- 计数数据：`server/data/visits.json`（原子落盘，**只备份这一个文件**即可迁移）

## 本地跑一遍
```bash
cd <本目录>
node server/server.mjs          # 默认 8790 端口，同时托管网站 + /api/hit
# 打开 http://127.0.0.1:8790/
```

---

## 路线 A：GitHub Pages（最快拿到「域名 + HTTPS」，免备案）
1. 新建 public 仓库，例如 `personal-site`
2. 把本目录的 `index.html`、`vendor/`、`server/` 推上去
3. 仓库 `Settings → Pages → Source: main / (root)` 保存
4. 等 1 分钟，得到 `https://qiyuechen0929.github.io/personal-site/`
5. 绑自己的域名：`Settings → Pages → Custom domain` 填域名 → 域名 DNS 加一条
   `CNAME  <你的子域>  →  qiyuechen0929.github.io`（HTTPS 证书 GitHub 自动签，**不用备案**）

⚠️ 代价：Pages 没有后端，`CONFIG.visitor.api` 请求会失败 → 自动降级为**本机计数**。
   想保留全站真实计数，把 api 指到下面 B/C 里那台服务器的 `/api/hit`。

## 路线 B：你自己的阿里云 ECS（120.24.49.174）
现状：Studio 容器只发布了 **6060**，所以新端口要么重建容器、要么另起一个容器。

**B1（推荐，完全不碰 Studio）—— 宿主机上单独起一个站点容器：**
```bash
# 1) 把本站目录传到宿主机，例如 /opt/site（里面要有 index.html、vendor/、server/）
# 2) 起服务（端口 6061，内存约 30MB）
docker run -d --name mysite --restart unless-stopped \
  -p 6061:6061 -e PORT=6061 -v /opt/site:/site -w /site \
  node:22-alpine node server/server.mjs
# 3) 阿里云控制台 → 安全组 → 入方向放行 TCP 6061（来源 0.0.0.0/0）
```
→ 访问：`http://120.24.49.174:6061`

**B2 —— 给现有 Studio 容器补一个端口（会重启 Studio，数据卷不丢）：**
把原来的 `docker run` 命令重跑一次，末尾加上 `-p 6061:6061`，然后容器里跑站点服务。
（能省一个容器，但 Studio 会重启，且资源更挤——1.6G 内存里 Studio 已占近 1G）

## 路线 C：香港/海外小服务器（彻底免备案）
做法同 B1，只是换服务器；域名直接解析 + `certbot` 签 HTTPS 即可。

---

## 域名那一步的关键政策（国内服务器）
| 方案 | 是否需要备案 | 地址长什么样 |
| --- | --- | --- |
| 域名 + 80/443 | **必须 ICP 备案**（1~3 周，需备案服务号，一台 ECS 给 5 个） | `https://你的域名/` |
| 域名 + 非标端口 | 不需要备案 | `http://你的域名:6061` |
| 直接用 IP | 不需要备案 | `http://120.24.49.174:6061` |
| Let's Encrypt 证书 | 用 **DNS 校验**可免 80 端口，免备案也能上 HTTPS | `https://你的域名:6061` |
| 海外/香港节点 | 不需要备案 | `https://你的域名/` |

## 上线后要改的一处
`index.html` 里 `CONFIG.visitor.api`：
- 站点和计数服务**同域**（B1 那种一起跑）→ 保持 `"/api/hit"`
- 站点在 GitHub Pages、计数在服务器 → 改成 `"http://120.24.49.174:6061/api/hit"`（服务端已开 CORS `*`，可直接跨域）

## 备份
`server/data/visits.json` —— 换机器时带过去，计数不丢。
