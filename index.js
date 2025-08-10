
const fs = require('fs');
const path = require('path');
const https = require('https');

// 统一的响应头，包含CORS，允许跨域访问
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 阿里云函数计算FC主处理函数
exports.handler = async (event, context) => {
  console.log('FC Event:', JSON.stringify(event, null, 2));
  console.log('FC Context:', JSON.stringify(context, null, 2));

  // 阿里云FC HTTP触发器事件结构解析
  const httpMethod = event.httpMethod || event.method || 'GET';
  const requestPath = event.path || event.requestPath || '/';
  const headers = event.headers || {};
  const body = event.body || '';
  
  console.log(`[FC解析] 收到请求: 方法=${httpMethod}, 路径=${requestPath}`);
  console.log(`[FC解析] Headers:`, JSON.stringify(headers, null, 2));

  // 1. 处理浏览器的OPTIONS预检请求
  if (httpMethod.toUpperCase() === 'OPTIONS') {
    console.log("正在处理 OPTIONS 预检请求");
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  // 2. 处理聊天API的POST请求
  if (requestPath === '/chat' && httpMethod.toUpperCase() === 'POST') {
    console.log("匹配到聊天API路由，准备调用AI");
    try {
        const chatResponse = await handleChatRequest({ body, headers });
        return chatResponse;
    } catch (e) {
        console.error("AI聊天处理出错:", e);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "AI服务暂时不可用" })
        };
    }
  }
  
  // 3. 处理GET请求
  if (httpMethod.toUpperCase() === 'GET') {
      // 根路径返回主页
      if (requestPath === '/') {
        console.log("匹配到主页GET路由");
        return handleStaticPageRequest();
      }
      // 其他路径尝试作为静态资源（如图片）返回
      console.log(`尝试提供静态资源: ${requestPath}`);
      return handleStaticAssetRequest(requestPath);
  }

  // 4. 对于其他所有未知请求，返回404
  console.log(`未匹配到任何路由，返回404 for ${httpMethod} ${requestPath}`);
  return {
      statusCode: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Not Found'
  };
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
    console.log(`[静态资源请求] 原始路径: ${requestPath}`);
    
    // 关键修复：从请求路径中移除查询参数（例如 ?t=...），得到纯粹的文件路径
    const pathnameOnly = requestPath.split('?')[0];
    console.log(`[静态资源请求] 清理后路径: ${pathnameOnly}`);

    // 安全检查：防止路径遍历攻击
    const safeSuffix = path.normalize(pathnameOnly).replace(/^(\.\.(\/|\\|$))+/, '');
    // 移除开头的斜杠，确保正确拼接路径
    const cleanSuffix = safeSuffix.startsWith('/') ? safeSuffix.slice(1) : safeSuffix;
    const filePath = path.join(__dirname, cleanSuffix);
    console.log(`[静态资源请求] 清理后的后缀: ${cleanSuffix}`);
    console.log(`[静态资源请求] 最终文件路径: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`静态资源未找到: ${filePath}`);
        // 列出当前目录的文件，帮助调试
        try {
            const files = fs.readdirSync(__dirname);
            console.log(`[调试] 当前目录文件列表: ${JSON.stringify(files)}`);
        } catch (err) {
            console.error(`[调试] 无法列出目录文件: ${err}`);
        }
        return { 
            statusCode: 404, 
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }, 
            body: 'Asset Not Found' 
        };
    }

    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        console.log(`成功提供静态资源: ${filePath} as ${contentType}`);
        
        return {
            statusCode: 200,
            headers: { 
                ...CORS_HEADERS, 
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000' // 缓存一年
            },
            body: fileContent.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error(`读取静态资源失败: ${error}`);
        return { 
            statusCode: 500, 
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }, 
            body: 'Error reading asset' 
        };
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
        case '.webp':
            return 'image/webp';
        case '.ico':
            return 'image/x-icon';
        case '.svg':
            return 'image/svg+xml';
        case '.css':
            return 'text/css';
        case '.js':
            return 'application/javascript';
        case '.html':
            return 'text/html; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

/**
 * 处理对AI聊天API的请求（阿里云FC版本）
 * @param {object} requestData - 包含body和headers的请求数据
 */
async function handleChatRequest(requestData) {
    let userMessage, recentConversations;
    try {
        if (!requestData.body) throw new Error("Request body is empty.");
        
        // 阿里云FC可能会将body编码为base64，需要处理
        let bodyString = requestData.body;
        if (requestData.headers && requestData.headers['content-encoding'] === 'base64') {
            bodyString = Buffer.from(requestData.body, 'base64').toString();
        }
        
        const body = JSON.parse(bodyString);
        userMessage = body.message;
        recentConversations = body.recentConversations || [];
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

    // 构建包含最近对话历史的prompt
    let systemPrompt = "你是王皓辰的AI数字分身。王皓辰是一位AI产品经理，在腾讯从事AI大模型应用工作，有3年AI产品经验，是国内首批AI产品经理。他专注大语言模型类产品，管理的产品日活量3W+。他毕业于陕西科技大学产品设计专业，曾获得德国IF设计奖、中国设计智造大奖DIA、台湾两岸新锐设计华灿奖全国二等奖、知识产权杯全国大学生工业设计大赛一等奖、互联网+全国大学生全国二等奖等多项荣誉。请以王皓辰的身份和经验来回答用户的问题。";

    // 如果有最近的对话历史，将其添加到系统prompt中
    if (recentConversations && recentConversations.length > 0) {
        systemPrompt += "\n\n以下是最近的对话历史（供参考上下文）：\n";
        recentConversations.forEach((conversation, index) => {
            systemPrompt += `\n第${index + 1}轮对话：`;
            systemPrompt += `\n用户：${conversation.user}`;
            systemPrompt += `\n助手：${conversation.assistant}\n`;
        });
        systemPrompt += "\n请基于以上对话历史，继续保持角色一致性和对话连贯性。";
    }

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: userMessage
        }
    ];

    const postData = JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
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
