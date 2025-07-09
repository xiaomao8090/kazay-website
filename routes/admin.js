const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { checkAdminAuth } = require('../middleware/authMiddleware');

// 登录相关路由
router.get('/login', adminController.showLoginPage);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);
router.post('/verify-code', adminController.verifyCode);
router.post('/send-code', adminController.sendVerificationCode);

// 控制台
router.get('/dashboard', checkAdminAuth, adminController.showDashboard);

// 页面管理
router.get('/pages', checkAdminAuth, adminController.showPages);
router.get('/pages/edit/:id', checkAdminAuth, adminController.editPage);
router.post('/pages/update/:id', checkAdminAuth, adminController.updatePage);
router.post('/pages/create', checkAdminAuth, adminController.createPage);
router.post('/pages/delete/:id', checkAdminAuth, adminController.deletePage);

// 留言管理
router.get('/messages', checkAdminAuth, adminController.showMessages);
router.post('/messages/reply/:id', checkAdminAuth, adminController.replyMessage);
router.post('/messages/delete/:id', checkAdminAuth, adminController.deleteMessage);
router.post('/messages/mark-read/:id', checkAdminAuth, adminController.markMessageAsRead);

// 日志相关路由
router.get('/logs', checkAdminAuth, adminController.showLogs);
router.get('/api/logs/normal', checkAdminAuth, adminController.getNormalLogs);
router.get('/api/logs/advanced', checkAdminAuth, adminController.getAdvancedLogs);
router.post('/api/logs/normal/clear', checkAdminAuth, adminController.clearNormalLogs);
router.post('/api/logs/advanced/clear', checkAdminAuth, adminController.clearAdvancedLogs);
router.get('/api/logs/normal/download', checkAdminAuth, adminController.downloadNormalLogs);
router.get('/api/logs/advanced/download', checkAdminAuth, adminController.downloadAdvancedLogs);
router.get('/api/logs/analyze', checkAdminAuth, adminController.analyzeLogs);
router.get('/api/logs/analysis/download', checkAdminAuth, adminController.downloadLogAnalysis);

// 设置相关路由
router.get('/settings', checkAdminAuth, adminController.showSettings);
router.post('/api/settings/basic', checkAdminAuth, adminController.updateBasicSettings);
router.post('/api/settings/security', checkAdminAuth, adminController.updateSecuritySettings);
router.post('/api/settings/log', checkAdminAuth, adminController.updateLogSettings);
router.post('/api/settings/email', checkAdminAuth, adminController.updateEmailSettings);
router.post('/api/settings/test-email', checkAdminAuth, adminController.testEmailSettings);

module.exports = router; 