const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// 内存数据存储
let menuData = {
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
};

let orders = [];
let reviews = [];
let restaurants = [];
let regions = ['南京', '杭州'];
let carts = {};

// API 路由

// 菜单相关
app.get('/api/menu', (req, res) => {
  res.json(menuData);
});

app.put('/api/menu', (req, res) => {
  menuData = req.body;
  res.json({ success: true });
});

// 订单相关
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const order = { ...req.body, id: Date.now() };
  orders.push(order);
  res.json(order);
});

// 评价相关
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const review = { ...req.body, id: Date.now() };
  reviews.push(review);
  res.json(review);
});

app.delete('/api/reviews/:id', (req, res) => {
  const reviewId = parseInt(req.params.id);
  reviews = reviews.filter(review => review.id !== reviewId);
  res.json({ success: true });
});

// 购物车相关
app.get('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  res.json(carts[userId] || []);
});

app.put('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  carts[userId] = req.body;
  res.json({ success: true });
});

// 餐厅相关
app.get('/api/restaurants', (req, res) => {
  res.json(restaurants);
});

app.post('/api/restaurants', (req, res) => {
  const restaurant = { ...req.body, id: Date.now() };
  restaurants.push(restaurant);
  res.json(restaurant);
});

app.put('/api/restaurants/:id', (req, res) => {
  const restaurantId = parseInt(req.params.id);
  const index = restaurants.findIndex(r => r.id === restaurantId);
  if (index !== -1) {
    restaurants[index] = { ...restaurants[index], ...req.body };
    res.json(restaurants[index]);
  } else {
    res.status(404).json({ error: 'Restaurant not found' });
  }
});

app.delete('/api/restaurants/:id', (req, res) => {
  const restaurantId = parseInt(req.params.id);
  restaurants = restaurants.filter(r => r.id !== restaurantId);
  res.json({ success: true });
});

// 地域相关
app.get('/api/restaurants/regions', (req, res) => {
  res.json(regions);
});

app.post('/api/restaurants/regions', (req, res) => {
  const { name } = req.body;
  if (!regions.includes(name)) {
    regions.push(name);
  }
  res.json({ success: true });
});

app.put('/api/restaurants/regions/:oldName', (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  const index = regions.indexOf(oldName);
  if (index !== -1) {
    regions[index] = newName;
  }
  res.json({ success: true });
});

app.delete('/api/restaurants/regions/:name', (req, res) => {
  const regionName = decodeURIComponent(req.params.name);
  regions = regions.filter(region => region !== regionName);
  res.json({ success: true });
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
  res.json({ success: true, message: 'Data reset' });
});

// 前端路由支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📱 前端界面: http://localhost:${PORT}`);
  console.log(`🔧 API 端点: http://localhost:${PORT}/api`);
});
