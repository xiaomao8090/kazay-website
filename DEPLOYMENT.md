# Kazay官网部署指南

本文档提供了Kazay官网的部署步骤和注意事项。

## 系统要求

- Node.js 14.0.0 或更高版本
- npm 6.0.0 或更高版本
- PM2 (用于进程管理)

## 部署步骤

### 1. 准备环境变量

在项目根目录创建一个 `.env` 文件，包含以下内容：

```
# 环境设置
NODE_ENV=production

# 服务器配置
PORT=3001

# 邮箱配置 (需要使用Gmail账号)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# 验证码接收邮箱
VERIFICATION_EMAIL=xiaomao8090@gmail.com

# 安全配置
SESSION_SECRET=your-session-secret
```

请确保替换以下值：
- `EMAIL_USER`: 用于发送验证码的Gmail邮箱
- `EMAIL_PASS`: Gmail应用专用密码（不是邮箱登录密码）
- `ADMIN_PASSWORD`: 管理员登录密码（请使用强密码）
- `SESSION_SECRET`: 会话密钥（任意长字符串，用于加密会话）

### 2. 安装依赖

```bash
npm install --production
```

### 3. 启动应用

使用提供的启动脚本：

```bash
./start-production.sh
```

或者手动启动：

```bash
# 安装PM2（如果尚未安装）
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2进程列表
pm2 save
```

### 4. 配置反向代理（推荐）

为了更好的安全性和性能，建议使用Nginx或Apache作为反向代理，并配置SSL证书。

#### Nginx示例配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 维护

### 查看日志

```bash
pm2 logs kazay-website
```

### 重启应用

```bash
pm2 restart kazay-website
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 安装依赖
npm install --production

# 重启应用
pm2 restart kazay-website
```

## 安全注意事项

1. 确保 `.env` 文件的权限设置正确，只有应用程序用户可以读取
2. 定期更改管理员密码
3. 使用强密码和长会话密钥
4. 确保服务器防火墙配置正确
5. 定期更新Node.js和npm包

## Gmail邮箱配置

要使用Gmail发送验证码，需要完成以下步骤：

1. 开启Gmail账号的两步验证：
   - 访问 https://myaccount.google.com/security
   - 开启"两步验证"

2. 创建应用专用密码：
   - 访问 https://myaccount.google.com/apppasswords
   - 选择"应用"为"邮件"，设备选择"其他"并输入"Kazay Website"
   - 点击"生成"按钮
   - 将生成的16位密码复制到 `.env` 文件的 `EMAIL_PASS` 字段

## 故障排除

### 邮件发送失败

1. 检查 `.env` 文件中的邮箱配置是否正确
2. 确保Gmail账号已开启"允许不够安全的应用"或使用应用专用密码
3. 查看应用日志：`pm2 logs kazay-website`

### 应用无法启动

1. 检查Node.js版本是否符合要求
2. 确保所有依赖已正确安装
3. 检查端口3001是否被占用
4. 查看错误日志：`pm2 logs kazay-website` 