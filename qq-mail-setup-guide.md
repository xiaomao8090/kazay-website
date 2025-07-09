# QQ邮箱设置指南

为了让系统能够成功发送验证码邮件，您需要完成以下步骤来配置您的QQ邮箱：

## 1. 开启POP3/SMTP服务

1. 登录您的QQ邮箱 (https://mail.qq.com)
2. 点击"设置" > "账户"
3. 在"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"部分，开启"POP3/SMTP服务"
4. 系统会要求您验证身份，可以通过手机验证或密保验证
5. 验证完成后，系统会生成一个"授权码"，这个授权码就是您需要在应用中使用的密码

## 2. 获取授权码

1. 如果您刚刚开启服务，授权码会直接显示在页面上
2. 如果您需要重新获取授权码，可以在"POP3/SMTP服务"部分点击"生成授权码"
3. 系统会再次要求您验证身份
4. 验证完成后，新的授权码会显示在页面上

## 3. 配置系统

现在，您需要将QQ邮箱和授权码配置到系统中：

1. 打开`utils/authUtils.js`文件
2. 找到以下代码段：
   ```javascript
   transporter = nodemailer.createTransport({
     host: 'smtp.qq.com',
     port: 465,
     secure: true,
     auth: {
       user: 'your-qq-email@qq.com', // 请替换为您的QQ邮箱
       pass: 'your-qq-email-auth-code' // 请替换为您的QQ邮箱授权码
     }
   });
   ```
3. 将`your-qq-email@qq.com`替换为您的QQ邮箱地址
4. 将`your-qq-email-auth-code`替换为您刚才获取的授权码

4. 同样，在`app.js`文件中找到类似的配置并进行相同的替换

## 4. 发件人地址设置

在系统中，还需要修改发件人地址：

1. 在`utils/authUtils.js`文件中，找到：
   ```javascript
   const mailOptions = {
     from: 'your-qq-email@qq.com', // 请替换为您的QQ邮箱
     to: email,
     ...
   ```

2. 在`app.js`文件中，找到所有包含`from:`的地方，确保都使用相同的QQ邮箱地址

## 5. 测试发送

配置完成后，重启系统并测试发送验证码功能。如果配置正确，您应该能够成功收到验证码邮件。

## 常见问题解决

1. **授权码无效**：确保您使用的是最新生成的授权码，而不是QQ密码
2. **连接超时**：检查服务器网络是否能够连接到smtp.qq.com
3. **发送频率限制**：QQ邮箱对发送频率有限制，如果短时间内发送太多邮件可能会被临时限制
4. **邮件进入垃圾箱**：检查收件人的垃圾邮件文件夹，并将系统邮箱添加到联系人列表

如果您按照以上步骤操作后仍然无法发送邮件，请检查系统日志以获取更详细的错误信息。 