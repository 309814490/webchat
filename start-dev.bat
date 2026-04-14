@echo off
echo 🚀 启动 WebChat 开发环境...

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未运行，请先启动 Docker
    exit /b 1
)

REM 启动数据库和存储服务
echo 📦 启动 PostgreSQL、Redis、MinIO...
docker compose up -d

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo ✅ 检查服务状态...
docker compose ps

echo.
echo 🎉 开发环境启动完成！
echo.
echo 📝 下一步：
echo   1. 启动后端: cd server ^&^& mvn spring-boot:run
echo   2. 启动前端: cd client ^&^& npm run dev
echo.
