#!/bin/bash

echo "========================================"
echo "  WebChat 一键启动脚本（无 Docker）"
echo "========================================"
echo ""

# 检查 MySQL 是否运行
echo "[1/3] 检查 MySQL 服务..."
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet mysql; then
        echo "✅ MySQL 服务正在运行"
    else
        echo "❌ MySQL 服务未运行"
        echo "正在尝试启动 MySQL 服务..."
        sudo systemctl start mysql
        if [ $? -eq 0 ]; then
            echo "✅ MySQL 服务已启动"
        else
            echo "❌ 无法启动 MySQL 服务，请手动启动"
            exit 1
        fi
    fi
elif command -v service &> /dev/null; then
    if service mysql status &> /dev/null; then
        echo "✅ MySQL 服务正在运行"
    else
        echo "❌ MySQL 服务未运行，请手动启动"
        exit 1
    fi
else
    echo "⚠️  无法检测 MySQL 状态，假设已运行"
fi

echo ""
echo "[2/3] 启动后端服务..."
echo "正在编译并启动 Spring Boot 应用..."
cd server
mvn spring-boot:run &

echo ""
echo "[3/3] 等待后端启动..."
sleep 10

echo ""
echo "========================================"
echo "  启动完成！"
echo "========================================"
echo ""
echo "📝 访问地址："
echo "  - 后端 API: http://localhost:3000"
echo "  - 健康检查: http://localhost:3000/api/auth/health"
echo ""
echo "💡 下一步："
echo "  1. 打开新的终端窗口"
echo "  2. cd client"
echo "  3. npm install (首次运行)"
echo "  4. npm run dev"
echo ""
