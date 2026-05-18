# Prompt Gallery

本地图片与提示词管理工具。

## 快速开始

```bash
# 1. 安装依赖（仅首次）
npm install

# 2. 启动
npm start
```

然后浏览器打开 http://localhost:3001

## 修改端口

编辑 `server.js` 第 9 行：

```js
const PORT = process.env.PORT || 3001;  // 改成你想要的端口
```

或启动时临时指定：

```bash
set PORT=8080 && npm start
```

## 修改标签

编辑 `server.js` 第 13-17 行的 `TAGS` 数组：

```js
const TAGS = [
  '头像', '风景', '动漫', '插画', '摄影',
  '图标', '海报', '壁纸', 'LOGO', '表情包',
  '人物', '动物', '建筑', '美食', '抽象',
];
```

增删改都行，改完重启生效。

## 功能

- 上传图片或填图片 URL，也可以只存提示词不带图
- 每张图必须选类型：文生图 / 图生图
- 一键复制提示词
- 按类型、标签筛选，支持搜索
- 编辑 / 删除（自动清理图片文件）
- 导出导入（JSON 格式，图片自动打包，换电脑不丢图）

## 数据备份

`data/` 目录包含所有图片和元数据，备份整个文件夹即可。
页面内也支持导出/导入功能。

## 项目结构

```
prompt-gallery/
├── server.js        # 后端
├── package.json     # 依赖配置
├── public/
│   └── index.html   # 前端页面
└── data/
    ├── db.json       # 元数据（自动生成）
    └── images/       # 上传的图片
```
