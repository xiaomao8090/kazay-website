const logger = require('../utils/logManager');

/**
 * 检查管理员身份验证
 */
exports.checkAdminAuth = (req, res, next) => {
  // 检查会话是否存在
  if (!req.session || !req.session.adminUser) {
    logger.security.warning('未授权访问管理页面', {
      ip: req.ip,
      path: req.originalUrl,
      userAgent: req.headers['user-agent']
    });
    
    return res.redirect('/admin/login');
  }
  
  // 会话有效，继续
  next();
}; 