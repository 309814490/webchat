# WebChat - 多人即时通讯应用

一个基于 Tauri + React + Node.js 的跨平台即时通讯桌面应用。

## 功能特性

- ✅ 用户登录/注册
- ✅ 一对一私聊
- ✅ 群组聊天
- ✅ 多媒体消息（文本、图片、文件、视频、表情包）
- ✅ @提醒功能
- ✅ 消息已读/未读状态
- ✅ 消息搜索
- ✅ 实时消息推送

## 技术栈

### 前端
- Tauri 1.5 - 跨平台桌面应用框架
- React 18 - UI 框架
- TypeScript - 类型安全
- Tailwind CSS - 样式框架
- Socket.io-client - WebSocket 客户端
- Zustand - 状态管理

### 后端
- Node.js + Express - API 服务器
- Socket.io - WebSocket 服务器
- TypeScript - 类型安全
- Prisma - ORM
- PostgreSQL - 主数据库
- Redis - 缓存和消息队列
- MinIO - 文件存储

## 快速开始

### 前置要求

- Node.js 20.x 或更高版本
- Docker 和 Docker Compose
- Rust（用于 Tauri）

### 1. 启动开发环境

```bash
# 启动数据库和存储服务
docker compose up -d

# 验证服务运行
docker compose ps
```

### 2. 启动后端服务

```bash
cd server

# 安装依赖
npm install

# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 启动开发服务器
npm run dev
```

后端服务将在 http://localhost:3000 启动。

### 3. 启动前端应用

```bash
cd client

# 安装依赖
npm install

# 启动开发服务器（Web 模式）
npm run dev

# 或启动 Tauri 桌面应用
npm run tauri:dev
```

前端应用将在 http://localhost:1420 启动。

## 项目结构

```
webchat/
├── client/                 # Tauri 桌面客户端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── services/      # API 和 WebSocket 服务
│   │   └── App.tsx        # 应用入口
│   └── package.json
│
├── server/                 # Node.js 后端服务
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑
│   │   ├── socket/        # Socket.io 处理器
│   │   └── index.ts       # 服务器入口
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
├── shared/                 # 共享代码
└── docker-compose.yml     # 开发环境配置
```

## 开发指南

### 数据库管理

```bash
# 创建新的数据库迁移
npm run prisma:migrate

# 打开 Prisma Studio（数据库可视化工具）
npm run prisma:studio

# 重置数据库
npx prisma migrate reset
```

### 构建生产版本

```bash
# 构建后端
cd server
npm run build

# 构建前端桌面应用
cd client
npm run tauri:build
```

## 环境变量

### 后端 (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://webchat_user:webchat_password@localhost:5432/webchat
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
```

## 测试 Hello World Demo

1. 确保 Docker 服务已启动
2. 启动后端服务：`cd server && npm run dev`
3. 启动前端应用：`cd client && npm run dev`
4. 打开浏览器访问 http://localhost:1420
5. 打开多个浏览器窗口测试实时聊天功能

## 部署

详细的部署指南请参考 [部署文档](docs/deployment.md)。

## 学习资源

- [React 官方文档](https://react.dev/)
- [Tauri 官方文档](https://tauri.app/)
- [Socket.io 官方文档](https://socket.io/docs/)
- [Prisma 官方文档](https://www.prisma.io/docs/)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
