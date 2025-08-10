# 王皓辰个人网站 - AI产品经理

这是一个基于阿里云函数计算（FC）构建的个人网站项目，展示AI产品经理王皓辰的专业背景、项目经验和获奖成就，并集成了AI数字分身聊天功能。

## 🌟 项目特点
- **现代化设计**: 科技感界面，专业展示
- **AI数字分身**: 基于王皓辰背景训练的AI聊天机器人
- **响应式布局**: 完美适配桌面、平板、手机
- **无服务器架构**: 基于阿里云函数计算的高效部署
- **作品展示**: 轮播展示个人项目和媒体采访
- **教育背景**: 详细的教育经历和获奖信息

## 💻 技术栈
- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: Node.js (阿里云函数计算 FC)
- **AI服务**: DeepSeek API
- **部署**: 阿里云函数计算 + 自定义域名
- **设计**: 响应式设计, CSS动画, 现代UI

## 🚀 本地开发

### 前置要求
1. 安装 [Node.js](https://nodejs.org/) (>= 14.x)
2. 安装阿里云 Serverless Devs 工具:
   ```bash
   npm install -g @serverless-devs/s
   ```
3. 配置阿里云密钥:
   ```bash
   s config add
   ```

### 启动项目
```bash
# 克隆项目
git clone [项目地址]
cd hcc-personal-website

# 本地开发
s local start

# 或者如果安装了Fun工具
fun local start
```

## 📦 部署到阿里云FC

### 1. 配置环境变量
在 `template.yml` 中设置您的DeepSeek API密钥：
```yaml
EnvironmentVariables:
  DEEPSEEK_API_KEY: '您的-DeepSeek-API-密钥'
```

### 2. 部署函数
```bash
# 使用 Serverless Devs 部署
s deploy

# 或者如果使用Fun工具
fun deploy
```

### 3. 配置自定义域名 (可选)
在 `template.yml` 中修改域名配置，或在阿里云控制台中绑定自定义域名。

## 📁 文件结构
```
hcc9713.github.io/
├── index.html          # 网站主页 (完整个人网站)
├── index.js           # 阿里云FC函数入口
├── template.yml       # 阿里云FC配置文件
├── package.json       # 项目依赖配置
├── README_FC.md      # 项目说明文档
├── whc.jpg           # 王皓辰个人头像
├── 作品1.jpg         # 媒体采访图片1
├── 作品2.jpg         # 媒体采访图片2
└── 作品3.jpg         # 媒体采访图片3
```

## ✨ 功能说明

### 🤖 AI数字分身聊天
- **个性化AI**: 基于王皓辰的专业背景训练
- **对话记忆**: 支持最近5轮对话的上下文记忆
- **智能回复**: 能够回答关于AI产品管理、职业经历等问题
- **实时交互**: 流畅的对话体验

### 📱 响应式设计
- **桌面优化**: 1200px+ 宽屏完美展示
- **平板适配**: 768px-1199px 中等屏幕优化
- **手机友好**: 576px-767px 小屏幕适配
- **现代动画**: CSS3动画和过渡效果

### 🎨 专业展示
- **个人简介**: AI产品经理专业背景
- **教育经历**: 陕西科技大学产品设计专业
- **获奖成就**: 德国IF设计奖等多项荣誉
- **作品展示**: 媒体采访和项目经历

## 🔧 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek AI API密钥 | 是 |

## 🚀 阿里云FC部署指南

### 步骤1: 准备阿里云账号
1. 注册阿里云账号
2. 开通函数计算服务
3. 获取AccessKey ID和Secret

### 步骤2: 配置开发环境
```bash
# 安装Serverless Devs
npm install -g @serverless-devs/s

# 配置阿里云账号
s config add
```

### 步骤3: 获取DeepSeek API密钥
1. 访问 [DeepSeek官网](https://platform.deepseek.com/)
2. 注册账号并获取API密钥
3. 在`template.yml`中配置密钥

### 步骤4: 部署应用
```bash
# 部署到阿里云
s deploy

# 查看部署状态
s info
```

### 步骤5: 访问网站
部署成功后，您将获得一个HTTP触发器URL，可以直接访问您的个人网站。

## 🔧 配置说明

### template.yml主要配置
```yaml
Resources:
  hcc_personal_website:
    Type: 'Aliyun::Serverless::Service'
    
    website:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: index.handler
        Runtime: nodejs18
        Timeout: 30
        MemorySize: 512
        EnvironmentVariables:
          DEEPSEEK_API_KEY: '您的API密钥'
```

## 📊 性能优化
- **冷启动优化**: 使用较小的内存配置和优化的代码
- **缓存策略**: 静态资源通过FC直接返回
- **API调用**: 异步处理，提升用户体验

## 🐛 常见问题

### Q: 本地开发时如何测试AI聊天功能？
A: 确保在本地环境变量中设置了`DEEPSEEK_API_KEY`，或在`template.yml`中配置。

### Q: 部署后AI聊天不工作？
A: 检查阿里云FC控制台中的环境变量配置，确保API密钥正确设置。

### Q: 如何绑定自定义域名？
A: 在`template.yml`中配置custom_domain，或在阿里云控制台手动绑定。

## 📄 许可证
MIT License

## 👨‍💼 关于作者
**王皓辰** - AI产品经理
- 3年AI产品经验，国内首批AI产品经理
- 专注大语言模型类产品，产品日活量3W+
- 腾讯AI大模型应用工作经验
- 多项国际设计奖项获得者