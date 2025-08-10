# 石耳个人网站

这是陈科瑾的个人网站项目，包含前端静态页面和后端AI聊天功能。

## 项目概述

**主角：** 陈科瑾 - AI应用开发工程师  
**目标：** 展示个人技能、项目经验，并提供AI助手聊天功能  
**架构：** 前端托管在GitHub Pages，后端部署在阿里云函数计算

## 项目结构

```
riaishere.github.io/
├── index.html          # 前端页面（GitHub Pages）
├── index.js            # 阿里云FC后端函数
├── package.json        # Node.js依赖配置
├── template.yml        # 阿里云FC部署配置
└── README.md           # 项目说明
```

## 功能特性

### 前端功能
- 🏠 **响应式个人主页** - 适配桌面和移动设备
- 👨‍💻 **个人介绍区域** - 展示技能和背景
- 💬 **AI聊天助手** - 与访客实时对话
- 🚀 **项目展示** - 作品集和技术栈
- 📧 **联系方式** - 邮箱和社交媒体

### 后端功能
- 🤖 **AI聊天API** - 基于DeepSeek大语言模型
- 🔄 **智能降级** - API失败时自动切换到模拟回复
- 🌐 **CORS支持** - 跨域访问配置
- ⚡ **高性能** - 阿里云函数计算无服务器架构

## 技术栈

**前端技术：**
- HTML5, CSS3, JavaScript
- 响应式设计，现代化UI
- 平滑滚动，动画效果

**后端技术：**
- Node.js 14+
- 阿里云函数计算 (FC)
- DeepSeek AI API
- RESTful API设计

## 部署说明

### 前端部署（GitHub Pages）

1. **确保仓库设置正确：**
   - 仓库名必须是：`riaishere.github.io`
   - 推送代码到 `main` 分支

2. **启用GitHub Pages：**
   ```bash
   # 推送代码
   git add .
   git commit -m "更新个人网站"
   git push origin main
   ```

3. **访问网站：**
   - 网址：https://riaishere.github.io

### 后端部署（阿里云FC）

1. **安装部署工具：**
   ```bash
   # 安装阿里云CLI
   npm install -g @alicloud/fun

   # 配置阿里云账号
   fun config
   ```

2. **配置环境变量：**
   - 在阿里云FC控制台设置 `DEEPSEEK_API_KEY`
   - 或在 `template.yml` 中配置

3. **部署函数：**
   ```bash
   # 安装依赖
   npm install

   # 部署到阿里云
   fun deploy
   ```

4. **获取函数URL：**
   - 部署完成后会得到函数访问URL
   - 更新前端HTML中的API地址

## 配置说明

### 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek AI API密钥 | 可选 |
| `OPENAI_API_KEY` | OpenAI API密钥（备选） | 可选 |

### API接口

**聊天接口：**
```
POST /api/chat
Content-Type: application/json

{
  "message": "用户消息"
}
```

**响应格式：**
```json
{
  "success": true,
  "reply": "AI回复内容",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 本地开发

1. **克隆项目：**
   ```bash
   git clone https://github.com/riaishere/riaishere.github.io.git
   cd riaishere.github.io
   ```

2. **安装依赖：**
   ```bash
   npm install
   ```

3. **本地运行：**
   ```bash
   # 启动本地服务器
   npm start
   ```

4. **测试功能：**
   - 直接打开 `index.html` 查看前端
   - 使用 `fun local start` 测试FC函数

## 更新记录

### v1.0.0 (2024-01-01)
- ✅ 完整的个人网站MVP
- ✅ AI聊天助手功能
- ✅ 响应式设计
- ✅ 阿里云FC部署
- ✅ GitHub Pages托管

## 联系方式

- **姓名：** 陈科瑾
- **职位：** AI应用开发工程师
- **邮箱：** chekj@epsoft.com.cn
- **网站：** https://riaishere.github.io
- **GitHub：** https://github.com/riaishere

## 许可证

MIT License - 详见 LICENSE 文件

---

> Built with ❤️ and AI by 陈科瑾
