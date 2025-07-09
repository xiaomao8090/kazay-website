#!/bin/bash

# 确保脚本在错误时停止
set -e

# 显示当前目录
echo "当前目录: $(pwd)"

# 安装依赖
echo "安装依赖..."
npm install --production

# 检查是否安装了PM2
if ! command -v pm2 &> /dev/null; then
    echo "PM2未安装，正在全局安装PM2..."
    npm install -g pm2
fi

# 停止之前的实例（如果存在）
echo "停止之前的实例（如果存在）..."
pm2 stop kazay-website 2>/dev/null || true
pm2 delete kazay-website 2>/dev/null || true

# 启动应用
echo "使用PM2启动应用..."
pm2 start ecosystem.config.js --env production

# 保存PM2进程列表
echo "保存PM2进程列表..."
pm2 save

# 显示运行状态
echo "显示运行状态..."
pm2 status

echo "应用已成功启动！"
echo "访问 http://localhost:3001 查看网站" 