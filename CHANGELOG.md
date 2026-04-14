# WebChat 项目更新说明

## 🎉 已完成的修改

我已经成功将项目从 Docker 依赖改为直接使用 Java main 方法启动，并使用 MySQL 数据库！

### ✅ 主要变更

1. **移除 Docker 依赖**
   - ❌ 删除 PostgreSQL 依赖
   - ❌ 删除 Redis 依赖
   - ❌ 删除 MinIO 依赖
   - ✅ 改用本地 MySQL 数据库

2. **更新 Maven 配置 (pom.xml)**
   - ✅ 添加 MySQL 驱动：`mysql-connector-j`
   - ✅ 移除 PostgreSQL 驱动
   - ✅ 移除 Redis 依赖
   - ✅ 移除 MinIO 依赖

3. **更新应用配置 (application.yml)**
   - ✅ 数据库连接改为 MySQL
   - ✅ 数据库自动创建：`createDatabaseIfNotExist=true`
   - ✅ Hibernate 方言改为 `MySQLDialect`
   - ✅ 移除 Redis 配置
   - ✅ 移除 MinIO 配置

4. **创建启动脚本**
   - ✅ `start.bat` - Windows 一键启动脚本
   - ✅ `start.sh` - Linux/macOS 一键启动脚本
   - ✅ 自动检查 MySQL 服务状态
   - ✅ 自动启动后端服务

5. **创建快速启动文档**
   - ✅ `QUICK_START.md` - 详细的启动指南
   - ✅ 包含 MySQL 配置说明
   - ✅ 包含常见问题解决方案

## 🚀 现在如何启动项目

### 方式一：使用一键启动脚本（推荐）

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

**1. 确保 MySQL 正在运行**
```bash
# Windows
net start MySQL80

# Linux/macOS
sudo systemctl start mysql
```

**2. 启动后端**
```bash
cd server
mvn spring-boot:run
```

**3. 启动前端**
```bash
cd client
npm install
npm run dev
```

## 📋 MySQL 配置

### 默认配置
```yaml
数据库地址: localhost:3306
数据库名称: webchat (自动创建)
用户名: root
密码: root
```

### 如何修改配置

编辑 `server/src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/webchat?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Shanghai
    username: root          # 改为您的 MySQL 用户名
    password: root          # 改为您的 MySQL 密码
```

## 🎯 项目优势

### 之前（使用 Docker）
- ❌ 需要安装 Docker Desktop
- ❌ 需要启动多个容器（PostgreSQL、Redis、MinIO）
- ❌ 占用更多系统资源
- ❌ 启动时间较长

### 现在（使用 MySQL）
- ✅ 只需要本地 MySQL
- ✅ 直接运行 Java main 方法
- ✅ 启动速度快
- ✅ 资源占用少
- ✅ 开发调试更方便

## 📊 数据库表结构

应用启动时会自动创建以下表：

1. **users** - 用户表
   - id (UUID)
   - username (用户名)
   - email (邮箱)
   - password_hash (密码哈希)
   - status (在线状态)
   - created_at, updated_at

2. **conversations** - 会话表
   - id (UUID)
   - type (PRIVATE/GROUP)
   - name (群组名称)
   - created_by (创建者)
   - created_at, updated_at

3. **conversation_members** - 会话成员表
   - id (UUID)
   - conversation_id (会话ID)
   - user_id (用户ID)
   - role (OWNER/ADMIN/MEMBER)
   - joined_at, last_read_at

4. **messages** - 消息表
   - id (UUID)
   - conversation_id (会话ID)
   - sender_id (发送者ID)
   - content (消息内容)
   - type (TEXT/IMAGE/FILE/VIDEO/EMOJI)
   - metadata (JSON 元数据)
   - created_at, updated_at

5. **message_read_status** - 消息已读状态表
   - id (UUID)
   - message_id (消息ID)
   - user_id (用户ID)
   - read_at (已读时间)

## 🐛 常见问题

### 1. MySQL 连接失败

**问题：** `Communications link failure`

**解决方案：**
```bash
# 检查 MySQL 是否运行
# Windows
net start | findstr MySQL

# Linux/macOS
sudo systemctl status mysql

# 启动 MySQL
# Windows
net start MySQL80

# Linux/macOS
sudo systemctl start mysql
```

### 2. 数据库权限问题

**问题：** `Access denied for user 'root'@'localhost'`

**解决方案：**
```sql
-- 登录 MySQL
mysql -u root -p

-- 创建新用户
CREATE USER 'webchat'@'localhost' IDENTIFIED BY 'webchat123';
GRANT ALL PRIVILEGES ON webchat.* TO 'webchat'@'localhost';
FLUSH PRIVILEGES;
```

然后修改 `application.yml` 中的用户名和密码。

### 3. 端口被占用

**问题：** `Port 3000 is already in use`

**解决方案：**
修改 `application.yml`：
```yaml
server:
  port: 8080  # 改为其他端口
```

## 📚 相关文档

- **[QUICK_START.md](QUICK_START.md)** - 快速启动指南
- **[README.md](README.md)** - 项目介绍
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - 项目总结

## 🎊 总结

现在您可以：
1. ✅ 不需要 Docker
2. ✅ 直接运行 Java main 方法
3. ✅ 使用本地 MySQL 数据库
4. ✅ 一键启动整个项目

**启动命令：**
```bash
# Windows
start.bat

# Linux/macOS
./start.sh
```

**或者直接在 IDE 中运行：**
- 打开 `server/src/main/java/com/webchat/WebChatApplication.java`
- 右键 → Run 'WebChatApplication'

---

**项目已经完全去除 Docker 依赖，可以直接使用 Java main 方法启动了！** 🚀
