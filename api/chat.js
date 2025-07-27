// Vercel Serverless Function
// This function will handle requests to /api/chat

// 我们使用 require 而不是 import，因为 Vercel 默认环境是 Node.js CommonJS
const axios = require('axios');

module.exports = async (req, res) => {
    // 允许来自您的 GitHub Pages 前端的跨域请求
    res.setHeader('Access-Control-Allow-Origin', 'https://hcc9713.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理浏览器发送的 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. 我们只处理 POST 请求
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 2. 从请求体中获取用户发送的消息和对话历史
        const { message, conversationHistory } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // --- 调用外部 AI API 的部分 ---
        // 重要提示: 请根据您实际使用的 AI服务 修改以下代码

        // 3. 从 Vercel 环境变量中获取您的 AI API 密钥和地址
        // 您需要在 Vercel 项目的设置页面添加名为 'AI_API_KEY' 和 'AI_API_URL' 的环境变量
        const apiKey = process.env.AI_API_KEY;
        const apiUrl = "https://api.deepseek.com/v1/chat/completions";

        if (!apiKey || !apiUrl) {
            console.error('AI API Key or URL is not configured in Vercel environment variables.');
            // 为了不让用户看到服务端错误，我们返回一个友好的提示
            return res.status(500).json({ reply: '抱歉，AI助手正在维护中，请稍后再试。' });
        }

        // 4. 准备发送到 AI API 的数据
        // 使用完整的对话历史，如果没有提供则创建默认的系统消息
        let messages;
        if (conversationHistory && conversationHistory.length > 0) {
            // 使用前端传来的完整对话历史
            messages = conversationHistory;
        } else {
            // 如果没有历史记录，创建默认的系统消息和用户消息
            messages = [
                {
                    role: "system",
                    content: "你是王皓辰的AI数字分身。王皓辰是一位AI产品经理，在腾讯从事AI大模型应用工作，有3年AI产品经验，是国内首批AI产品经理。他专注大语言模型类产品，管理的产品日活量3W+。他毕业于陕西科技大学产品设计专业，曾获得德国IF设计奖、中国设计智造大奖DIA、台湾两岸新锐设计华灿奖全国二等奖等多项荣誉。请以他的身份和经验来回答用户的问题。"
                },
                {
                    role: "user",
                    content: message
                }
            ];
        }

        const requestData = {
            model: "deepseek-chat", // 您可以按需修改模型
            messages: messages,
            stream: false // 明确指定为非流式返回
        };

        // 5. 设置请求头，通常需要包含 API 密钥用于认证
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_API_KEY}`, // 'Bearer' 模式很常用，但请根据您的 API 要求调整
        };

        // 6. 使用 axios 发送 POST 请求到您的 AI API
        const aiResponse = await axios.post(apiUrl, requestData, { headers });

        // 7. 从 AI API 的响应中提取需要返回给前端的回复内容
        // (请根据您的 API 返回结果的实际结构进行修改)
        const aiMessage = aiResponse.data.choices[0].message.content;

        // 8. 将 AI 的回复以 JSON 格式发送回前端
        res.status(200).json({ reply: aiMessage });

    } catch (error) {
        // 捕获并记录错误，这对于在 Vercel 后台排查问题很有帮助
        console.error('Error calling AI API. Status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        res.status(500).json({ reply: '抱歉，与AI服务通讯时发生错误。' });
    }
}; 