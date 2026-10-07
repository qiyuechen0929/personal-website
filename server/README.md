# 访客计数服务 —— 部署说明

一个文件、零依赖（只用 Node 自带的模块），同时干两件事：

1. **托管网站**（`index.html` / `vendor/` / 图片…）
2. **提供实时访客计数**：`/api/hit` `/api/count` `/health`

> 数据存在 `server/data/visits.json`，原子写盘（先写临时文件再改名），断电不会写坏。
> 没有数据库、没有 npm 依赖，内存占用约 20~30MB。

---

## 一、本机先跑起来看看

```bash
cd D:\个人网站
node server\server.mjs
# 浏览器打开 http://127.0.0.1:8790/
```

看到右下角「第 N 位访客」变成真实数字（而不是本机计数）就成功了。

## 二、接口契约

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/hit?sid=<设备标识>` | 记一次访问，返回统计（前端每次打开都调它） |
| GET | `/api/count` | 只读统计 |
| GET | `/health` | 健康检查，返回 `{"ok":true}` |

返回体：

```json
{
  "count": 128,      // 全站累计"人数"，前端显示成"你是第 128 位"
  "pv": 964,         // 总打开次数
  "todayUv": 12,     // 今天来了多少人
  "todayPv": 45,     // 今天打开多少次
  "isNew": true,     // 这次是否新设备
  "mine": 3          // 这台设备来过几次
}
```

- 允许跨域（`Access-Control-Allow-Origin: *`），所以**网站放别处、只把计数服务放服务器**也行。
- 每 IP 每分钟限 120 次，防刷。
- 自动保留最近 400 天明细、最多记住 20000 个设备（够个人站用一辈子）。

## 三、前端怎么切到真实计数

网站里的 `CONFIG.visitor.api`：

```js
visitor: {
  api: "/api/hit",   // 同域部署（server.mjs 同时托管本站）→ 保持这样就行
  localBase: 0
}
```

- 网站和计数服务**在同一个域名/端口** → 写相对路径 `"/api/hit"`（推荐）
- 网站放 GitHub Pages / Vercel，只有计数在服务器 →
  写全地址 `"https://你的域名或IP/api/hit"`
- **留空 `""`** → 前端自动降级为「本机计数」，不会白屏、不会报错

## 四、部署到云服务器（阿里云 ECS 等）

### 方式 A：直接跑（最简单）

```bash
# 把网站目录整个传上去，例如 /opt/site
cd /opt/site
PORT=6061 nohup node server/server.mjs > server.log 2>&1 &
curl http://127.0.0.1:6061/health
```

### 方式 B：systemd（开机自启 + 崩溃自动重启，推荐）

`/etc/systemd/system/site.service`：

```ini
[Unit]
Description=ChenQiyue personal site + visitor counter
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/site
Environment=PORT=6061
Environment=SITE_DIR=/opt/site
Environment=DATA_FILE=/opt/site/server/data/visits.json
ExecStart=/usr/bin/node /opt/site/server/server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now site
systemctl status site --no-pager
```

### 方式 C：Docker（不想在宿主机装 Node）

```bash
docker run -d --name mysite --restart unless-stopped \
  -p 6061:6061 \
  -e PORT=6061 \
  -v /opt/site:/site \
  -w /site \
  node:22-alpine node server/server.mjs
```

### 别忘了安全组

阿里云控制台 → 安全组 → 入方向 → 放行 **TCP 6061**（来源 `0.0.0.0/0`）。

### 想要 HTTPS

- 有域名：用 Cloudflare 免费套餐代理（橙云）或 `certbot` 签 Let's Encrypt
- 没域名：先用 IP + 端口访问；要 HTTPS 也可以用 Cloudflare Tunnel（免费、免开端口）

## 五、备份与迁移

- 只备份这一个文件即可：`server/data/visits.json`
- 换机器：把 `visits.json` 拷过去，计数不丢

## 六、注意

- 计数是**按"设备"去重**，清空浏览器存储 / 换浏览器会算作新的人（这是静态站能做到的最准的方式）
- `visits.json` 里只有随机生成的匿名编号，**不含 IP、UA 等任何个人信息**
- 公开统计：浏览器访问 `https://你的地址/api/count` 就能看到 JSON
