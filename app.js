require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { generateVerificationCode, sendVerificationCode } = require('./utils/authUtils');
const sessionManager = require('./utils/sessionManager');
const nodemailer = require('nodemailer'); // 新增：用于发送邮件
const fs = require('fs');
const logger = require('./utils/logManager'); // 新增：日志管理器
const adminRoutes = require('./routes/admin'); // 新增：管理员路由

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// 联系记录存储路径
const CONTACTS_FILE = path.join(__dirname, 'data', 'contacts.json');
// 访问记录存储路径
const VISITS_FILE = path.join(__dirname, 'data', 'visits.json');

// 确保data目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// 初始化联系记录文件
if (!fs.existsSync(CONTACTS_FILE)) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify([], null, 2));
}

// 初始化访问记录文件
if (!fs.existsSync(VISITS_FILE)) {
  fs.writeFileSync(VISITS_FILE, JSON.stringify({
    totalVisits: 0,
    uniqueIPs: {},
    dailyStats: {}
  }, null, 2));
}

// 读取联系记录
const readContacts = () => {
  try {
    const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('读取联系记录失败: ' + error.message);
    return [];
  }
};

// 读取访问记录
const readVisits = () => {
  try {
    const data = fs.readFileSync(VISITS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('读取访问记录失败: ' + error.message);
    return {
      totalVisits: 0,
      uniqueIPs: {},
      dailyStats: {}
    };
  }
};

// 保存访问记录
const saveVisits = (visitsData) => {
  try {
    fs.writeFileSync(VISITS_FILE, JSON.stringify(visitsData, null, 2));
    return true;
  } catch (error) {
    logger.error('保存访问记录失败: ' + error.message);
    return false;
  }
};

// 记录访问
const recordVisit = (ip) => {
  try {
    const visitsData = readVisits();
    const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD
    
    // 增加总访问次数
    visitsData.totalVisits += 1;
    
    // 记录独立IP
    if (!visitsData.uniqueIPs[ip]) {
      visitsData.uniqueIPs[ip] = {
        firstVisit: new Date().toISOString(),
        visits: 0
      };
    }
    visitsData.uniqueIPs[ip].visits += 1;
    visitsData.uniqueIPs[ip].lastVisit = new Date().toISOString();
    
    // 更新每日统计
    if (!visitsData.dailyStats[today]) {
      visitsData.dailyStats[today] = {
        totalVisits: 0,
        uniqueIPs: {}
      };
    }
    visitsData.dailyStats[today].totalVisits += 1;
    visitsData.dailyStats[today].uniqueIPs[ip] = true;
    
    // 保存数据
    saveVisits(visitsData);
    
    // 记录访问日志
    logger.access.info('页面访问', { ip, timestamp: new Date().toISOString() });
    
    return true;
  } catch (error) {
    logger.error('记录访问失败: ' + error.message);
    return false;
  }
};

// 获取访问统计数据
const getVisitStats = () => {
  try {
    const visitsData = readVisits();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // 计算独立IP数量
    const uniqueIPCount = Object.keys(visitsData.uniqueIPs).length;
    
    // 计算今日访问量和独立IP
    const todayVisits = visitsData.dailyStats[today] || { totalVisits: 0, uniqueIPs: {} };
    const todayVisitsCount = todayVisits.totalVisits;
    const todayUniqueIPCount = Object.keys(todayVisits.uniqueIPs).length;
    
    // 计算昨日访问量和独立IP
    const yesterdayVisits = visitsData.dailyStats[yesterday] || { totalVisits: 0, uniqueIPs: {} };
    const yesterdayVisitsCount = yesterdayVisits.totalVisits;
    const yesterdayUniqueIPCount = Object.keys(yesterdayVisits.uniqueIPs).length;
    
    // 计算趋势
    const visitsTrend = yesterdayVisitsCount > 0 
      ? Math.round((todayVisitsCount - yesterdayVisitsCount) / yesterdayVisitsCount * 100) 
      : 0;
    
    // 计算最近7天的数据
    const last7Days = [];
    const today7 = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today7);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = visitsData.dailyStats[dateStr] || { totalVisits: 0, uniqueIPs: {} };
      last7Days.unshift({
        date: dateStr,
        visits: dayData.totalVisits,
        uniqueIPs: Object.keys(dayData.uniqueIPs).length
      });
    }
    
    return {
      totalVisits: visitsData.totalVisits,
      uniqueIPCount,
      todayVisitsCount,
      todayUniqueIPCount,
      yesterdayVisitsCount,
      yesterdayUniqueIPCount,
      visitsTrend,
      last7Days
    };
  } catch (error) {
    logger.error('获取访问统计失败: ' + error.message);
    return {
      totalVisits: 0,
      uniqueIPCount: 0,
      todayVisitsCount: 0,
      todayUniqueIPCount: 0,
      yesterdayVisitsCount: 0,
      yesterdayUniqueIPCount: 0,
      visitsTrend: 0,
      last7Days: []
    };
  }
};

// 保存联系记录
const saveContact = (contact) => {
  try {
    const contacts = readContacts();
    contacts.unshift({ id: uuidv4(), ...contact }); // 添加到开头，最新的在前面
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    return true;
  } catch (error) {
    logger.error('保存联系记录失败: ' + error.message);
    return false;
  }
};

// 删除联系记录
const deleteContact = (id) => {
  try {
    let contacts = readContacts();
    contacts = contacts.filter(contact => contact.id !== id);
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    return true;
  } catch (error) {
    logger.error('删除联系记录失败: ' + error.message);
    return false;
  }
};

// 管理员配置
const ADMINS = [
  {
    username: 'xiaomao',
    password: 'xiaomao123',
    email: 'xiaomao8090@gmail.com',
    trustedIPs: [] // 可信IP列表
  },
  {
    username: 'yeli',
    password: 'yeli123',
    email: 'serikelaman421@gmail.com',
    trustedIPs: [] // 可信IP列表
  }
];

// 获取所有管理员邮箱
const getAllAdminEmails = () => {
  return ADMINS.map(admin => admin.email).filter(Boolean);
};

// 根据用户名获取管理员信息
const getAdminByUsername = (username) => {
  return ADMINS.find(admin => admin.username === username);
};

// 根据IP获取管理员信息
const getAdminByIP = (ip) => {
  return ADMINS.find(admin => admin.trustedIPs.includes(ip));
};

// 跟踪登录失败次数
const loginFailures = {};

// 添加文件日志记录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 替换原有的日志记录函数
const logError = (type, message, details = {}) => {
  logger.system.error(`[${type}] ${message}`, details);
};

// 替换原有的异常分析函数
const analyzeExceptions = () => {
  // 使用日志管理器的分析功能
  return logger.analyzeLogs();
};

// 替换原有的自动拦截IP函数
const autoBlockIPs = async () => {
  try {
    // 获取高级日志中的安全日志
    const securityLogs = logger.getLogs(true, { type: 'security' });
    
    // 分析可疑IP
    const suspiciousIPs = {};
    securityLogs.forEach(log => {
      if (log.details && log.details.ip) {
        const ip = log.details.ip;
        if (!suspiciousIPs[ip]) {
          suspiciousIPs[ip] = 0;
        }
        suspiciousIPs[ip]++;
      }
    });
    
    // 检查是否需要拦截
    Object.keys(suspiciousIPs).forEach(ip => {
      if (suspiciousIPs[ip] >= 10) { // 如果同一IP有10次以上的安全日志记录
        const blockedIPs = loadBlockedIPs();
        if (!blockedIPs.permanent.includes(ip) && !blockedIPs.temporary.some(item => item.ip === ip)) {
          // 添加到临时拦截列表
          blockedIPs.temporary.push({
            ip,
            reason: '自动拦截：可疑活动',
            timestamp: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
          });
          saveBlockedIPs(blockedIPs);
          
          // 记录拦截日志
          logger.security.warning(`自动拦截IP: ${ip}`, { ip, reason: '可疑活动', suspiciousCount: suspiciousIPs[ip] });
          
          // 发送安全警报
          sendSecurityAlert(
            '自动拦截IP',
            `系统已自动拦截IP地址 ${ip}，因为检测到可疑活动。<br>该IP在安全日志中出现了 ${suspiciousIPs[ip]} 次。`,
            ip,
            'System'
          );
        }
      }
    });
    
    return true;
  } catch (error) {
    logger.error('自动拦截IP失败: ' + error.message);
    return false;
  }
};

// 定期运行自动拦截（每小时）
setInterval(async () => {
  console.log('运行自动IP拦截检查...');
  const result = await autoBlockIPs();
  console.log(`自动拦截结果: 拦截了 ${result.blocked} 个IP`);
}, 60 * 60 * 1000);

// 添加自动拦截API
app.post('/admin/api/auto-block', async (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  try {
    // 运行自动拦截
    const result = await autoBlockIPs();
    
    res.json({
      success: true,
      message: `已自动拦截 ${result.blocked} 个IP`,
      data: result
    });
  } catch (error) {
    console.error('运行自动拦截失败:', error);
    res.status(500).json({
      success: false,
      message: '运行自动拦截失败: ' + error.message
    });
  }
});

// 替换原有的发送安全警报函数
const sendSecurityAlert = async (subject, content, ipAddress, userAgent) => {
  try {
    // 记录安全警报
    logger.security.warning(subject, { content, ip: ipAddress, userAgent });
    
    // 获取管理员邮箱
    const adminEmails = getAllAdminEmails();
    if (!adminEmails.length) {
      logger.error('发送安全警报失败: 没有配置管理员邮箱');
      return false;
    }
    
    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // 发送邮件
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmails.join(','),
      subject: `安全警报: ${subject}`,
      html: `
        <h2>Kazay Studio 安全警报</h2>
        <p><strong>${subject}</strong></p>
        <p>${content}</p>
        <hr>
        <p><strong>IP地址:</strong> ${ipAddress}</p>
        <p><strong>用户代理:</strong> ${userAgent}</p>
        <p><strong>时间:</strong> ${new Date().toLocaleString()}</p>
      `
    });
    
    return true;
  } catch (error) {
    logger.error('发送安全警报失败: ' + error.message);
    return false;
  }
};

// 清理登录失败记录（每小时）
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  Object.keys(loginFailures).forEach(ip => {
    // 清理超过1小时的记录
    loginFailures[ip] = loginFailures[ip].filter(time => time > oneHourAgo);
    
    // 如果没有记录，删除该IP
    if (loginFailures[ip].length === 0) {
      delete loginFailures[ip];
    }
  });
  
  console.log('已清理登录失败记录，当前记录数:', Object.keys(loginFailures).length);
}, 60 * 60 * 1000);

// 添加全局异常处理
process.on('uncaughtException', async (error) => {
  console.error('未捕获的异常:', error);
  
  try {
    // 发送异常通知给所有管理员
    await sendSecurityAlert(
      "系统异常", 
      `服务器发生未捕获的异常: ${error.message}\n\n${error.stack}`,
      "服务器",
      "Node.js进程"
    );
  } catch (notifyError) {
    console.error('发送异常通知失败:', notifyError);
  }
  
  // 在生产环境中，可能需要重启服务
  if (process.env.NODE_ENV === 'production') {
    console.log('系统将在5秒后重启...');
    setTimeout(() => {
      process.exit(1); // 退出进程，依赖于进程管理器（如PM2）来重启
    }, 5000);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  
  try {
    // 发送异常通知给所有管理员
    await sendSecurityAlert(
      "Promise异常", 
      `服务器发生未处理的Promise拒绝: ${reason && reason.message ? reason.message : reason}\n\n${reason && reason.stack ? reason.stack : '无堆栈信息'}`,
      "服务器",
      "Node.js进程"
    );
  } catch (notifyError) {
    console.error('发送异常通知失败:', notifyError);
  }
});

// 安全措施 - 仅在生产环境中启用
if (isProduction) {
  // 添加安全HTTP头
  app.use(helmet({
    contentSecurityPolicy: false, // 在开发环境中禁用CSP
  }));
  
  // 启用压缩
  app.use(compression());
  
  // 设置严格的传输安全
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// 设置会话
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'kazay-studio-secret',
  resave: false,
  saveUninitialized: true, // 改为true以确保会话始终被保存
  cookie: { 
    secure: isProduction,
    maxAge: 30 * 60 * 1000 // 30分钟
  }
}));

// 设置速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP限制5次尝试
  message: { success: false, message: '尝试次数过多，请15分钟后再试' },
  standardHeaders: true, // 返回 RateLimit-* 头信息
  legacyHeaders: false, // 禁用 X-RateLimit-* 头信息
  skipSuccessfulRequests: false, // 即使请求成功也计数
  keyGenerator: (req) => {
    // 使用 IP + 用户代理作为唯一标识，增加安全性
    return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
  }
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP限制10次尝试
  message: { success: false, message: '尝试次数过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
  }
});

// 邮件发送速率限制 - 防止邮件轰炸
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 每小时最多发送20封邮件
  message: { success: false, message: '发送邮件频率过高，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// 联系表单处理
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每个IP每小时最多5次提交
  message: { success: false, message: '提交频率过高，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// 存储被拦截的IP
let blockedIPs = [];

// 加载拦截IP列表
const loadBlockedIPs = () => {
  try {
    const blockedIPsPath = path.join(__dirname, 'data', 'blocked_ips.json');
    
    // 检查文件是否存在
    if (fs.existsSync(blockedIPsPath)) {
      const data = fs.readFileSync(blockedIPsPath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed)) {
        blockedIPs = parsed;
        console.log(`已加载 ${blockedIPs.length} 个拦截IP`);
      }
    } else {
      // 创建空文件
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(blockedIPsPath, JSON.stringify([], null, 2));
      console.log('已创建拦截IP列表文件');
    }
  } catch (error) {
    console.error('加载拦截IP列表失败:', error);
    // 记录错误
    logger.error('加载拦截IP列表失败: ' + error.message);
  }
  return {
    permanent: [], // 永久拦截列表
    temporary: [] // 临时拦截列表
  };
};

// 保存拦截IP列表
const saveBlockedIPs = (blockedIPsData) => {
  try {
    const blockedIPsPath = path.join(__dirname, 'data', 'blocked_ips.json');
    fs.writeFileSync(blockedIPsPath, JSON.stringify(blockedIPsData, null, 2));
    console.log(`已保存 ${blockedIPsData.length} 个拦截IP`);
    return true;
  } catch (error) {
    console.error('保存拦截IP列表失败:', error);
    // 记录错误
    logger.error('保存拦截IP列表失败: ' + error.message);
    return false;
  }
};

// 启动时加载拦截IP列表
loadBlockedIPs();

// IP拦截中间件
app.use((req, res, next) => {
  const clientIP = req.ip;
  
  // 检查IP是否被拦截
  const blockedIPs = loadBlockedIPs();
  if (blockedIPs.permanent.includes(clientIP) || blockedIPs.temporary.some(item => item.ip === clientIP)) {
    // 记录拦截事件
    logger.security.warning('IP已拦截', { ip: clientIP, path: req.originalUrl, method: req.method });
    
    // 返回403禁止访问
    return res.status(403).send('访问被拒绝');
  }
  
  next();
});

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 解析请求体
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 访问日志中间件
app.use((req, res, next) => {
  // 忽略静态资源请求
  if (req.path.startsWith('/css/') || 
      req.path.startsWith('/js/') || 
      req.path.startsWith('/images/') ||
      req.path.includes('.')) {
    return next();
  }
  
  // 忽略管理员路由
  if (req.path.startsWith('/admin')) {
    return next();
  }
  
  // 记录访问
  const clientIP = req.ip;
  recordVisit(clientIP);
  
  next();
});

// 异常监控中间件
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  const clientIP = req.ip;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const url = req.originalUrl || req.url;
  const method = req.method;
  
  // 监控HTTP状态码
  res.status = function(code) {
    // 记录服务器错误（5xx）
    if (code >= 500) {
      sendSecurityAlert(
        "服务器错误", 
        `请求处理过程中发生服务器错误，状态码: ${code}
        URL: ${method} ${url}
        请求参数: ${JSON.stringify(req.body)}`,
        clientIP,
        userAgent
      ).catch(err => console.error('发送错误通知失败:', err));
    }
    
    // 记录客户端错误（4xx）- 可选，如果需要监控客户端错误
    if (code >= 400 && code < 500 && code !== 404) {
      console.warn(`客户端错误: ${code} - ${method} ${url}`);
    }
    
    return originalStatus.apply(res, arguments);
  };
  
  // 捕获响应发送过程中的错误
  res.send = function() {
    try {
      return originalSend.apply(res, arguments);
    } catch (error) {
      console.error('发送响应时出错:', error);
      sendSecurityAlert(
        "响应发送错误", 
        `发送响应时出错: ${error.message || '未知错误'}
        URL: ${method} ${url}`,
        clientIP,
        userAgent
      ).catch(err => console.error('发送错误通知失败:', err));
      
      // 尝试发送错误响应
      try {
        if (!res.headersSent) {
          res.status(500).send('服务器内部错误');
        }
      } catch (sendError) {
        console.error('发送错误响应失败:', sendError);
      }
    }
  };
  
  // 捕获JSON响应发送过程中的错误
  res.json = function() {
    try {
      return originalJson.apply(res, arguments);
    } catch (error) {
      console.error('发送JSON响应时出错:', error);
      sendSecurityAlert(
        "JSON响应发送错误", 
        `发送JSON响应时出错: ${error.message || '未知错误'}
        URL: ${method} ${url}`,
        clientIP,
        userAgent
      ).catch(err => console.error('发送错误通知失败:', err));
      
      // 尝试发送错误响应
      try {
        if (!res.headersSent) {
          res.status(500).json({ error: '服务器内部错误' });
        }
      } catch (sendError) {
        console.error('发送错误JSON响应失败:', sendError);
      }
    }
  };
  
  next();
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理捕获到错误:', err);
  
  const clientIP = req.ip;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const url = req.originalUrl || req.url;
  const method = req.method;
  
  // 发送错误通知
  sendSecurityAlert(
    "请求处理错误", 
    `处理请求时发生错误: ${err.message || '未知错误'}
    URL: ${method} ${url}
    堆栈: ${err.stack || '无堆栈信息'}`,
    clientIP,
    userAgent
  ).catch(notifyError => console.error('发送错误通知失败:', notifyError));
  
  // 发送错误响应
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后再试'
    });
  }
});

// 路由中间件，添加当前路径到所有模板
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// 路由
app.use('/admin', adminRoutes); // 添加管理员路由

// 首页
app.get('/', (req, res) => {
  res.render('index', {
    title: '首页 - Kazay Studio'
  });
});

// 关于我们
app.get('/about', (req, res) => {
  res.render('about', {
    title: '关于我们 - Kazay Studio'
  });
});

// 服务
app.get('/services', (req, res) => {
  res.render('services', {
    title: '服务 - Kazay Studio'
  });
});

// 作品集
app.get('/portfolio', (req, res) => {
  res.render('portfolio', {
    title: '作品集 - Kazay Studio'
  });
});

// 联系我们
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: '联系我们 - Kazay Studio'
  });
});

// 处理联系表单提交
app.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // 验证必填字段
    if (!name || !email || !message) {
      return res.json({
        success: false,
        message: '请填写所有必填字段'
      });
    }
    
    // 保存联系记录
    const contact = {
      name,
      email,
      phone: phone || '',
      subject: subject || '网站咨询',
      message,
      date: new Date().toISOString(),
      status: 'unread',
      ip: req.ip
    };
    
    const saveResult = saveContact(contact);
    if (!saveResult) {
      logger.error('保存联系表单失败');
      return res.json({
        success: false,
        message: '提交失败，请稍后再试'
      });
    }
    
    // 发送通知邮件
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: getAllAdminEmails().join(','),
        subject: `新的网站咨询: ${subject || '网站咨询'}`,
        html: `
          <h2>Kazay Studio 新咨询</h2>
          <p><strong>姓名:</strong> ${name}</p>
          <p><strong>邮箱:</strong> ${email}</p>
          <p><strong>电话:</strong> ${phone || '未提供'}</p>
          <p><strong>主题:</strong> ${subject || '网站咨询'}</p>
          <p><strong>消息:</strong></p>
          <div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p><strong>时间:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>IP地址:</strong> ${req.ip}</p>
        `
      });
      
      // 记录成功日志
      logger.info(`收到新的联系表单: ${name} (${email})`);
    } catch (error) {
      // 记录邮件发送错误，但不影响用户体验
      logger.error('发送联系表单通知邮件失败: ' + error.message);
    }
    
    res.json({
      success: true,
      message: '感谢您的咨询，我们会尽快回复您'
    });
  } catch (error) {
    logger.error('处理联系表单时发生错误: ' + error.message);
    res.json({
      success: false,
      message: '提交失败，请稍后再试'
    });
  }
});

// 会话测试端点 - 仅开发环境可用
if (!isProduction) {
  app.get('/session-test', (req, res) => {
    // 如果会话ID不存在，创建一个
    if (!req.session.testId) {
      req.session.testId = uuidv4();
      req.session.save((err) => {
        if (err) {
          console.error('保存测试会话失败:', err);
        }
      });
    }
    
    res.json({
      success: true,
      sessionId: req.session.id,
      testId: req.session.testId,
      cookie: req.session.cookie,
      isNew: req.session.isNew
    });
  });
}

// 管理后台路由
// 管理员登录页面
app.get('/admin', (req, res) => {
  // 检查是否有明确的登出标记
  const isLogout = req.query.logout === 'true';
  
  // 如果是登出状态，不进行自动登录
  if (!isLogout) {
    // 检查是否有可信IP自动登录
    const clientIP = req.ip;
    const adminByIP = getAdminByIP(clientIP);
    
    if (adminByIP) {
      // 设置登录状态
      req.session.adminLoggedIn = true;
      req.session.adminUsername = adminByIP.username;
      
      // 记录自动登录
      console.log(`IP自动登录成功: ${clientIP} 作为 ${adminByIP.username}`);
      
      // 重定向到管理后台
      return res.redirect('/admin/dashboard');
    }
  }
  
  res.render('admin-login', { title: '管理员登录', layout: false });
});

// 请求验证码 - 添加速率限制
app.post('/admin/request-code', loginLimiter, emailLimiter, async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // 查找管理员
  const admin = getAdminByUsername(username);
  
  // 记录登录尝试
  if (!loginFailures[clientIP]) {
    loginFailures[clientIP] = [];
  }
  
  // 简单的用户名密码验证
  if (admin && password === admin.password) {
    // 登录成功，清除失败记录
    loginFailures[clientIP] = [];
    
    // 生成6位数字验证码
    const verificationCode = generateVerificationCode();
    
    // 生成会话ID
    const sessionId = uuidv4();
    
    // 存储会话信息
    sessionManager.createSession(sessionId, {
      username,
      verificationCode,
      verified: false,
      ipAddress: clientIP,
      userAgent: userAgent,
      adminEmail: admin.email // 存储管理员邮箱
    });
    
    // 发送验证码到指定邮箱
    try {
      const sendResult = await sendVerificationCode(admin.email, verificationCode, clientIP);
      
      if (!sendResult.success) {
        // 发送验证码失败，记录异常
        sendSecurityAlert(
          "验证码发送失败", 
          `管理员 ${username} 登录时验证码发送失败: ${sendResult.message || '未知错误'}`,
          clientIP,
          userAgent
        );
        
        return res.status(429).json({
          success: false,
          message: sendResult.message || '发送验证码失败，请稍后再试'
        });
      }
      
      // 在会话中存储会话ID
      req.session.adminSessionId = sessionId;
      
      // 等待会话保存完成
      await new Promise((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error('保存会话失败:', err);
            // 记录会话保存失败异常
            sendSecurityAlert(
              "会话保存失败", 
              `管理员 ${username} 登录时会话保存失败: ${err.message || '未知错误'}`,
              clientIP,
              userAgent
            );
          } else {
            console.log(`会话ID已保存: ${sessionId}`);
          }
          resolve();
        });
      });
      
      // 如果不是xiaomao登录，发送通知给xiaomao
      if (username !== 'xiaomao') {
        const xiaomaoAdmin = getAdminByUsername('xiaomao');
        if (xiaomaoAdmin) {
          // 发送登录通知邮件
          const notifyOptions = {
            from: process.env.EMAIL_USER || 'xiaomao8090@gmail.com',
            to: xiaomaoAdmin.email,
            subject: `管理员登录通知: ${username}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #3498db; text-align: center;">管理员登录通知</h2>
                <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                  <p><strong>管理员:</strong> ${username}</p>
                  <p><strong>IP地址:</strong> ${clientIP}</p>
                  <p><strong>浏览器:</strong> ${userAgent}</p>
                  <p><strong>时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
                </div>
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #7f8c8d; font-size: 12px;">
                  <p>此邮件由系统自动发送，请勿回复。</p>
                </div>
              </div>
            `
          };
          
          try {
            await transporter.sendMail(notifyOptions);
            console.log(`已发送登录通知给 ${xiaomaoAdmin.email}`);
          } catch (error) {
            console.error('发送登录通知失败:', error);
          }
        }
      }
      
      // 返回会话ID给客户端
      res.json({
        success: true,
        sessionId,
        adminEmail: admin.email // 返回管理员邮箱，用于显示
      });
    } catch (error) {
      console.error('发送验证码失败:', error);
      
      // 记录异常
      sendSecurityAlert(
        "验证码发送异常", 
        `管理员 ${username} 登录时发生异常: ${error.message || '未知错误'}`,
        clientIP,
        userAgent
      );
      
      res.status(500).json({
        success: false,
        message: '发送验证码失败，请稍后再试'
      });
    }
  } else {
    // 用户名或密码错误，记录失败
    loginFailures[clientIP].push(Date.now());
    
    // 检查失败次数
    if (loginFailures[clientIP].length >= 2) {
      // 两次或以上失败，发送警报
      sendSecurityAlert(
        "多次登录失败", 
        `IP地址 ${clientIP} 在短时间内有 ${loginFailures[clientIP].length} 次登录失败尝试，最后一次尝试的用户名: ${username}`,
        clientIP,
        userAgent
      );
    }
    
    // 用户名或密码错误
    res.json({
      success: false,
      message: '用户名或密码错误'
    });
  }
});

// 验证验证码 - 添加速率限制
app.post('/admin/verify-code', verifyLimiter, async (req, res) => {
  const { sessionId, code } = req.body;
  const clientIP = req.ip;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  console.log(`验证请求: 会话ID=${sessionId}, 当前会话ID=${req.session.adminSessionId || '无'}`);
  
  // 验证会话ID是否匹配
  if (!sessionId || req.session.adminSessionId !== sessionId) {
    console.warn(`会话ID不匹配: 请求ID=${sessionId}, 会话ID=${req.session.adminSessionId || '无'}`);
    
    // 记录可疑活动
    sendSecurityAlert(
      "会话ID不匹配", 
      `验证码验证时会话ID不匹配，可能是会话劫持尝试。请求ID: ${sessionId}, 会话ID: ${req.session.adminSessionId || '无'}`,
      clientIP,
      userAgent
    );
    
    return res.json({
      success: false,
      message: '无效的会话，请返回重新登录',
      errorCode: 'SESSION_MISMATCH'
    });
  }
  
  // 获取会话信息
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    console.warn(`会话不存在或已过期: ${sessionId}`);
    
    // 记录可疑活动
    sendSecurityAlert(
      "会话不存在或已过期", 
      `验证码验证时会话不存在或已过期，可能是过期会话重用尝试。会话ID: ${sessionId}`,
      clientIP,
      userAgent
    );
    
    return res.json({
      success: false,
      message: '会话已过期，请返回重新获取验证码',
      errorCode: 'SESSION_EXPIRED'
    });
  }
  
  // 注释掉IP和用户代理验证，只保留会话ID验证
  /*
  // 验证IP和用户代理是否匹配，防止会话劫持
  if (session.ipAddress !== clientIP || session.userAgent !== userAgent) {
    console.warn(`可疑的验证尝试: 会话IP=${session.ipAddress}, 当前IP=${clientIP}`);
    
    // 记录可疑活动
    sendSecurityAlert(
      "可能的会话劫持", 
      `验证码验证时IP或用户代理不匹配，可能是会话劫持尝试。
      会话IP: ${session.ipAddress}, 当前IP: ${clientIP}
      会话用户代理: ${session.userAgent}
      当前用户代理: ${userAgent}`,
      clientIP,
      userAgent
    );
    
    return res.json({
      success: false,
      message: '安全验证失败，请返回重新获取验证码',
      errorCode: 'SECURITY_CHECK_FAILED'
    });
  }
  */
  
  // 验证验证码
  if (session.verificationCode === code) {
    // 更新会话状态
    sessionManager.updateSession(sessionId, {
      verified: true
    });
    
    // 设置登录状态
    req.session.adminLoggedIn = true;
    req.session.adminUsername = session.username;
    
    // 获取管理员信息
    const admin = getAdminByUsername(session.username);
    
    // 如果是有效的管理员并且IP不在可信列表中，添加到可信IP列表
    if (admin && !admin.trustedIPs.includes(clientIP)) {
      admin.trustedIPs.push(clientIP);
      console.log(`已将IP ${clientIP} 添加到 ${admin.username} 的可信IP列表`);
    }
    
    res.json({
      success: true
    });
  } else {
    // 验证码错误，记录尝试
    if (!loginFailures[clientIP]) {
      loginFailures[clientIP] = [];
    }
    loginFailures[clientIP].push(Date.now());
    
    // 检查失败次数
    if (loginFailures[clientIP].length >= 2) {
      // 两次或以上失败，发送警报
      sendSecurityAlert(
        "多次验证码验证失败", 
        `IP地址 ${clientIP} 在短时间内有 ${loginFailures[clientIP].length} 次验证码验证失败，用户名: ${session.username}`,
        clientIP,
        userAgent
      );
    }
    
    res.json({
      success: false,
      message: '验证码错误，请重新输入',
      errorCode: 'INVALID_CODE'
    });
  }
});

// 检查是否已登录的中间件
const requireAdminLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin');
  }
};

// 管理后台控制台 - 需要验证
app.get('/admin/dashboard', requireAdminLogin, (req, res) => {
  // 读取联系记录，获取最近留言
  const contacts = readContacts();
  const recentMessages = contacts.slice(0, 3); // 获取最近3条留言
  
  // 统计新留言数量（过去7天）
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newMessages = contacts.filter(contact => {
    const contactDate = new Date(contact.date);
    return contactDate >= sevenDaysAgo;
  }).length;
  
  // 获取真实的访问统计数据
  const visitStats = getVisitStats();
  
  // 生成统计数据
  const stats = {
    visits: visitStats.uniqueIPCount, // 独立IP访问量
    visitsTrend: visitStats.visitsTrend, // 访问趋势
    newMessages: newMessages,
    messagesTrend: newMessages > 0 ? 10 : 0, // 固定趋势值
    conversionRate: 3.5, // 固定转化率
    conversionTrend: 2, // 固定趋势
    bounceRate: 45.8, // 固定跳出率
    bounceTrend: -3 // 固定趋势
  };
  
  res.render('admin-dashboard', { 
    title: '控制台', 
    layout: false,
    username: req.session.adminUsername,
    stats: stats,
    recentMessages: recentMessages,
    visitStats: visitStats // 传递完整的访问统计数据
  });
});

// 页面管理 - 需要验证
app.get('/admin/pages', requireAdminLogin, (req, res) => {
  res.render('admin-pages', { 
    title: '页面管理', 
    layout: false,
    username: req.session.adminUsername
  });
});

// 留言管理 - 需要验证
app.get('/admin/messages', requireAdminLogin, (req, res) => {
  // 读取联系记录
  const contacts = readContacts();
  
  res.render('admin-messages', { 
    title: '留言管理', 
    layout: false,
    username: req.session.adminUsername,
    contacts,
    success: req.query.success === 'true',
    error: req.query.error === 'true'
  });
});

// 删除留言 - 需要验证
app.post('/admin/messages/delete/:id', requireAdminLogin, (req, res) => {
  const { id } = req.params;
  
  if (deleteContact(id)) {
    res.redirect('/admin/messages?success=true');
  } else {
    res.redirect('/admin/messages?error=true');
  }
});

// 更新留言状态 - 需要验证
app.post('/admin/messages/status/:id', requireAdminLogin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const contacts = readContacts();
    const contactIndex = contacts.findIndex(contact => contact.id === id);
    
    if (contactIndex !== -1) {
      contacts[contactIndex].status = status;
      fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: '留言不存在' });
    }
  } catch (error) {
    console.error('更新留言状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 网站设置 - 需要验证
app.get('/admin/settings', requireAdminLogin, (req, res) => {
  res.render('admin-settings', { 
    title: '网站设置', 
    layout: false,
    username: req.session.adminUsername
  });
});

// 会话状态检查 - 需要验证
app.get('/admin/session-status', requireAdminLogin, (req, res) => {
  const stats = sessionManager.getSessionStats();
  res.json({
    success: true,
    stats,
    currentSession: {
      username: req.session.adminUsername,
      loggedIn: req.session.adminLoggedIn,
      sessionId: req.session.adminSessionId
    }
  });
});

// 退出登录
app.get('/admin/logout', (req, res) => {
  // 清除会话
  req.session.destroy((err) => {
    if (err) {
      console.error('销毁会话时出错:', err);
    }
    // 重定向到管理员登录页面，添加logout参数
    res.redirect('/admin?logout=true');
  });
});

// 404页面
app.use((req, res) => {
  logger.warning(`404页面未找到: ${req.originalUrl}`);
  res.status(404).render('404', {
    title: '页面未找到 - Kazay Studio'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误: ' + err.message, { stack: err.stack });
  res.status(500).render('error', {
    title: '服务器错误 - Kazay Studio',
    error: isProduction ? '服务器发生错误，请稍后再试' : err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.system.info(`服务器已启动，端口: ${PORT}，环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`服务器已启动，端口: ${PORT}，环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 启动日志轮换任务
  setInterval(() => {
    logger.rotateOldLogs().catch(err => {
      console.error('日志轮换失败:', err);
    });
  }, 24 * 60 * 60 * 1000); // 每24小时执行一次
});

// 配置Nodemailer
const transporter = nodemailer.createTransport({
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

// 添加异常分析API端点
app.get('/admin/api/exception-analysis', async (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const analysis = analyzeExceptions();
  res.json({
    success: true,
    data: analysis
  });
});

// 添加访问统计API端点
app.get('/admin/api/visit-stats', async (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const visitStats = getVisitStats();
  res.json({
    success: true,
    data: visitStats
  });
});

// 添加拦截IP的API
app.post('/admin/api/block-ip', async (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const { ip } = req.body;
  
  // 验证IP格式
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({
      success: false,
      message: '无效的IP地址'
    });
  }
  
  // 检查IP是否已被拦截
  const blockedIPs = loadBlockedIPs();
  if (blockedIPs.permanent.includes(ip) || blockedIPs.temporary.some(item => item.ip === ip)) {
    return res.json({
      success: true,
      message: '该IP已在拦截列表中',
      alreadyBlocked: true
    });
  }
  
  // 添加到拦截列表
  blockedIPs.temporary.push({
    ip,
    reason: '手动拦截',
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
  });
  saveBlockedIPs(blockedIPs); // 保存到文件
  
  // 记录操作
  logger.security.warning('手动拦截IP', { adminUsername: req.session.adminUsername, ipAddress: ip, timestamp: new Date().toISOString() });
  
  // 通知其他管理员
  try {
    await sendSecurityAlert(
      "IP已被拦截", 
      `管理员 ${req.session.adminUsername} 已将IP地址 ${ip} 添加到拦截列表`,
      req.ip,
      req.headers['user-agent'] || 'unknown'
    );
  } catch (error) {
    console.error('发送IP拦截通知失败:', error);
  }
  
  res.json({
    success: true,
    message: 'IP已成功添加到拦截列表'
  });
});

// 获取拦截IP列表
app.get('/admin/api/blocked-ips', (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const blockedIPs = loadBlockedIPs();
  res.json({
    success: true,
    data: blockedIPs.temporary // 只返回临时拦截列表
  });
});

// 移除拦截IP
app.post('/admin/api/unblock-ip', (req, res) => {
  // 验证管理员登录状态
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const { ip } = req.body;
  
  // 验证IP格式
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({
      success: false,
      message: '无效的IP地址'
    });
  }
  
  // 检查IP是否在拦截列表中
  const blockedIPs = loadBlockedIPs();
  const index = blockedIPs.temporary.findIndex(item => item.ip === ip);
  if (index === -1) {
    return res.json({
      success: false,
      message: '该IP不在拦截列表中'
    });
  }
  
  // 从拦截列表中移除
  blockedIPs.temporary.splice(index, 1);
  saveBlockedIPs(blockedIPs); // 保存到文件
  
  // 记录操作
  logger.security.warning('解除IP拦截', { adminUsername: req.session.adminUsername, ipAddress: ip, timestamp: new Date().toISOString() });
  
  res.json({
    success: true,
    message: 'IP已从拦截列表中移除'
  });
}); 