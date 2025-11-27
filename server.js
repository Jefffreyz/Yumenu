const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保必要目录存在
const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件！'), false);
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));
app.use('/uploads', express.static(uploadDir)); // 提供静态文件访问

// 数据文件路径
const dataFiles = {
  menu: path.join(dataDir, 'menu.json'),
  orders: path.join(dataDir, 'orders.json'),
  reviews: path.join(dataDir, 'reviews.json'),
  restaurants: path.join(dataDir, 'restaurants.json'),
  regions: path.join(dataDir, 'regions.json'),
  carts: path.join(dataDir, 'carts.json')
};

// 数据读取函数
function loadData(filePath, defaultData = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error);
  }
  return defaultData;
}

// 数据保存函数
function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`保存文件失败 ${filePath}:`, error);
    return false;
  }
}

// 初始化数据
let menuData = loadData(dataFiles.menu, {
  categories: [
    { id: 1, name: '热菜', description: '精选热菜系列' },
    { id: 2, name: '凉菜', description: '清爽凉菜系列' },
    { id: 3, name: '汤品', description: '营养汤品系列' }
  ],
  dishes: [
    {
      id: 1,
      categoryId: 1,
      name: '宫保鸡丁',
      description: '经典川菜，鸡肉嫩滑，花生香脆',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      customizations: {
        doneness: [],
        sauces: ['蒜蓉酱', '黑椒酱'],
        spiciness: ['不辣', '微辣', '中辣', '特辣'],
        extras: ['加蛋', '加蔬菜']
      }
    }
  ]
});

let orders = loadData(dataFiles.orders, []);
let reviews = loadData(dataFiles.reviews, []);
let restaurants = loadData(dataFiles.restaurants, []);
let regions = loadData(dataFiles.regions, ['南京', '杭州']);
let carts = loadData(dataFiles.carts, {});

// 保存初始数据（如果文件不存在）
if (!fs.existsSync(dataFiles.menu)) {
  saveData(dataFiles.menu, menuData);
}
if (!fs.existsSync(dataFiles.regions)) {
  saveData(dataFiles.regions, regions);
}

// API 路由

// 菜单相关
app.get('/api/menu', (req, res) => {
  res.json(menuData);
});

app.put('/api/menu', (req, res) => {
  menuData = req.body;
  const saved = saveData(dataFiles.menu, menuData);
  if (saved) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '保存菜单数据失败' });
  }
});

// 订单相关
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const order = { ...req.body, id: Date.now() };
  orders.push(order);
  const saved = saveData(dataFiles.orders, orders);
  if (saved) {
    res.json(order);
  } else {
    res.status(500).json({ error: '保存订单失败' });
  }
});

app.put('/api/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const index = orders.findIndex(order => order.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...req.body };
    const saved = saveData(dataFiles.orders, orders);
    if (saved) {
      res.json(orders[index]);
    } else {
      res.status(500).json({ error: '更新订单失败' });
    }
  } else {
    res.status(404).json({ error: '订单不存在' });
  }
});

// 评价相关
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const review = { ...req.body, id: Date.now() };
  reviews.push(review);
  const saved = saveData(dataFiles.reviews, reviews);
  if (saved) {
    res.json(review);
  } else {
    res.status(500).json({ error: '保存评价失败' });
  }
});

app.delete('/api/reviews/:id', (req, res) => {
  const reviewId = parseInt(req.params.id);
  reviews = reviews.filter(review => review.id !== reviewId);
  const saved = saveData(dataFiles.reviews, reviews);
  if (saved) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '删除评价失败' });
  }
});

// 购物车相关
app.get('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  res.json(carts[userId] || []);
});

app.put('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  carts[userId] = req.body;
  const saved = saveData(dataFiles.carts, carts);
  if (saved) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '保存购物车失败' });
  }
});

// 餐厅相关
app.get('/api/restaurants', (req, res) => {
  res.json(restaurants);
});

app.post('/api/restaurants', (req, res) => {
  const restaurant = { ...req.body, id: Date.now() };
  restaurants.push(restaurant);
  const saved = saveData(dataFiles.restaurants, restaurants);
  if (saved) {
    res.json(restaurant);
  } else {
    res.status(500).json({ error: '保存餐厅失败' });
  }
});

app.put('/api/restaurants/:id', (req, res) => {
  const restaurantId = parseInt(req.params.id);
  const index = restaurants.findIndex(r => r.id === restaurantId);
  if (index !== -1) {
    restaurants[index] = { ...restaurants[index], ...req.body };
    const saved = saveData(dataFiles.restaurants, restaurants);
    if (saved) {
      res.json(restaurants[index]);
    } else {
      res.status(500).json({ error: '更新餐厅失败' });
    }
  } else {
    res.status(404).json({ error: 'Restaurant not found' });
  }
});

app.delete('/api/restaurants/:id', (req, res) => {
  const restaurantId = parseInt(req.params.id);
  restaurants = restaurants.filter(r => r.id !== restaurantId);
  const saved = saveData(dataFiles.restaurants, restaurants);
  if (saved) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '删除餐厅失败' });
  }
});

// 图片上传相关
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      filename: req.file.filename 
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 删除图片
app.delete('/api/upload/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: '图片删除成功' });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ error: '删除图片失败' });
  }
});

// 地域相关
app.get('/api/restaurants/regions', (req, res) => {
  res.json(regions);
});

app.post('/api/restaurants/regions', (req, res) => {
  const { name } = req.body;
  if (!regions.includes(name)) {
    regions.push(name);
    const saved = saveData(dataFiles.regions, regions);
    if (saved) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: '保存地域失败' });
    }
  } else {
    res.json({ success: true });
  }
});

app.put('/api/restaurants/regions/:oldName', (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  const index = regions.indexOf(oldName);
  if (index !== -1) {
    regions[index] = newName;
    const saved = saveData(dataFiles.regions, regions);
    if (saved) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: '更新地域失败' });
    }
  } else {
    res.status(404).json({ error: '地域不存在' });
  }
});

app.delete('/api/restaurants/regions/:name', (req, res) => {
  const regionName = decodeURIComponent(req.params.name);
  regions = regions.filter(region => region !== regionName);
  const saved = saveData(dataFiles.regions, regions);
  if (saved) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '删除地域失败' });
  }
});

// 初始化和重置
app.post('/api/init', (req, res) => {
  res.json({ success: true, message: 'Data initialized' });
});

app.post('/api/reset', (req, res) => {
  orders = [];
  reviews = [];
  restaurants = [];
  carts = {};
  
  // 保存重置后的数据到文件
  const saveResults = [
    saveData(dataFiles.orders, orders),
    saveData(dataFiles.reviews, reviews),
    saveData(dataFiles.restaurants, restaurants),
    saveData(dataFiles.carts, carts)
  ];
  
  if (saveResults.every(result => result)) {
    res.json({ success: true, message: 'Data reset and saved' });
  } else {
    res.status(500).json({ error: '重置数据保存失败' });
  }
});

// 前端路由支持
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // 检查文件是否存在
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // 如果 dist 目录不存在，返回开发模式提示
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Yu Menu - 开发模式</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
          .info { color: #3498db; margin: 20px 0; }
          .code { background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">Yu Menu 系统</h1>
          <div class="info">
            <p>前端应用尚未构建，请先运行构建命令：</p>
            <div class="code">npm run build</div>
            <p>或者在开发模式下访问：</p>
            <div class="code">http://localhost:3001</div>
          </div>
          <p>当前访问的是后端服务器 (端口 3000)</p>
          <p>前端开发服务器运行在端口 3001</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📱 前端界面: http://localhost:${PORT}`);
  console.log(`🔧 API 端点: http://localhost:${PORT}/api`);
});
