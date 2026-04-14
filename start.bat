@echo off
echo ========================================
echo   WebChat 一键启动脚本（无 Docker）
echo ========================================
echo.

REM 检查 MySQL 是否运行
echo [1/3] 检查 MySQL 服务...
sc query MySQL80 | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL 服务未运行
    echo 正在尝试启动 MySQL 服务...
    net start MySQL80 >nul 2>&1
    if errorlevel 1 (
        echo ❌ 无法启动 MySQL 服务，请手动启动
        echo 提示：可以使用命令 "net start MySQL80"
        pause
        exit /b 1
    )
    echo ✅ MySQL 服务已启动
) else (
    echo ✅ MySQL 服务正在运行
)

echo.
echo [2/3] 启动后端服务...
echo 正在编译并启动 Spring Boot 应用...
cd server
start "WebChat Backend" cmd /k "mvn spring-boot:run"

echo.
echo [3/3] 等待后端启动...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo 📝 访问地址：
echo   - 后端 API: http://localhost:3000
echo   - 健康检查: http://localhost:3000/api/auth/health
echo.
echo 💡 下一步：
echo   1. 打开新的命令行窗口
echo   2. cd client
echo   3. npm install (首次运行)
echo   4. npm run dev
echo.
echo 按任意键退出...
pause >nul
