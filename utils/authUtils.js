const nodemailer = require('nodemailer');
require('dotenv').config();

// 创建邮件发送器
let transporter;

// 跟踪邮件发送尝试
const emailAttempts = {};

// 初始化邮件发送器 - 使用Gmail
transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'xiaomao8090@gmail.com',
    pass: process.env.EMAIL_PASS || 'rlxr wlnf qkdo pqtb'
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

// 生成6位数字验证码
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 检查邮件发送频率
const checkEmailThrottle = (ip) => {
  const now = Date.now();
  const recentWindow = 10 * 60 * 1000; // 10分钟窗口期
  
  if (!emailAttempts[ip]) {
    emailAttempts[ip] = {
      attempts: [],
      blocked: false,
      blockUntil: 0
    };
  }
  
  // 清理旧的尝试记录
  emailAttempts[ip].attempts = emailAttempts[ip].attempts.filter(
    timestamp => now - timestamp < recentWindow
  );
  
  // 检查是否被阻止
  if (emailAttempts[ip].blocked && now < emailAttempts[ip].blockUntil) {
    return {
      allowed: false,
      remainingTime: Math.ceil((emailAttempts[ip].blockUntil - now) / 1000 / 60) // 剩余分钟
    };
  }
  
  // 如果之前被阻止但现在已过期，重置阻止状态
  if (emailAttempts[ip].blocked && now >= emailAttempts[ip].blockUntil) {
    emailAttempts[ip].blocked = false;
  }
  
  // 添加当前尝试
  emailAttempts[ip].attempts.push(now);
  
  // 检查尝试次数
  if (emailAttempts[ip].attempts.length > 5) { // 10分钟内超过5次
    // 设置阻止时间为30分钟
    emailAttempts[ip].blocked = true;
    emailAttempts[ip].blockUntil = now + 30 * 60 * 1000; // 30分钟
    
    return {
      allowed: false,
      remainingTime: 30 // 30分钟
    };
  }
  
  return { allowed: true };
};

// 定期清理邮件尝试记录
setInterval(() => {
  const now = Date.now();
  Object.keys(emailAttempts).forEach(ip => {
    // 清理过期的阻止
    if (emailAttempts[ip].blocked && now > emailAttempts[ip].blockUntil) {
      emailAttempts[ip].blocked = false;
    }
    
    // 清理超过24小时的记录
    if (emailAttempts[ip].attempts.length === 0 && !emailAttempts[ip].blocked) {
      delete emailAttempts[ip];
    }
  });
}, 60 * 60 * 1000); // 每小时清理一次

// 发送验证码邮件
const sendVerificationCode = async (email, code, ip = 'unknown') => {
  try {
    // 检查发送频率
    const throttleCheck = checkEmailThrottle(ip);
    if (!throttleCheck.allowed) {
      console.warn(`邮件发送被阻止: IP=${ip}, 剩余时间=${throttleCheck.remainingTime}分钟`);
      return {
        success: false,
        message: `发送频率过高，请在${throttleCheck.remainingTime}分钟后再试`
      };
    }
    
    const mailOptions = {
      from: 'xiaomao8090@gmail.com', // 请替换为您的QQ邮箱
      to: email,
      subject: 'Kazay管理后台登录验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #3498db; text-align: center;">Kazay管理后台登录验证</h2>
          <p style="font-size: 16px; line-height: 1.5;">您好，</p>
          <p style="font-size: 16px; line-height: 1.5;">您正在尝试登录Kazay管理后台。您的验证码是：</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background-color: #f8f9fa; border-radius: 5px;">${code}</span>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">该验证码将在10分钟后失效。如果这不是您的操作，请忽略此邮件。</p>
          <p style="font-size: 16px; line-height: 1.5;">谢谢！</p>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p>此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      `
    };

    // 打印验证码到控制台（方便调试）
    console.log('==============================================');
    console.log('正在发送验证码');
    console.log('验证码:', code);
    console.log('发送至:', email);
    console.log('==============================================');

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log('验证码邮件已发送: %s', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('发送验证码邮件失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    
    return { 
      success: false,
      message: '发送验证码邮件失败: ' + error.message
    };
  }
};

// 验证邮箱配置
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    return {
      success: true,
      message: '邮箱配置正确'
    };
  } catch (error) {
    return {
      success: false,
      message: `邮箱配置错误: ${error.message}`
    };
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  verifyEmailConfig
}; 