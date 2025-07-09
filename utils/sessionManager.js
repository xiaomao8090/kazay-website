// 简单的内存会话存储
const sessions = {};

// 验证码有效期（毫秒）
const CODE_EXPIRY = 30 * 60 * 1000; // 30分钟

// 最大会话数量限制，防止内存泄漏
const MAX_SESSIONS = 1000;

// 创建新会话
const createSession = (sessionId, data) => {
  // 检查会话数量是否超过限制
  const sessionCount = Object.keys(sessions).length;
  if (sessionCount >= MAX_SESSIONS) {
    // 清理最旧的会话
    cleanOldestSessions(Math.floor(MAX_SESSIONS * 0.2)); // 清理20%的旧会话
  }

  // 创建新会话
  sessions[sessionId] = {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + CODE_EXPIRY,
    lastAccessed: Date.now()
  };
  
  console.log(`创建会话: ${sessionId}, 用户: ${data.username}, IP: ${data.ipAddress || 'unknown'}`);
  return sessions[sessionId];
};

// 获取会话
const getSession = (sessionId) => {
  const session = sessions[sessionId];
  if (!session) {
    console.log(`会话不存在: ${sessionId}`);
    return null;
  }
  
  // 检查会话是否过期
  if (session.expiresAt < Date.now()) {
    console.log(`会话已过期: ${sessionId}, 用户: ${session.username}`);
    deleteSession(sessionId);
    return null;
  }
  
  // 更新最后访问时间
  session.lastAccessed = Date.now();
  return session;
};

// 更新会话
const updateSession = (sessionId, data) => {
  if (!sessions[sessionId]) {
    console.log(`尝试更新不存在的会话: ${sessionId}`);
    return null;
  }
  
  sessions[sessionId] = {
    ...sessions[sessionId],
    ...data,
    updatedAt: Date.now(),
    lastAccessed: Date.now()
  };
  
  console.log(`更新会话: ${sessionId}, 用户: ${sessions[sessionId].username}`);
  return sessions[sessionId];
};

// 删除会话
const deleteSession = (sessionId) => {
  if (sessions[sessionId]) {
    console.log(`删除会话: ${sessionId}, 用户: ${sessions[sessionId].username}`);
  }
  delete sessions[sessionId];
};

// 清理最旧的会话
const cleanOldestSessions = (count) => {
  console.log(`清理旧会话，数量: ${count}`);
  
  // 按最后访问时间排序
  const sortedSessions = Object.entries(sessions).sort((a, b) => 
    a[1].lastAccessed - b[1].lastAccessed
  );
  
  // 删除最旧的会话
  sortedSessions.slice(0, count).forEach(([sessionId]) => {
    deleteSession(sessionId);
  });
};

// 获取会话统计信息
const getSessionStats = () => {
  const now = Date.now();
  const total = Object.keys(sessions).length;
  const active = Object.values(sessions).filter(s => s.expiresAt > now).length;
  const expired = total - active;
  
  return {
    total,
    active,
    expired
  };
};

// 定期清理过期会话
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  Object.keys(sessions).forEach(sessionId => {
    if (sessions[sessionId].expiresAt < now) {
      deleteSession(sessionId);
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    console.log(`定期清理: 删除了 ${expiredCount} 个过期会话`);
  }
}, 60 * 1000); // 每分钟清理一次

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getSessionStats
}; 