# Prompt Gallery

图片与提示词管理工具，支持在线部署。

## 在线访问

**https://prompt-gallery-cvib.onrender.com/**

## 两层架构

```
浏览器 (前端)              服务器 (后端)
┌──────────────────┐      ┌──────────────────┐
│ public/index.html │◄────►│ server.js        │
│  HTML + CSS + JS  │ API  │  Express.js      │
│  fetch('/api/...')│      │  REST API        │
└──────────────────┘      │  ↕              │
                          │  data/db.json    │
                          │  data/images/    │
                          │  ↕              │
                          │  Cloudinary      │
                          └──────────────────┘
```

| 层 | 技术 | 职责 |
|---|------|------|
| 前端 | 纯 HTML/CSS/JS，无框架 | 渲染页面、调用 API |
| 后端 | Express.js | 处理请求、读写文件、同步 Cloudinary |

## 快速开始

```bash
# 1. 安装依赖（仅首次）
npm install

# 2. 启动
npm start
```

然后浏览器打开 http://localhost:3001

本地开发无需配置 Cloudinary，自动使用本地存储。

## 功能

- 上传图片或填图片 URL，也可以只存提示词不带图
- 每张图必须选类型：文生图 / 图生图
- 一键复制提示词
- 按类型、标签筛选，支持搜索
- 编辑 / 删除（自动清理图片文件）
- 导出导入（JSON 格式，图片自动打包，换电脑不丢图）

## 修改端口

编辑 `server.js` 第 9 行：

```js
const PORT = process.env.PORT || 3001;
```

或启动时临时指定：

```bash
set PORT=8080 && npm start
```

## 修改标签

编辑 `server.js` 第 13-17 行的 `TAGS` 数组：

```js
const TAGS = [
  '动漫', '游戏', '3D', '真实', '海报'
];
```

增删改都行，改完重启生效。

## 项目结构

```
prompt-gallery/
├── server.js           # 后端
├── package.json        # 依赖配置
├── render.yaml         # Render 部署配置
├── Dockerfile          # Docker 配置（可选）
├── public/
│   └── index.html      # 前端页面
└── data/
    ├── db.json          # 元数据（自动生成）
    ├── images/          # 本地图片（本地开发用）
    └── tmp/             # 临时上传目录
```

## 部署到 Render（免费）

### 1. 推送代码到 GitHub

```bash
git add -A
git commit -m "deploy"
git push
```

### 2. 注册 Cloudinary（免费）

1. 打开 https://cloudinary.com 注册
2. 进入 Dashboard → API Keys
3. 记下三个值：Cloud name、API Key、API Secret

### 3. 在 Render 配置环境变量

进入你的服务 → Environment → 添加三个变量：

| Key | Value |
|-----|-------|
| `CLOUDINARY_CLOUD_NAME` | 你的 Cloud name |
| `CLOUDINARY_API_KEY` | 你的 API Key |
| `CLOUDINARY_API_SECRET` | 你的 API Secret |

### 4. 手动部署

进入服务 → Manual Deploy → Clear build cache & deploy

### 5. 验证

打开网站，添加一张图片，等容器休眠后再访问，数据还在就说明配置成功。

## 云存储说明

| 数据 | 存储位置 | 费用 |
|------|---------|------|
| 图片 | Cloudinary | 免费（25GB） |
| 提示词/标签 | Cloudinary raw 文件 | 免费（25GB） |
| 本地开发 | data/ 目录 | 免费 |

- 容器启动时自动从 Cloudinary 下载 db.json
- 每次添加/编辑/删除时同步上传到 Cloudinary
- 容器重启后数据不丢失

## 本地使用

无需注册任何服务，解压即用：

```bash
# 安装依赖
npm install

# 启动
npm start
```

数据存储在 `data/` 目录，备份该文件夹即可。
