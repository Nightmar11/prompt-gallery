const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════
//  标签配置 — 在这里修改
// ═══════════════════════════════════════
const TAGS = [
  '动漫', '游戏',  '3D', '真实', '海报'
];
// ═══════════════════════════════════════

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const IMG_DIR = path.join(DATA_DIR, 'images');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'tmp'), { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf-8');

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = async (d) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2), 'utf-8');
  await syncDBToCloudinary();
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
let upload;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'prompt-gallery', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
  });
  upload = multer({ storage: cloudStorage, limits: { fileSize: 20 * 1024 * 1024 } });
  console.log('Using Cloudinary for image storage');
} else {
  upload = multer({
    dest: path.join(DATA_DIR, 'tmp'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('只允许上传图片'));
    }
  });
}

async function syncDBToCloudinary() {
  if (!useCloudinary) return;
  try {
    await cloudinary.uploader.upload(DB_FILE, {
      resource_type: 'raw',
      public_id: 'prompt-gallery/db.json',
      overwrite: true
    });
    console.log('Synced db.json to Cloudinary');
  } catch (e) {
    console.error('Failed to sync db.json to Cloudinary:', e.message);
  }
}

async function syncDBFromCloudinary() {
  console.log('syncDBFromCloudinary called, useCloudinary:', useCloudinary);
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'NOT SET');
  if (!useCloudinary) {
    console.log('Cloudinary not configured, using local db.json');
    return;
  }
  try {
    const url = cloudinary.url('prompt-gallery/db.json', { resource_type: 'raw' });
    console.log('Fetching db.json from:', url);
    const res = await fetch(url);
    console.log('Fetch response status:', res.status);
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      console.log('Synced db.json from Cloudinary, items:', data.length);
    } else {
      console.log('Cloudinary db.json not found, using local (status:', res.status, ')');
    }
  } catch (e) {
    console.error('Failed to sync db.json from Cloudinary:', e.message);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(IMG_DIR));

// ── 标签 ──
app.get('/api/tags', (req, res) => res.json(TAGS));

// ── 列表 ──
app.get('/api/items', (req, res) => {
  const { tag, q, type } = req.query;
  let items = readDB();
  if (tag) items = items.filter(i => i.tags.includes(tag));
  if (type) items = items.filter(i => i.type === type);
  if (q) {
    const lower = q.toLowerCase();
    items = items.filter(i =>
      i.prompt.toLowerCase().includes(lower) ||
      i.tags.some(t => t.toLowerCase().includes(lower))
    );
  }
  items.sort((a, b) => b.time - a.time);
  res.json(items);
});

// ── 添加 ──
app.post('/api/items', upload.single('image'), async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: '提示词不能为空' });

  const type = req.body.type;
  if (type !== '文生图' && type !== '图生图') return res.status(400).json({ error: '请选择类型' });

  const tagsRaw = req.body.tags || '';
  const tags = tagsRaw.replace(/，/g, ',').split(',').map(s => s.trim()).filter(Boolean);

  let url = '';
  if (req.file) {
    if (useCloudinary) {
      url = req.file.path;
    } else {
      const ext = path.extname(req.file.originalname) || '.png';
      const filename = uid() + ext;
      fs.renameSync(req.file.path, path.join(IMG_DIR, filename));
      url = '/images/' + filename;
    }
  } else if (req.body.url && req.body.url.trim()) {
    url = req.body.url.trim();
  }

  const item = { id: uid(), url, prompt: prompt.trim(), type, tags, time: Date.now() };
  const db = readDB();
  db.push(item);
  await writeDB(db);
  res.json(item);
});

// ── 编辑 ──
app.put('/api/items/:id', upload.single('image'), async (req, res) => {
  const db = readDB();
  const idx = db.findIndex(d => d.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '未找到' });

  const item = db[idx];
  if (req.body.prompt) item.prompt = req.body.prompt.trim();
  if (req.body.type === '文生图' || req.body.type === '图生图') item.type = req.body.type;
  if (req.body.tags !== undefined) {
    item.tags = req.body.tags ? req.body.tags.replace(/，/g, ',').split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  if (req.file) {
    if (useCloudinary) {
      item.url = req.file.path;
    } else {
      if (item.url && item.url.startsWith('/images/')) {
        const old = path.join(IMG_DIR, path.basename(item.url));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      const ext = path.extname(req.file.originalname) || '.png';
      const filename = uid() + ext;
      fs.renameSync(req.file.path, path.join(IMG_DIR, filename));
      item.url = '/images/' + filename;
    }
  } else if (req.body.url !== undefined) {
    if (item.url && item.url.startsWith('/images/') && req.body.url !== item.url) {
      const old = path.join(IMG_DIR, path.basename(item.url));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    item.url = req.body.url.trim();
  }

  await writeDB(db);
  res.json(item);
});

// ── 删除 ──
app.delete('/api/items/:id', async (req, res) => {
  const db = readDB();
  const idx = db.findIndex(d => d.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '未找到' });

  const item = db.splice(idx, 1)[0];
  if (item.url && item.url.startsWith('/images/')) {
    const fpath = path.join(IMG_DIR, path.basename(item.url));
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }
  await writeDB(db);
  res.json({ ok: true });
});

// ── 导出（本地图片转 base64 嵌入）──
app.get('/api/export', (req, res) => {
  const db = readDB();
  const exported = db.map(item => {
    const copy = { ...item };
    if (copy.url && copy.url.startsWith('/images/')) {
      const fpath = path.join(IMG_DIR, path.basename(copy.url));
      if (fs.existsSync(fpath)) {
        const buf = fs.readFileSync(fpath);
        const ext = path.extname(fpath).toLowerCase().replace('.', '');
        const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[ext] || 'image/png';
        copy.url = `data:${mime};base64,${buf.toString('base64')}`;
      }
    }
    return copy;
  });
  res.json(exported);
});

// ── 导入（base64 还原为本地文件）──
app.post('/api/import', async (req, res) => {
  const imported = req.body;
  if (!Array.isArray(imported)) return res.status(400).json({ error: '格式错误' });

  const db = readDB();
  const ids = new Set(db.map(d => d.id));
  let count = 0;
  imported.forEach(item => {
    if (!ids.has(item.id) && item.prompt) {
      // base64 data URI → 写回本地文件
      if (item.url && item.url.startsWith('data:')) {
        const match = item.url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          const buf = Buffer.from(match[2], 'base64');
          const ext = mime.split('/')[1].replace('+', '').replace('jpeg', 'jpg');
          const filename = uid() + '.' + ext;
          fs.writeFileSync(path.join(IMG_DIR, filename), buf);
          item.url = '/images/' + filename;
        } else {
          item.url = '';
        }
      }
      db.push(item);
      count++;
    }
  });
  await writeDB(db);
  res.json({ imported: count });
});

syncDBFromCloudinary().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Prompt Gallery`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Tags: ${TAGS.join(', ')}\n`);
  });
});
