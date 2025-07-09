# Gmail邮箱设置指南

为了让系统能够成功发送验证码邮件，您需要完成以下步骤来配置您的Gmail账户和环境变量：

## 1. 开启两步验证

首先，您需要为Gmail账户开启两步验证：

1. 访问 [Google账户安全设置](https://myaccount.google.com/security)
2. 在"登录Google"部分找到"两步验证"并点击
3. 按照提示完成两步验证的设置

## 2. 创建应用专用密码

开启两步验证后，您需要创建一个应用专用密码：

1. 访问 [Google账户安全设置](https://myaccount.google.com/security)
2. 在"登录Google"部分找到"应用专用密码"并点击
3. 在"选择应用"下拉菜单中选择"其他(自定义名称)"
4. 输入一个名称，例如"Kazay网站管理系统"
5. 点击"生成"按钮
6. Google会显示一个16位的应用专用密码，请复制这个密码

## 3. 配置环境变量

现在，您需要将Gmail邮箱和应用专用密码配置到环境变量中：

### 方法一：创建.env文件（推荐）

1. 在项目根目录创建一个名为`.env`的文件
2. 在文件中添加以下内容：
   ```
   # 环境配置
   NODE_ENV=production
   
   # 邮箱配置
   EMAIL_USER=您的Gmail邮箱
   EMAIL_PASS=您的应用专用密码
   
   # 会话密钥
   SESSION_SECRET=kazay-secret-key-123456
   
   # 端口配置
   PORT=3001
   ```
3. 保存文件

### 方法二：设置系统环境变量

如果您使用PM2管理应用，可以通过以下方式设置环境变量：

1. 创建一个`ecosystem.config.js`文件：
   ```javascript
   module.exports = {
     apps: [{
       name: "kazay-website",
       script: "app.js",
       instances: "max",
       exec_mode: "cluster",
       env: {
         NODE_ENV: "production",
         EMAIL_USER: "您的Gmail邮箱",
         EMAIL_PASS: "您的应用专用密码",
         SESSION_SECRET: "kazay-secret-key-123456",
         PORT: 3001
       }
     }]
   };
   ```

2. 使用此配置文件启动应用：
   ```
   pm2 start ecosystem.config.js
   ```

## 4. 安装dotenv模块

确保项目已安装`dotenv`模块，用于读取.env文件：

```
npm install dotenv
```

## 5. 重启应用

配置完成后，重启应用以应用新的配置：

```
pm2 restart all
```

## 6. 测试发送

配置完成后，测试发送验证码功能。如果配置正确，您应该能够成功收到验证码邮件。

## 常见问题解决

1. **应用密码无效**：确保您使用的是最新生成的应用密码，而不是Gmail密码
2. **两步验证未开启**：必须先开启两步验证才能使用应用密码
3. **环境变量未生效**：检查.env文件是否在正确的位置，或者PM2环境变量是否正确设置
4. **Gmail安全设置**：检查Gmail是否有安全警报阻止了登录尝试
5. **发送频率限制**：Gmail对发送频率有限制，如果短时间内发送太多邮件可能会被临时限制

如果您按照以上步骤操作后仍然无法发送邮件，请检查系统日志以获取更详细的错误信息。 