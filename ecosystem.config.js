module.exports = {
  apps: [{
    name: "kazay-website",
    script: "app.js",
    instances: 1, // 改为单进程模式
    exec_mode: "fork", // 改为fork模式
    env: {
      NODE_ENV: "production",
      EMAIL_USER: "xiaomao8090@gmail.com",
      EMAIL_PASS: "xgof hyjx xuau hstg", // 新的应用密码
      SESSION_SECRET: "kazay-secret-key-123456",
      PORT: 3001
    }
  }]
}; 