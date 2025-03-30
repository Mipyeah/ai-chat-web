# AI对话助手

这是一个纯前端的对话应用，支持多种大型语言模型API（如DeepSeek、OpenAI），可以部署到GitHub Pages进行免费托管。

## 功能特点

- **多API支持**：支持DeepSeek、OpenAI等API，可自由切换
- **纯前端实现**：无需后端服务器，保护API密钥安全
- **多会话管理**：支持创建和管理多个独立对话
- **历史记录**：完整保存所有对话历史，方便回顾
- **导入/导出**：支持对话数据的备份和恢复
- **响应式设计**：完美适配电脑和手机等各种设备
- **现代界面**：仿照流行的聊天应用界面，美观易用
- **离线支持**：PWA功能，添加到主屏幕后可离线使用

## 本地运行

直接在浏览器中打开index.html文件即可使用，无需安装其他依赖。

## 部署到GitHub Pages

1. 创建GitHub仓库
   - 登录GitHub，点击右上角"+"图标，选择"New repository"
   - 输入仓库名（如ai-chat-app），选择"Public"
   - 勾选"Add a README file"，点击"Create repository"

2. 上传代码文件
   - 进入仓库，点击"Add file" → "Upload files"
   - 将项目中的所有文件拖入上传区域
   - 点击"Commit changes"

3. 启用GitHub Pages
   - 进入仓库"Settings" → "Pages"
   - 在"Branch"下拉菜单中选择"main"或"master"
   - 点击"Save"，等待几分钟后会出现部署链接

## API密钥获取

应用支持多种API提供商，您需要获取相应的API密钥：

### DeepSeek API
1. 访问DeepSeek官网并注册账号
2. 在API Keys部分创建新的密钥
3. 复制API密钥并在应用设置中填入

### OpenAI API
1. 访问OpenAI平台并登录
2. 在API Keys部分创建新的密钥
3. 复制API密钥并在应用设置中填入

## 关于API密钥安全

本应用是纯前端应用，所有API请求都是直接从浏览器发送的。为了保护您的API密钥：

1. 建议不要在公共场合使用本应用
2. API密钥仅存储在本地浏览器中，不会上传到其他服务器

## 许可证

MIT License 