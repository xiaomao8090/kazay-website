# KAZAY工作室官网

这是KAZAY工作室的官方网站项目，使用Node.js和Express框架开发，具有红黑配色和星空背景设计。

## 项目特点

- 响应式设计，适配各种设备
- 红黑主题配色
- 动态星空背景效果
- 模块化的代码结构
- 简洁现代的UI设计

## 页面结构

- 首页：展示工作室概览和特色项目
- 关于我们：介绍工作室团队、历史和使命
- 服务内容：详细展示提供的服务和价格方案
- 联系我们：提供联系表单和联系方式

## 技术栈

- Node.js
- Express.js
- EJS 模板引擎
- 原生JavaScript
- CSS3动画效果

## 安装说明

1. 克隆仓库到本地
   ```
   git clone <仓库URL>
   cd kazay-website
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 启动服务器
   ```
   npm start
   ```
   或者使用开发模式（自动重启）：
   ```
   npm run dev
   ```

4. 在浏览器中访问：`http://localhost:3000`

## 文件结构

```
kazay-website/
├── app.js                 # 应用入口文件
├── package.json           # 项目依赖
├── public/                # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   └── images/            # 图片资源
└── views/                 # EJS模板
    ├── layout.ejs         # 布局模板
    ├── index.ejs          # 首页
    ├── about.ejs          # 关于我们
    ├── services.ejs       # 服务内容
    └── contact.ejs        # 联系我们
```

## 注意事项

- 项目中的图片资源需要自行准备，包括星空背景、团队照片、项目展示图等
- 联系表单需要在app.js中添加处理逻辑才能正常工作
- 可以根据实际需求调整配色、内容和功能

## 自定义

- 主要颜色变量在`public/css/style.css`中的`:root`部分定义，可以根据需要修改
- 页面内容可以在相应的EJS文件中编辑
- 星空背景效果可以通过替换`public/images/stars1.png`等图片文件来自定义，或者使用JavaScript自动生成的效果

## 贡献

欢迎提交问题或改进建议。

## 许可

[您的许可证] 