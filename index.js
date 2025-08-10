
const fs = require('fs');
const path = require('path');
const https = require('https');

// 统一的响应头，包含CORS，允许跨域访问
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 主处理函数 (无需修改)
exports.handler = async (event, context, callback) => {
  // --- 关键修复：解码并解析真实事件 ---
  const eventString = event.toString('utf-8');
  const parsedEvent = JSON.parse(eventString);

  // 从解析后的事件中，提取出真正的路径和方法
  const requestPath = parsedEvent.rawPath || parsedEvent.path || '/';
  const httpMethod = parsedEvent.requestContext.http.method;
  
  console.log(`[最终解析] 收到请求: 方法=${httpMethod}, 路径=${requestPath}`);

  // 1. 处理浏览器的OPTIONS预检请求
  if (httpMethod.toUpperCase() === 'OPTIONS') {
    console.log("正在处理 OPTIONS 预检请求");
    callback(null, { statusCode: 204, headers: CORS_HEADERS, body: '' });
    return;
  }
  
  // 2. 处理聊天API的POST请求
  if (requestPath === '/chat' && httpMethod.toUpperCase() === 'POST') {
    console.log("匹配到聊天API路由，准备调用AI");
    try {
        const chatResponse = await handleChatRequest(parsedEvent);
        callback(null, chatResponse);
        return;
    } catch (e) {
        console.error("AI聊天处理出错:", e);
        callback(null, {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "AI服务暂时不可用" })
        });
        return;
    }
  }
  
  // 3. 处理GET请求
  if (httpMethod.toUpperCase() === 'GET') {
      // 根路径返回主页
      if (requestPath === '/') {
        console.log("匹配到主页GET路由");
        callback(null, handleStaticPageRequest());
        return;
      }
      // 其他路径尝试作为静态资源（如图片）返回
      console.log(`尝试提供静态资源: ${requestPath}`);
      callback(null, handleStaticAssetRequest(requestPath));
      return;
  }

  // 4. 对于其他所有未知请求，返回404
  console.log(`未匹配到任何路由，返回404 for ${httpMethod} ${requestPath}`);
  callback(null, {
      statusCode: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Not Found'
  });
};

// --- 子函数 ---

/**
 * 处理静态主页HTML的请求
 */
function handleStaticPageRequest() {
  try {
    const htmlContent = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlContent,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      body: '服务器内部错误：无法读取主页文件。',
    };
  }
}

/**
 * 处理静态资源（如图片）的请求
 * @param {string} requestPath - 请求的资源路径, e.g., /Ria.jpg?t=12345
 */
function handleStaticAssetRequest(requestPath) {
    // 关键修复：从请求路径中移除查询参数（例如 ?t=...），得到纯粹的文件路径
    const pathnameOnly = requestPath.split('?')[0];

    // 安全检查：防止路径遍历攻击
    const safeSuffix = path.normalize(pathnameOnly).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(__dirname, safeSuffix);

    if (!fs.existsSync(filePath)) {
        console.error(`静态资源未找到: ${filePath}`);
        return { statusCode: 404, headers: {'Content-Type': 'text/plain'}, body: 'Asset Not Found' };
    }

    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        console.log(`成功提供静态资源: ${filePath} as ${contentType}`);
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': contentType },
            body: fileContent.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error(`读取静态资源失败: ${error}`);
        return { statusCode: 500, headers: {'Content-Type': 'text/plain'}, body: 'Error reading asset' };
    }
}

/**
 * 根据文件扩展名获取MIME类型
 * @param {string} filePath 
 */
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.ico':
            return 'image/x-icon';
        case '.css':
            return 'text/css';
        case '.js':
            return 'application/javascript';
        default:
            return 'application/octet-stream';
    }
}

/**
 * 处理对AI聊天API的请求（非流式版本，适合函数计算）
 * @param {object} parsedEvent - 已解析的真实事件对象
 */
async function handleChatRequest(parsedEvent) {
    let userMessage;
    try {
        if (!parsedEvent.body) throw new Error("Request body is empty.");
        const body = JSON.parse(parsedEvent.body);
        userMessage = body.message;
        if (!userMessage) throw new Error("'message' field is missing.");
        console.log("收到用户消息:", userMessage);
    } catch (e) {
        return {
            statusCode: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({error: e.message})
        };
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        console.error("未配置DEEPSEEK_API_KEY");
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({error: '服务器未配置 DEEPSEEK_API_KEY'})
        };
    }

    const postData = JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { content: `你是一个AI助手，你的名字叫"石耳AI"，由陈科瑾创造。请用友好、简洁、乐于助人的语气回答问题。

重要：这个交互式终端网站有一些特殊的快速命令，当用户询问相关主题时，你应该自然地建议他们使用这些命令来获得更详细和专业的信息：

快速命令列表：
- "你好" 或 "hello" - 专业的问候和介绍
- "你是谁" - 获取关于我的详细介绍
- "陈科瑾是谁" - 了解我的创造者和他的背景
- "你的技能" - 查看我的详细能力列表
- "网站简介" - 获取这个网站的完整介绍
- "帮助" - 查看详细的使用指南
- "快速命令" - 显示所有可用的快速命令
- "再见" - 专业的告别
- "谢谢" - 礼貌的回应

引导策略：
- 当用户问"你是谁"相关问题时，建议他们输入"你是谁"获取完整介绍
- 当用户询问陈科瑾相关信息时，建议使用"陈科瑾是谁"命令
- 当用户询问网站功能时，推荐"网站简介"命令
- 当用户需要帮助时，推荐"帮助"命令
- 当用户想了解我的能力时，推荐"你的技能"命令

请自然地在回答中融入这些建议，不要显得生硬，也不要解释这些命令的技术实现。`, role: 'system' },
          { content: userMessage, role: 'user' },
        ],
        stream: false, // 非流式响应
    });

    const options = {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedResponse = JSON.parse(responseData);
                    console.log("AI响应成功");
                    
                    if (parsedResponse.error) {
                        resolve({
                            statusCode: 500,
                            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                            body: JSON.stringify({error: parsedResponse.error.message})
                        });
                        return;
                    }
                    
                    const aiReply = parsedResponse.choices[0].message.content;
                    resolve({
                        statusCode: 200,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({reply: aiReply})
                    });
                    
                } catch(e) {
                    console.error("解析AI响应失败:", e);
                    resolve({
                        statusCode: 500,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({error: '解析AI响应失败'})
                    });
                }
            });
        });

        req.on('error', (e) => {
            console.error("调用AI服务出错:", e);
            resolve({
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({error: `调用AI服务时发生网络错误: ${e.message}`})
            });
        });

        req.write(postData);
        req.end();
    });
}
