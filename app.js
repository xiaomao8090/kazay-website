const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 设置视图引擎和布局
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// 首页路由
app.get('/', (req, res) => {
  res.render('index', { title: '首页' });
});

// 关于我们页面
app.get('/about', (req, res) => {
  res.render('about', { title: '关于我们' });
});

// 服务/产品页面
app.get('/services', (req, res) => {
  res.render('services', { title: '服务内容' });
});

// 联系我们页面
app.get('/contact', (req, res) => {
  res.render('contact', { title: '联系我们' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 