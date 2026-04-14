# WebChat 开发指南

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

**Windows:**
```bash
start-dev.bat
```

**Linux/macOS:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 方式二：手动启动

1. **启动 Docker 服务**
```bash
docker compose up -d
```

2. **启动后端服务**
```bash
cd server
mvn clean install
mvn spring-boot:run
```

3. **启动前端应用**
```bash
cd client
npm install
npm run dev
```

## 📋 开发流程

### 1. 后端开发

#### 项目结构
```
server/
├── src/main/java/com/webchat/
│   ├── config/          # 配置类（CORS、WebSocket、Security）
│   ├── controller/      # REST API 控制器
│   ├── dto/            # 数据传输对象
│   ├── entity/         # JPA 实体类
│   ├── repository/     # 数据访问层
│   ├── security/       # JWT 认证
│   ├── service/        # 业务逻辑
│   └── websocket/      # WebSocket 事件处理
└── src/main/resources/
    └── application.yml  # 应用配置
```

#### 常用命令
```bash
# 编译项目
mvn clean compile

# 运行测试
mvn test

# 打包（生成 JAR）
mvn clean package

# 运行应用
mvn spring-boot:run

# 跳过测试打包
mvn clean package -DskipTests
```

#### API 端点

**认证接口**
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/health` - 健康检查

**消息接口**
- `POST /api/messages` - 发送消息
- `GET /api/messages/conversation/{id}` - 获取会话消息

**会话接口**
- `GET /api/conversations` - 获取用户会话列表
- `POST /api/conversations/group` - 创建群组
- `POST /api/conversations/private/{userId}` - 创建私聊

**WebSocket**
- `ws://localhost:3000/ws` - WebSocket 连接端点
- `/topic/conversation/{id}` - 订阅会话消息

### 2. 前端开发

#### 项目结构
```
client/
├── src/
│   ├── components/     # React 组件
│   ├── services/       # API 和 WebSocket 服务
│   ├── stores/         # Zustand 状态管理
│   ├── App.tsx         # 应用入口
│   └── main.tsx        # React 入口
└── src-tauri/          # Tauri 配置
```

#### 常用命令
```bash
# 安装依赖
npm install

# 启动开发服务器（Web 模式）
npm run dev

# 启动 Tauri 桌面应用
npm run tauri:dev

# 构建生产版本
npm run build

# 打包桌面应用
npm run tauri:build
```

### 3. 数据库管理

#### 查看数据库
```bash
# 使用 psql 连接
docker exec -it webchat-postgres psql -U webchat_user -d webchat

# 常用 SQL 命令
\dt              # 列出所有表
\d users         # 查看 users 表结构
SELECT * FROM users;  # 查询用户
```

#### Redis 管理
```bash
# 连接 Redis
docker exec -it webchat-redis redis-cli

# 常用命令
KEYS *           # 查看所有键
GET key          # 获取值
DEL key          # 删除键
```

#### MinIO 管理
访问 http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin

## 🧪 测试

### 后端测试
```bash
cd server
mvn test
```

### 前端测试
```bash
cd client
npm test
```

### API 测试（使用 curl）

**注册用户**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**登录**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**发送消息（需要 JWT Token）**
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "conversationId": "uuid-here",
    "content": "Hello World",
    "type": "TEXT"
  }'
```

## 🐛 常见问题

### 1. 端口被占用
```bash
# Windows 查看端口占用
netstat -ano | findstr :3000

# Linux/macOS 查看端口占用
lsof -i :3000

# 修改端口（application.yml）
server:
  port: 8080
```

### 2. Docker 服务无法启动
```bash
# 查看日志
docker compose logs postgres
docker compose logs redis
docker compose logs minio

# 重启服务
docker compose restart

# 完全重建
docker compose down -v
docker compose up -d
```

### 3. Maven 依赖下载慢
在 `~/.m2/settings.xml` 添加阿里云镜像：
```xml
<mirrors>
  <mirror>
    <id>aliyun</id>
    <mirrorOf>central</mirrorOf>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

### 4. 数据库连接失败
检查 Docker 服务是否运行：
```bash
docker compose ps
```

确保 `application.yml` 中的数据库配置正确。

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
# 文件位于 src-tauri/target/release/bundle/
```

## 🔧 开发技巧

### 1. 热重载
- 后端：使用 `spring-boot-devtools` 自动重启
- 前端：Vite 自动热更新

### 2. 调试
- 后端：在 IDE 中设置断点，使用 Debug 模式运行
- 前端：使用浏览器开发者工具

### 3. 日志
- 后端：查看控制台输出或 `logs/` 目录
- 前端：浏览器控制台

## 📚 学习资源

- [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
- [Spring WebSocket 文档](https://docs.spring.io/spring-framework/reference/web/websocket.html)
- [React 官方文档](https://react.dev/)
- [Tauri 官方文档](https://tauri.app/)

## 🎯 下一步开发计划

- [ ] 实现文件上传功能（MinIO）
- [ ] 实现消息已读/未读状态
- [ ] 实现 @提醒功能
- [ ] 实现消息搜索
- [ ] 添加表情包支持
- [ ] 实现视频通话功能
- [ ] 优化性能和用户体验

---

**祝开发顺利！** 🚀
