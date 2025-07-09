const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

// 日志目录
const LOG_DIR = path.join(__dirname, '../logs');
const NORMAL_LOG_DIR = path.join(LOG_DIR, 'normal');
const ADVANCED_LOG_DIR = path.join(LOG_DIR, 'advanced');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(NORMAL_LOG_DIR)) {
  fs.mkdirSync(NORMAL_LOG_DIR, { recursive: true });
}
if (!fs.existsSync(ADVANCED_LOG_DIR)) {
  fs.mkdirSync(ADVANCED_LOG_DIR, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug',
  SUCCESS: 'success'
};

// 高级日志类型
const LOG_TYPES = {
  SYSTEM: 'system',
  SECURITY: 'security',
  ACCESS: 'access',
  ERROR: 'error'
};

// 日志格式
const LOG_FORMATS = {
  SIMPLE: 'simple',
  DETAILED: 'detailed',
  JSON: 'json'
};

// 默认设置
let settings = {
  enableNormalLog: true,
  enableAdvancedLog: true,
  logLevel: LOG_LEVELS.INFO,
  logRetention: 30, // 天
  enableLogRotation: true,
  logFormat: LOG_FORMATS.DETAILED
};

/**
 * 更新日志设置
 * @param {Object} newSettings 新的日志设置
 */
function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
}

/**
 * 获取当前日志文件路径
 * @param {boolean} isAdvanced 是否为高级日志
 * @returns {string} 日志文件路径
 */
function getCurrentLogFile(isAdvanced = false) {
  const date = moment().format('YYYY-MM-DD');
  const dir = isAdvanced ? ADVANCED_LOG_DIR : NORMAL_LOG_DIR;
  return path.join(dir, `${date}.log`);
}

/**
 * 检查日志级别是否应该被记录
 * @param {string} level 日志级别
 * @returns {boolean} 是否应该记录
 */
function shouldLog(level) {
  const levels = Object.values(LOG_LEVELS);
  const currentLevelIndex = levels.indexOf(settings.logLevel);
  const targetLevelIndex = levels.indexOf(level);
  
  // 如果目标级别小于等于当前设置级别，则记录
  return targetLevelIndex <= currentLevelIndex;
}

/**
 * 格式化日志消息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} details 详细信息
 * @returns {string} 格式化后的日志消息
 */
function formatLogMessage(level, message, details = null) {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  
  switch (settings.logFormat) {
    case LOG_FORMATS.SIMPLE:
      return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    case LOG_FORMATS.JSON:
      return JSON.stringify({
        timestamp,
        level,
        message,
        details: details || undefined
      }) + '\n';
    
    case LOG_FORMATS.DETAILED:
    default:
      let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      if (details) {
        logMessage += `  Details: ${JSON.stringify(details, null, 2)}\n`;
      }
      return logMessage;
  }
}

/**
 * 写入日志到文件
 * @param {string} filePath 文件路径
 * @param {string} message 日志消息
 */
function writeToFile(filePath, message) {
  fs.appendFileSync(filePath, message);
}

/**
 * 记录普通日志
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 */
function normalLog(level, message) {
  if (!settings.enableNormalLog || !shouldLog(level)) {
    return;
  }
  
  const logFile = getCurrentLogFile(false);
  const formattedMessage = formatLogMessage(level, message);
  writeToFile(logFile, formattedMessage);
}

/**
 * 记录高级日志
 * @param {string} type 日志类型
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} details 详细信息
 */
function advancedLog(type, level, message, details = null) {
  if (!settings.enableAdvancedLog || !shouldLog(level)) {
    return;
  }
  
  const logFile = getCurrentLogFile(true);
  const formattedMessage = formatLogMessage(level, `[${type}] ${message}`, details);
  writeToFile(logFile, formattedMessage);
}

/**
 * 获取日志文件列表
 * @param {boolean} isAdvanced 是否为高级日志
 * @returns {Array} 日志文件列表
 */
function getLogFiles(isAdvanced = false) {
  const dir = isAdvanced ? ADVANCED_LOG_DIR : NORMAL_LOG_DIR;
  
  try {
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        date: file.replace('.log', ''),
        size: fs.statSync(path.join(dir, file)).size
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('获取日志文件列表失败:', error);
    return [];
  }
}

/**
 * 读取日志内容
 * @param {string} date 日期 (YYYY-MM-DD)
 * @param {boolean} isAdvanced 是否为高级日志
 * @param {Object} filters 过滤条件
 * @returns {Array} 日志内容
 */
function readLogs(date, isAdvanced = false, filters = {}) {
  const dir = isAdvanced ? ADVANCED_LOG_DIR : NORMAL_LOG_DIR;
  const filePath = path.join(dir, `${date}.log`);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 解析日志行
    const logs = lines.map(line => {
      try {
        if (settings.logFormat === LOG_FORMATS.JSON) {
          return JSON.parse(line);
        } else {
          // 解析普通格式日志
          const timestampMatch = line.match(/\[(.*?)\]/);
          const levelMatch = line.match(/\[([A-Z]+)\]/);
          
          let timestamp = '';
          let level = '';
          let message = line;
          let type = '';
          let details = null;
          
          if (timestampMatch && timestampMatch[1]) {
            timestamp = timestampMatch[1];
            message = message.replace(timestampMatch[0], '').trim();
          }
          
          if (levelMatch && levelMatch[1]) {
            level = levelMatch[1].toLowerCase();
            message = message.replace(levelMatch[0], '').trim();
          }
          
          // 对于高级日志，解析类型
          if (isAdvanced) {
            const typeMatch = message.match(/\[(.*?)\]/);
            if (typeMatch && typeMatch[1]) {
              type = typeMatch[1].toLowerCase();
              message = message.replace(typeMatch[0], '').trim();
            }
            
            // 尝试解析详细信息
            const detailsMatch = message.match(/Details: (.*)/);
            if (detailsMatch && detailsMatch[1]) {
              try {
                details = JSON.parse(detailsMatch[1]);
                message = message.replace(detailsMatch[0], '').trim();
              } catch (e) {
                // 解析详细信息失败，忽略
              }
            }
          }
          
          return {
            timestamp,
            level,
            type: type || 'general',
            message,
            details
          };
        }
      } catch (e) {
        // 解析失败，返回原始行
        return {
          timestamp: '',
          level: 'unknown',
          type: 'unknown',
          message: line,
          details: null
        };
      }
    });
    
    // 应用过滤条件
    return logs.filter(log => {
      // 级别过滤
      if (filters.level && filters.level !== 'all' && log.level !== filters.level) {
        return false;
      }
      
      // 类型过滤（仅适用于高级日志）
      if (isAdvanced && filters.type && filters.type !== 'all' && log.type !== filters.type) {
        return false;
      }
      
      // 搜索过滤
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  } catch (error) {
    console.error('读取日志内容失败:', error);
    return [];
  }
}

/**
 * 获取指定日期范围内的日志
 * @param {boolean} isAdvanced 是否为高级日志
 * @param {Object} filters 过滤条件
 * @returns {Array} 日志内容
 */
function getLogs(isAdvanced = false, filters = {}) {
  // 处理日期过滤
  let dates = [];
  const today = moment().format('YYYY-MM-DD');
  
  if (filters.date) {
    switch (filters.date) {
      case 'today':
        dates = [today];
        break;
      case 'yesterday':
        dates = [moment().subtract(1, 'days').format('YYYY-MM-DD')];
        break;
      case 'last7days':
        for (let i = 0; i < 7; i++) {
          dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }
        break;
      case 'last30days':
        for (let i = 0; i < 30; i++) {
          dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }
        break;
      default:
        dates = [today];
    }
  } else if (filters.startDate && filters.endDate) {
    // 自定义日期范围
    const start = moment(filters.startDate);
    const end = moment(filters.endDate);
    const days = end.diff(start, 'days') + 1;
    
    for (let i = 0; i < days; i++) {
      dates.push(moment(filters.startDate).add(i, 'days').format('YYYY-MM-DD'));
    }
  } else {
    // 默认今天
    dates = [today];
  }
  
  // 获取所有日期的日志
  let allLogs = [];
  dates.forEach(date => {
    const logs = readLogs(date, isAdvanced, filters);
    allLogs = [...allLogs, ...logs];
  });
  
  // 按时间戳排序
  return allLogs.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

/**
 * 清除日志
 * @param {boolean} isAdvanced 是否为高级日志
 * @param {string} date 指定日期，如果不指定则清除所有
 */
function clearLogs(isAdvanced = false, date = null) {
  const dir = isAdvanced ? ADVANCED_LOG_DIR : NORMAL_LOG_DIR;
  
  try {
    if (date) {
      // 清除指定日期的日志
      const filePath = path.join(dir, `${date}.log`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      // 清除所有日志
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(dir, file));
        }
      });
    }
    return true;
  } catch (error) {
    console.error('清除日志失败:', error);
    return false;
  }
}

/**
 * 轮换旧日志文件
 */
async function rotateOldLogs() {
  if (!settings.enableLogRotation) {
    return;
  }
  
  const pipelineAsync = promisify(pipeline);
  const cutoffDate = moment().subtract(settings.logRetention, 'days');
  
  // 处理普通日志
  const normalFiles = getLogFiles(false);
  for (const file of normalFiles) {
    const fileDate = moment(file.date);
    if (fileDate.isBefore(cutoffDate)) {
      try {
        // 压缩日志文件
        const gzipFilePath = `${file.path}.gz`;
        const source = fs.createReadStream(file.path);
        const destination = fs.createWriteStream(gzipFilePath);
        const gzip = createGzip();
        
        await pipelineAsync(source, gzip, destination);
        
        // 删除原始日志文件
        fs.unlinkSync(file.path);
        console.log(`已轮换日志文件: ${file.name}`);
      } catch (error) {
        console.error(`轮换日志文件失败: ${file.name}`, error);
      }
    }
  }
  
  // 处理高级日志
  const advancedFiles = getLogFiles(true);
  for (const file of advancedFiles) {
    const fileDate = moment(file.date);
    if (fileDate.isBefore(cutoffDate)) {
      try {
        // 压缩日志文件
        const gzipFilePath = `${file.path}.gz`;
        const source = fs.createReadStream(file.path);
        const destination = fs.createWriteStream(gzipFilePath);
        const gzip = createGzip();
        
        await pipelineAsync(source, gzip, destination);
        
        // 删除原始日志文件
        fs.unlinkSync(file.path);
        console.log(`已轮换高级日志文件: ${file.name}`);
      } catch (error) {
        console.error(`轮换高级日志文件失败: ${file.name}`, error);
      }
    }
  }
}

/**
 * 分析日志数据
 * @returns {Object} 分析结果
 */
function analyzeLogs() {
  // 获取最近30天的高级日志
  const filters = {
    date: 'last30days'
  };
  const logs = getLogs(true, filters);
  
  // 统计各种级别的日志数量
  const counts = {
    error: 0,
    warning: 0,
    info: 0,
    success: 0
  };
  
  logs.forEach(log => {
    if (counts[log.level] !== undefined) {
      counts[log.level]++;
    }
  });
  
  // 统计常见错误
  const errorMessages = {};
  logs.filter(log => log.level === 'error').forEach(log => {
    const message = log.message.trim();
    if (!errorMessages[message]) {
      errorMessages[message] = 0;
    }
    errorMessages[message]++;
  });
  
  const commonErrors = Object.keys(errorMessages)
    .map(message => ({ message, count: errorMessages[message] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // 按日期统计访问量
  const accessByDate = {};
  logs.filter(log => log.type === 'access').forEach(log => {
    const date = log.timestamp.split(' ')[0];
    if (!accessByDate[date]) {
      accessByDate[date] = 0;
    }
    accessByDate[date]++;
  });
  
  // 按小时统计访问量
  const accessByHour = {};
  logs.filter(log => log.type === 'access').forEach(log => {
    const hour = log.timestamp.split(' ')[1].split(':')[0];
    if (!accessByHour[hour]) {
      accessByHour[hour] = 0;
    }
    accessByHour[hour]++;
  });
  
  return {
    counts,
    commonErrors,
    accessByDate,
    accessByHour
  };
}

// 导出日志级别和类型常量
module.exports = {
  LOG_LEVELS,
  LOG_TYPES,
  LOG_FORMATS,
  
  // 普通日志方法
  error: (message) => normalLog(LOG_LEVELS.ERROR, message),
  warning: (message) => normalLog(LOG_LEVELS.WARNING, message),
  info: (message) => normalLog(LOG_LEVELS.INFO, message),
  debug: (message) => normalLog(LOG_LEVELS.DEBUG, message),
  success: (message) => normalLog(LOG_LEVELS.SUCCESS, message),
  
  // 高级日志方法
  system: {
    error: (message, details) => advancedLog(LOG_TYPES.SYSTEM, LOG_LEVELS.ERROR, message, details),
    warning: (message, details) => advancedLog(LOG_TYPES.SYSTEM, LOG_LEVELS.WARNING, message, details),
    info: (message, details) => advancedLog(LOG_TYPES.SYSTEM, LOG_LEVELS.INFO, message, details),
    debug: (message, details) => advancedLog(LOG_TYPES.SYSTEM, LOG_LEVELS.DEBUG, message, details),
    success: (message, details) => advancedLog(LOG_TYPES.SYSTEM, LOG_LEVELS.SUCCESS, message, details)
  },
  
  security: {
    error: (message, details) => advancedLog(LOG_TYPES.SECURITY, LOG_LEVELS.ERROR, message, details),
    warning: (message, details) => advancedLog(LOG_TYPES.SECURITY, LOG_LEVELS.WARNING, message, details),
    info: (message, details) => advancedLog(LOG_TYPES.SECURITY, LOG_LEVELS.INFO, message, details),
    success: (message, details) => advancedLog(LOG_TYPES.SECURITY, LOG_LEVELS.SUCCESS, message, details)
  },
  
  access: {
    error: (message, details) => advancedLog(LOG_TYPES.ACCESS, LOG_LEVELS.ERROR, message, details),
    warning: (message, details) => advancedLog(LOG_TYPES.ACCESS, LOG_LEVELS.WARNING, message, details),
    info: (message, details) => advancedLog(LOG_TYPES.ACCESS, LOG_LEVELS.INFO, message, details),
    success: (message, details) => advancedLog(LOG_TYPES.ACCESS, LOG_LEVELS.SUCCESS, message, details)
  },
  
  // 管理方法
  updateSettings,
  getLogFiles,
  getLogs,
  clearLogs,
  rotateOldLogs,
  analyzeLogs
}; 