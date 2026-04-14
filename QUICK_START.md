# WebChat - 快速启动指南（无 Docker 版本）

## 🚀 快速启动

### 前置要求

- **Java 17** 或更高版本
- **Maven 3.8+**
- **MySQL 8.0+**（本地安装）
- **Node.js 20+**

### 第一步：准备 MySQL 数据库

#### 方式一：使用现有 MySQL

如果您已经安装了 MySQL，只需确保服务正在运行：

**Windows:**
```cmd
# 检查 MySQL 服务状态
net start | findstr MySQL

# 如果未启动，启动 MySQL 服务
net start MySQL80
```

**Linux/macOS:**
```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 启动 MySQL 服务
sudo systemctl start mysql
```

#### 方式二：修改数据库配置

编辑 `server/src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/webchat?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root          # 修改为您的 MySQL 用户名
    password: root          # 修改为您的 MySQL 密码
```

**注意：** 数据库 `webchat` 会自动创建，无需手动创建！

### 第二步：启动后端服务

```bash
cd server

# 首次运行：安装依赖
mvn clean install

# 启动应用
mvn spring-boot:run
```

**或者使用 IDE：**
1. 使用 IntelliJ IDEA 打开 `server` 目录
2. 等待 Maven 依赖下载完成
3. 找到 `WebChatApplication.java`
4. 右键点击 → Run 'WebChatApplication'

**验证后端启动成功：**
- 访问 http://localhost:3000/api/auth/health
- 应该返回：`OK`

### 第三步：启动前端应用

```bash
cd client

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:1420 即可使用！

## 📝 配置说明

### MySQL 数据库配置

**默认配置：**
- 主机：localhost
- 端口：3306
- 数据库：webchat（自动创建）
- 用户名：root
- 密码：root

**如果您的 MySQL 配置不同，请修改 `application.yml`：**

```yaml
spring:
  datasource:
    url: jdbc:mysql://YOUR_HOST:YOUR_PORT/webchat?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Shanghai
    username: YOUR_USERNAME
    password: YOUR_PASSWORD
```

### 数据库表结构

应用启动时会自动创建以下表：
- `users` - 用户表
- `conversations` - 会话表
- `conversation_members` - 会话成员表
- `messages` - 消息表
- `message_read_status` - 消息已读状态表

## 🧪 测试功能

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "password123"
  }'
```

### 2. 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "password123"
  }'
```

### 3. 使用前端界面

1. 打开浏览器访问 http://localhost:1420
2. 注册新用户
3. 登录
4. 开始聊天！

## 🐛 常见问题

### 1. MySQL 连接失败

**错误信息：** `Communications link failure`

**解决方案：**
- 确保 MySQL 服务正在运行
- 检查用户名和密码是否正确
- 检查 MySQL 端口是否为 3306

### 2. 端口被占用

**错误信息：** `Port 3000 is already in use`

**解决方案：**
修改 `application.yml` 中的端口：
```yaml
server:
  port: 8080  # 改为其他端口
```

### 3. Maven 依赖下载慢

**解决方案：**
配置阿里云镜像（`~/.m2/settings.xml`）：
```xml
<mirrors>
  <mirror>
    <id>aliyun</id>
    <mirrorOf>central</mirrorOf>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

### 4. 数据库权限问题

**错误信息：** `Access denied for user 'root'@'localhost'`

**解决方案：**
```sql
-- 登录 MySQL
mysql -u root -p

-- 创建新用户并授权
CREATE USER 'webchat'@'localhost' IDENTIFIED BY 'webchat123';
GRANT ALL PRIVILEGES ON webchat.* TO 'webchat'@'localhost';
FLUSH PRIVILEGES;
```

然后修改 `application.yml`：
```yaml
spring:
  datasource:
    username: webchat
    password: webchat123
```

## 📦 打包部署

### 后端打包

```bash
cd server
mvn clean package -DskipTests

# 生成的 JAR 文件
target/webchat-server-1.0.0.jar

# 运行
java -jar target/webchat-server-1.0.0.jar
```

### 前端打包

```bash
cd client
npm run tauri:build

# Windows: 生成 .msi 安装包
# macOS: 生成 .dmg 安装包
```

## 🎯 项目特点

- ✅ **无需 Docker**：直接使用本地 MySQL
- ✅ **一键启动**：运行 main 方法即可
- ✅ **自动建表**：Hibernate 自动创建数据库表
- ✅ **开发友好**：热重载、详细日志
- ✅ **生产就绪**：可直接打包部署

## 📚 技术栈

- **后端**：Java 17 + Spring Boot 3.2
- **数据库**：MySQL 8.0
- **前端**：React 18 + TypeScript + Tauri
- **认证**：JWT + Spring Security
- **实时通讯**：WebSocket (STOMP)

---

**现在您可以直接运行 Java main 方法启动项目了！** 🎉

不需要 Docker，只需要本地 MySQL 即可！
