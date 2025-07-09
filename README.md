# Kazay Studio 官方网站

Kazay Studio的官方网站，包含公司介绍、服务内容、联系方式等信息，以及一个安全的管理后台。

## 功能特点

- 响应式设计，适配各种设备
- 现代化UI界面
- 安全的管理后台，支持双重验证
- 页面管理功能
- 留言管理功能
- 网站设置功能

## 技术栈

- Node.js
- Express.js
- EJS模板引擎
- Nodemailer (邮件发送)
- Express Session (会话管理)
- PM2 (进程管理)

## 开发环境设置

### 前提条件

- Node.js (>=14.0.0)
- npm (>=6.0.0)

### 安装步骤

1. 克隆仓库

```bash
git clone <repository-url>
   cd kazay-website
   ```

2. 安装依赖

```bash
   npm install
   ```

3. 创建环境变量文件

创建一个 `.env` 文件在项目根目录，包含以下内容：

```
# 环境设置
NODE_ENV=development

# 服务器配置
PORT=3001

# 邮箱配置 (可选，开发环境会模拟发送)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 验证码接收邮箱
VERIFICATION_EMAIL=xiaomao8090@gmail.com
```

4. 启动开发服务器

```bash
   npm run dev
   ```

应用将在 http://localhost:3001 运行。

## 管理后台

管理后台提供以下功能：

- 安全登录，支持双重验证
- 网站访问统计
- 页面管理
- 留言管理
- 网站设置

### 访问管理后台

1. 访问 http://localhost:3001/admin
2. 输入用户名和密码
3. 输入发送到指定邮箱的6位验证码

## 部署指南

详细的部署步骤请参考 [DEPLOYMENT.md](DEPLOYMENT.md) 文件。

## 目录结构

```
kazay-website/
├── public/             # 静态文件
│   ├── css/            # 样式表
│   ├── js/             # 客户端脚本
│   └── images/         # 图片资源
├── utils/              # 工具函数
│   ├── authUtils.js    # 认证相关工具
│   └── sessionManager.js # 会话管理工具
├── views/              # EJS模板
│   ├── index.ejs       # 首页
│   ├── about.ejs       # 关于我们
│   ├── services.ejs    # 服务内容
│   ├── contact.ejs     # 联系我们
│   ├── admin-login.ejs # 管理员登录
│   └── ...             # 其他模板
├── app.js              # 应用入口
├── ecosystem.config.js # PM2配置
├── package.json        # 项目依赖
└── README.md           # 项目说明
```

## 安全注意事项

- 生产环境中请使用强密码
- 确保 `.env` 文件不被提交到版本控制系统
- 定期更新依赖包
- 使用HTTPS协议提供服务

## 许可证

ISC 