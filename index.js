
const fs = require('fs');
const path = require('path');
const https = require('https');

// 统一的响应头，包含CORS，允许跨域访问
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 阿里云函数计算FC主处理函数 - 使用与riaishere项目完全相同的解析方式
exports.handler = async (event, context, callback) => {
  console.log('FC Event:', JSON.stringify(event, null, 2));
  console.log('FC Context:', JSON.stringify(context, null, 2));

  // --- 关键修复：使用与riaishere项目完全相同的事件解析方式 ---
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
    // 3.1 调试端点：检查文件系统状态
    if (requestPath === '/debug-files') {
      console.log("匹配到文件调试路由");
      callback(null, handleDebugFilesRequest());
      return;
    }
    
    // 3.2 根路径返回主页
    if (requestPath === '/') {
      console.log("匹配到主页GET路由");
      callback(null, handleStaticPageRequest());
      return;
    }
    
    // 3.3 其他所有GET请求都视为静态资源请求 (例如 whc.jpg)
    console.log(`[GET路由] 作为静态资源处理: ${requestPath}`);
    callback(null, handleStaticAssetRequest(requestPath));
    return;
  }

  // 4. 对于其他所有未知请求，返回404
  console.log(`[路由结束] 未匹配任何已知路由, for ${httpMethod} ${requestPath}`);
  callback(null, {
      statusCode: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Not Found'
  });
};

// --- 子函数 ---

/**
 * 调试函数：检查阿里云函数计算环境中的文件状态
 */
function handleDebugFilesRequest() {
    console.log(`[文件调试] 开始检查文件系统状态`);
    console.log(`[文件调试] 当前工作目录: ${__dirname}`);
    console.log(`[文件调试] 进程当前目录: ${process.cwd()}`);
    
    const imageFiles = ['whc.jpg', 'work_1.jpg', 'work_2.jpg', 'work_3.jpg'];
    const results = {
        workingDirectory: __dirname,
        processDirectory: process.cwd(),
        imageFiles: [],
        allFiles: []
    };
    
    // 检查图片文件
    imageFiles.forEach(filename => {
        const filePath = path.join(__dirname, filename);
        let fileInfo = {
            filename,
            filePath,
            exists: false,
            size: 0,
            error: null
        };
        
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                fileInfo.exists = true;
                fileInfo.size = stats.size;
                fileInfo.isFile = stats.isFile();
                fileInfo.modified = stats.mtime;
            }
        } catch (err) {
            fileInfo.error = err.message;
        }
        
        results.imageFiles.push(fileInfo);
        console.log(`[文件调试] ${filename}: exists=${fileInfo.exists}, size=${fileInfo.size}`);
    });
    
    // 列出所有文件
    try {
        const allFiles = fs.readdirSync(__dirname);
        results.allFiles = allFiles;
        console.log(`[文件调试] 目录中的所有文件: ${JSON.stringify(allFiles)}`);
    } catch (err) {
        console.error(`[文件调试] 无法列出目录文件: ${err}`);
        results.error = err.message;
    }
    
    return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(results, null, 2)
    };
}

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
 * 处理静态资源（如图片）的请求 - 简化版本（参考riaishere项目）
 * @param {string} requestPath - 请求的资源路径, e.g., /whc.jpg?t=12345
 */
function handleStaticAssetRequest(requestPath) {
    console.log(`[静态资源请求] 请求路径: ${requestPath}`);
    console.log(`[静态资源请求] 当前目录: ${__dirname}`);
    
    // 简化处理：移除查询参数
    const pathnameOnly = requestPath.split('?')[0];
    
    // 安全检查：防止路径遍历攻击
    const safeSuffix = path.normalize(pathnameOnly).replace(/^(\.{2}(\/|\\|$))+/, '');
    // 移除开头的斜杠，确保正确拼接路径
    const cleanSuffix = safeSuffix.startsWith('/') ? safeSuffix.slice(1) : safeSuffix;
    const filePath = path.join(__dirname, cleanSuffix);
    
    console.log(`[静态资源请求] pathnameOnly: ${pathnameOnly}`);
    console.log(`[静态资源请求] cleanSuffix: ${cleanSuffix}`);
    console.log(`[静态资源请求] 最终文件路径: ${filePath}`);

    // 检查文件是否存在
    const fileExists = fs.existsSync(filePath);
    console.log(`[静态资源请求] 文件存在: ${fileExists}`);
    
    if (!fileExists) {
        // 列出当前目录的文件，帮助调试
        try {
            const files = fs.readdirSync(__dirname);
            console.log(`[调试] 当前目录文件列表: ${JSON.stringify(files)}`);
        } catch (err) {
            console.error(`[调试] 无法列出目录文件: ${err}`);
        }
        
        console.error(`静态资源未找到: ${filePath}`);
        return { 
            statusCode: 404, 
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }, 
            body: `Asset Not Found: ${cleanSuffix}` 
        };
    }

    try {
        const stats = fs.statSync(filePath);
        console.log(`[静态资源请求] 文件大小: ${stats.size} bytes`);
        
        const fileContent = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        console.log(`[静态资源请求] 成功读取文件: ${filePath} (${fileContent.length} bytes) as ${contentType}`);
        
        return {
            statusCode: 200,
            headers: { 
                ...CORS_HEADERS, 
                'Content-Type': contentType
            },
            body: fileContent.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error(`读取静态资源失败: ${error}`);
        return { 
            statusCode: 500, 
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }, 
            body: `Error reading asset: ${error.message}` 
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
 * @param {object} parsedEvent - 已解析的事件对象
 */
async function handleChatRequest(parsedEvent) {
    let userMessage, recentConversations;
    try {
        if (!parsedEvent.body) throw new Error("Request body is empty.");
        
        // 处理body编码
        let bodyString = parsedEvent.body;
        if (parsedEvent.isBase64Encoded) {
            bodyString = Buffer.from(parsedEvent.body, 'base64').toString();
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
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000, // 30秒超时
    };

    console.log("发送请求到DeepSeek API:", {
        hostname: options.hostname,
        path: options.path,
        messageLength: userMessage.length,
        conversationHistory: recentConversations.length
    });

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            console.log(`DeepSeek API响应状态: ${res.statusCode}`);
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`收到DeepSeek API响应，长度: ${responseData.length} 字符`);
                
                try {
                    const parsedResponse = JSON.parse(responseData);
                    
                    // 检查HTTP状态码
                    if (res.statusCode !== 200) {
                        console.error("DeepSeek API返回错误状态码:", res.statusCode);
                        console.error("错误响应内容:", responseData);
                        resolve({
                            statusCode: 500,
                            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                            body: JSON.stringify({error: `API返回状态码: ${res.statusCode}`})
                        });
                        return;
                    }
                    
                    // 检查响应中的错误
                    if (parsedResponse.error) {
                        console.error("DeepSeek API返回业务错误:", parsedResponse.error);
                        resolve({
                            statusCode: 500,
                            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                            body: JSON.stringify({error: parsedResponse.error.message || 'API调用失败'})
                        });
                        return;
                    }
                    
                    // 检查响应结构
                    if (!parsedResponse.choices || !parsedResponse.choices[0] || !parsedResponse.choices[0].message) {
                        console.error("DeepSeek API响应结构异常:", parsedResponse);
                        resolve({
                            statusCode: 500,
                            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                            body: JSON.stringify({error: 'API响应结构异常'})
                        });
                        return;
                    }
                    
                    const aiReply = parsedResponse.choices[0].message.content;
                    console.log("AI响应成功，回复长度:", aiReply.length);
                    
                    resolve({
                        statusCode: 200,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({reply: aiReply})
                    });
                    
                } catch(e) {
                    console.error("解析AI响应失败:", e);
                    console.error("原始响应数据:", responseData);
                    resolve({
                        statusCode: 500,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        body: JSON.stringify({error: '解析AI响应失败'})
                    });
                }
            });
        });

        // 添加超时处理
        req.setTimeout(30000, () => {
            console.error("DeepSeek API请求超时");
            req.destroy();
            resolve({
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify({error: 'API请求超时'})
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
// --- 本地服务器启动逻辑 (新增) ---
// 这部分代码只在本地直接用 `node index.js` 运行时才会执行
// 在阿里云函数计算环境中，这部分代码会被忽略
if (require.main === module) {
    const http = require('http');
    const PORT = process.env.PORT || 8000;

    const server = http.createServer(async (req, res) => {
        // 1. 将 Node.js 的 req 转换为函数计算期望的 event 格式
        const event = {
            httpMethod: req.method,
            path: req.url,
            headers: req.headers,
            body: await new Promise(resolve => {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => resolve(body));
            })
        };
        
        // 2. 调用我们原来的 handler 函数
        const fcResponse = await exports.handler(event, {});

        // 3. 将 handler 的返回结果转换为 Node.js 的 res 格式
        res.writeHead(fcResponse.statusCode, fcResponse.headers);
        
        if (fcResponse.isBase64Encoded) {
            res.end(Buffer.from(fcResponse.body, 'base64'));
        } else {
            res.end(fcResponse.body);
        }
    });

    server.listen(PORT, () => {
        console.log(`[本地开发服务器] 启动成功，请访问 http://localhost:${PORT}`);
    });
}
