const logger = require('../utils/logManager');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const nodemailer = require('nodemailer');
const archiver = require('archiver');

// 加载设置
let siteSettings = {
  // 基本设置
  siteName: 'Kazay Studio',
  siteDescription: '专业网站开发与设计服务',
  contactEmail: 'contact@example.com',
  contactPhone: '',
  
  // 安全设置
  enableSecurityCheck: true,
  enableLoginNotification: false,
  maxLoginAttempts: 5,
  sessionTimeout: 30,
  
  // 日志设置
  enableNormalLog: true,
  enableAdvancedLog: true,
  logLevel: 'info',
  logRetention: 30,
  enableLogRotation: true,
  logFormat: 'detailed',
  
  // 邮件设置
  smtpServer: '',
  smtpPort: 465,
  smtpUser: '',
  smtpPassword: '',
  smtpSecure: true
};

// 尝试从文件加载设置
try {
  const settingsPath = path.join(__dirname, '../data/settings.json');
  if (fs.existsSync(settingsPath)) {
    const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    siteSettings = { ...siteSettings, ...savedSettings };
  }
} catch (error) {
  console.error('加载设置失败:', error);
  logger.error('加载设置失败: ' + error.message);
}

// 更新日志管理器设置
logger.updateSettings({
  enableNormalLog: siteSettings.enableNormalLog,
  enableAdvancedLog: siteSettings.enableAdvancedLog,
  logLevel: siteSettings.logLevel,
  logRetention: siteSettings.logRetention,
  enableLogRotation: siteSettings.enableLogRotation,
  logFormat: siteSettings.logFormat
});

// 保存设置到文件
function saveSettings() {
  try {
    const settingsDir = path.join(__dirname, '../data');
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    const settingsPath = path.join(settingsDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(siteSettings, null, 2));
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    logger.error('保存设置失败: ' + error.message);
    return false;
  }
}

// 创建邮件传输器
function createMailTransporter() {
  return nodemailer.createTransport({
    host: siteSettings.smtpServer,
    port: siteSettings.smtpPort,
    secure: siteSettings.smtpSecure,
    auth: {
      user: siteSettings.smtpUser,
      pass: siteSettings.smtpPassword
    }
  });
}

// 日志相关控制器方法
exports.showLogs = (req, res) => {
  // 获取今天的日志
  const today = moment().format('YYYY-MM-DD');
  const normalLogs = logger.getLogs(false, { date: 'today' });
  const advancedLogs = logger.getLogs(true, { date: 'today' });
  
  res.render('admin-logs', {
    username: req.session.adminUser,
    normalLogs,
    advancedLogs
  });
};

exports.getNormalLogs = (req, res) => {
  try {
    const { level, date, search } = req.query;
    const filters = {};
    
    if (level && level !== 'all') {
      filters.level = level;
    }
    
    if (date && date !== 'all') {
      filters.date = date;
    }
    
    if (search) {
      filters.search = search;
    }
    
    const logs = logger.getLogs(false, filters);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    logger.error('获取普通日志失败: ' + error.message);
    res.json({
      success: false,
      message: '获取日志失败: ' + error.message
    });
  }
};

exports.getAdvancedLogs = (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const filters = {};
    
    if (type && type !== 'all') {
      filters.type = type;
    }
    
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    
    const logs = logger.getLogs(true, filters);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    logger.error('获取高级日志失败: ' + error.message);
    res.json({
      success: false,
      message: '获取日志失败: ' + error.message
    });
  }
};

exports.clearNormalLogs = (req, res) => {
  try {
    const success = logger.clearLogs(false);
    
    if (success) {
      logger.system.info('管理员清除了普通日志', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '清除日志失败'
      });
    }
  } catch (error) {
    logger.error('清除普通日志失败: ' + error.message);
    res.json({
      success: false,
      message: '清除日志失败: ' + error.message
    });
  }
};

exports.clearAdvancedLogs = (req, res) => {
  try {
    const success = logger.clearLogs(true);
    
    if (success) {
      logger.system.info('管理员清除了高级日志', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '清除日志失败'
      });
    }
  } catch (error) {
    logger.error('清除高级日志失败: ' + error.message);
    res.json({
      success: false,
      message: '清除日志失败: ' + error.message
    });
  }
};

exports.downloadNormalLogs = (req, res) => {
  try {
    const logFiles = logger.getLogFiles(false);
    
    if (logFiles.length === 0) {
      return res.status(404).send('没有找到日志文件');
    }
    
    // 创建ZIP文件
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });
    
    // 设置响应头
    res.attachment('normal-logs.zip');
    
    // 将归档输出流导向响应
    archive.pipe(res);
    
    // 添加日志文件到归档
    logFiles.forEach(file => {
      archive.file(file.path, { name: file.name });
    });
    
    // 完成归档
    archive.finalize();
    
    logger.system.info('管理员下载了普通日志', { admin: req.session.adminUser });
  } catch (error) {
    logger.error('下载普通日志失败: ' + error.message);
    res.status(500).send('下载日志失败: ' + error.message);
  }
};

exports.downloadAdvancedLogs = (req, res) => {
  try {
    const logFiles = logger.getLogFiles(true);
    
    if (logFiles.length === 0) {
      return res.status(404).send('没有找到高级日志文件');
    }
    
    // 创建ZIP文件
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });
    
    // 设置响应头
    res.attachment('advanced-logs.zip');
    
    // 将归档输出流导向响应
    archive.pipe(res);
    
    // 添加日志文件到归档
    logFiles.forEach(file => {
      archive.file(file.path, { name: file.name });
    });
    
    // 完成归档
    archive.finalize();
    
    logger.system.info('管理员下载了高级日志', { admin: req.session.adminUser });
  } catch (error) {
    logger.error('下载高级日志失败: ' + error.message);
    res.status(500).send('下载高级日志失败: ' + error.message);
  }
};

exports.analyzeLogs = (req, res) => {
  try {
    const analysisData = logger.analyzeLogs();
    
    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    logger.error('分析日志失败: ' + error.message);
    res.json({
      success: false,
      message: '分析日志失败: ' + error.message
    });
  }
};

exports.downloadLogAnalysis = (req, res) => {
  try {
    const analysisData = logger.analyzeLogs();
    
    // 生成报告内容
    const reportDate = moment().format('YYYY-MM-DD HH:mm:ss');
    let report = `# 日志分析报告\n`;
    report += `生成时间: ${reportDate}\n\n`;
    
    report += `## 日志统计\n`;
    report += `- 错误: ${analysisData.counts.error || 0}\n`;
    report += `- 警告: ${analysisData.counts.warning || 0}\n`;
    report += `- 信息: ${analysisData.counts.info || 0}\n`;
    report += `- 成功: ${analysisData.counts.success || 0}\n\n`;
    
    report += `## 常见错误\n`;
    if (analysisData.commonErrors && analysisData.commonErrors.length > 0) {
      analysisData.commonErrors.forEach((error, index) => {
        report += `${index + 1}. ${error.message} (${error.count}次)\n`;
      });
    } else {
      report += `暂无常见错误数据\n`;
    }
    report += `\n`;
    
    report += `## 访问统计（按日期）\n`;
    const dateKeys = Object.keys(analysisData.accessByDate).sort();
    if (dateKeys.length > 0) {
      dateKeys.forEach(date => {
        report += `- ${date}: ${analysisData.accessByDate[date]}次访问\n`;
      });
    } else {
      report += `暂无访问统计数据\n`;
    }
    report += `\n`;
    
    report += `## 访问统计（按小时）\n`;
    const hourKeys = Object.keys(analysisData.accessByHour).sort((a, b) => parseInt(a) - parseInt(b));
    if (hourKeys.length > 0) {
      hourKeys.forEach(hour => {
        report += `- ${hour}时: ${analysisData.accessByHour[hour]}次访问\n`;
      });
    } else {
      report += `暂无访问统计数据\n`;
    }
    
    // 设置响应头
    res.attachment('log-analysis.txt');
    res.type('text');
    res.send(report);
    
    logger.system.info('管理员下载了日志分析报告', { admin: req.session.adminUser });
  } catch (error) {
    logger.error('下载日志分析报告失败: ' + error.message);
    res.status(500).send('下载日志分析报告失败: ' + error.message);
  }
};

// 设置相关控制器方法
exports.showSettings = (req, res) => {
  res.render('admin-settings', {
    username: req.session.adminUser,
    settings: siteSettings
  });
};

exports.updateBasicSettings = (req, res) => {
  try {
    const { siteName, siteDescription, contactEmail, contactPhone } = req.body;
    
    // 更新设置
    siteSettings.siteName = siteName;
    siteSettings.siteDescription = siteDescription;
    siteSettings.contactEmail = contactEmail;
    siteSettings.contactPhone = contactPhone;
    
    // 保存设置
    const success = saveSettings();
    
    if (success) {
      logger.system.info('管理员更新了基本设置', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '保存设置失败'
      });
    }
  } catch (error) {
    logger.error('更新基本设置失败: ' + error.message);
    res.json({
      success: false,
      message: '更新设置失败: ' + error.message
    });
  }
};

exports.updateSecuritySettings = (req, res) => {
  try {
    const { enableSecurityCheck, enableLoginNotification, maxLoginAttempts, sessionTimeout } = req.body;
    
    // 更新设置
    siteSettings.enableSecurityCheck = enableSecurityCheck;
    siteSettings.enableLoginNotification = enableLoginNotification;
    siteSettings.maxLoginAttempts = parseInt(maxLoginAttempts, 10);
    siteSettings.sessionTimeout = parseInt(sessionTimeout, 10);
    
    // 保存设置
    const success = saveSettings();
    
    if (success) {
      logger.system.info('管理员更新了安全设置', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '保存设置失败'
      });
    }
  } catch (error) {
    logger.error('更新安全设置失败: ' + error.message);
    res.json({
      success: false,
      message: '更新设置失败: ' + error.message
    });
  }
};

exports.updateLogSettings = (req, res) => {
  try {
    const { enableNormalLog, enableAdvancedLog, logLevel, logRetention, enableLogRotation, logFormat } = req.body;
    
    // 更新设置
    siteSettings.enableNormalLog = enableNormalLog;
    siteSettings.enableAdvancedLog = enableAdvancedLog;
    siteSettings.logLevel = logLevel;
    siteSettings.logRetention = parseInt(logRetention, 10);
    siteSettings.enableLogRotation = enableLogRotation;
    siteSettings.logFormat = logFormat;
    
    // 更新日志管理器设置
    logger.updateSettings({
      enableNormalLog,
      enableAdvancedLog,
      logLevel,
      logRetention: parseInt(logRetention, 10),
      enableLogRotation,
      logFormat
    });
    
    // 保存设置
    const success = saveSettings();
    
    if (success) {
      logger.system.info('管理员更新了日志设置', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '保存设置失败'
      });
    }
  } catch (error) {
    logger.error('更新日志设置失败: ' + error.message);
    res.json({
      success: false,
      message: '更新设置失败: ' + error.message
    });
  }
};

exports.updateEmailSettings = (req, res) => {
  try {
    const { smtpServer, smtpPort, smtpUser, smtpPassword, smtpSecure } = req.body;
    
    // 更新设置
    siteSettings.smtpServer = smtpServer;
    siteSettings.smtpPort = parseInt(smtpPort, 10);
    siteSettings.smtpUser = smtpUser;
    siteSettings.smtpSecure = smtpSecure;
    
    // 只有在提供了新密码时才更新密码
    if (smtpPassword) {
      siteSettings.smtpPassword = smtpPassword;
    }
    
    // 保存设置
    const success = saveSettings();
    
    if (success) {
      logger.system.info('管理员更新了邮件设置', { admin: req.session.adminUser });
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false,
        message: '保存设置失败'
      });
    }
  } catch (error) {
    logger.error('更新邮件设置失败: ' + error.message);
    res.json({
      success: false,
      message: '更新设置失败: ' + error.message
    });
  }
};

exports.testEmailSettings = (req, res) => {
  try {
    const { email, settings } = req.body;
    
    // 创建临时传输器
    const tempSettings = { ...siteSettings };
    
    if (settings) {
      tempSettings.smtpServer = settings.smtpServer;
      tempSettings.smtpPort = parseInt(settings.smtpPort, 10);
      tempSettings.smtpUser = settings.smtpUser;
      tempSettings.smtpSecure = settings.smtpSecure;
      
      if (settings.smtpPassword) {
        tempSettings.smtpPassword = settings.smtpPassword;
      }
    }
    
    const transporter = nodemailer.createTransport({
      host: tempSettings.smtpServer,
      port: tempSettings.smtpPort,
      secure: tempSettings.smtpSecure,
      auth: {
        user: tempSettings.smtpUser,
        pass: tempSettings.smtpPassword
      }
    });
    
    // 发送测试邮件
    transporter.sendMail({
      from: tempSettings.smtpUser,
      to: email,
      subject: '测试邮件 - Kazay Studio 管理系统',
      text: '这是一封测试邮件，用于验证邮件设置是否正确。',
      html: `
        <h2>Kazay Studio 管理系统</h2>
        <p>这是一封测试邮件，用于验证邮件设置是否正确。</p>
        <p>如果您收到此邮件，说明邮件设置已配置成功。</p>
        <p>发送时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
      `
    }, (error, info) => {
      if (error) {
        logger.error('发送测试邮件失败: ' + error.message);
        res.json({
          success: false,
          message: '发送测试邮件失败: ' + error.message
        });
      } else {
        logger.system.info('管理员发送了测试邮件', { admin: req.session.adminUser, to: email });
        res.json({
          success: true,
          message: '测试邮件已发送',
          info
        });
      }
    });
  } catch (error) {
    logger.error('发送测试邮件失败: ' + error.message);
    res.json({
      success: false,
      message: '发送测试邮件失败: ' + error.message
    });
  }
};

// 其他控制器方法
exports.showLoginPage = (req, res) => {
  res.render('admin-login');
};

exports.login = (req, res) => {
  // 登录逻辑
};

exports.logout = (req, res) => {
  // 登出逻辑
};

exports.verifyCode = (req, res) => {
  // 验证码验证逻辑
};

exports.sendVerificationCode = (req, res) => {
  // 发送验证码逻辑
};

exports.showDashboard = (req, res) => {
  // 显示控制台页面
};

exports.showPages = (req, res) => {
  // 显示页面管理
};

exports.editPage = (req, res) => {
  // 编辑页面
};

exports.updatePage = (req, res) => {
  // 更新页面
};

exports.createPage = (req, res) => {
  // 创建页面
};

exports.deletePage = (req, res) => {
  // 删除页面
};

exports.showMessages = (req, res) => {
  // 显示留言管理
};

exports.replyMessage = (req, res) => {
  // 回复留言
};

exports.deleteMessage = (req, res) => {
  // 删除留言
};

exports.markMessageAsRead = (req, res) => {
  // 标记留言为已读
}; 