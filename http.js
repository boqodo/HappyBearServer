const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs/promises");
const path = require("path");
const {MsEdgeTTS} = require("msedge-tts");
const {spawn} = require("child_process");
const {whisper} = require(path.join(
    __dirname,
    "./whisper/whisper-addon.node"
));

/**
 * whisper异步调用方法
 * 基于加载whisper-addon.node
 * @param message
 * @returns {Promise<unknown>}
 */
const whisperAsync = async (message) => {
    return new Promise((resolve, reject) => {
        whisper(message, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

/**
 * whisper调用方法
 * 基于whisper命令行执行调用
 * @param model
 * @param filePath
 * @returns {Promise<unknown>}
 */
async function executeWhisper(model, filePath) {
    return new Promise((resolve, reject) => {
        const whisperProcess = spawn("./whisper/main", [
            "-m",
            `./whisper/${model}`,
            "-f",
            `${filePath}`,
        ]);

        let output = "";

        whisperProcess.stdout.on("data", (data) => {
            output += data;
        });

        whisperProcess.stderr.on("data", (data) => {
            //reject(data.toString());
            console.log(data.toString())
        });

        whisperProcess.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Whisper process exited with code ${code}`));
            } else {
                resolve(output);
            }
        });
    });
}

// 用于处理请求的辅助函数
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
        });
        req.on("end", () => {
            resolve(data);
        });
        req.on("error", (err) => {
            reject(err);
        });
    });
}

function getRequestBodyAsBuffer(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => {
            chunks.push(chunk);
        });
        req.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        req.on("error", (err) => {
            reject(err);
        });
    });
}

// 假设我们有以下额外的方法来处理外部集成：
// whisperToText：将语音文件转换为文本
// textToAudioStream：将文本转换为音频流
// openaiChat：与openai进行聊天并获取返回的文本
async function whisperToText(audioData) {
    // 在这里实现whisper集成
    const model = "ggml-base.en.bin";

    // 创建临时文件
    const tempFilePath = `./data/temp_audio_${Date.now()}.wav`;
    // 将音频数据写入临时文件
    await fs.writeFile(tempFilePath, audioData);

    return await executeWhisper(model, tempFilePath);
}

async function textToAudioStream(text) {
    // 在这里实现将文本转换为音频流的功能
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AriaNeural", MsEdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = tts.toStream(text);
    return readable;
}

async function openaiChat(text) {
    // 在这里实现与openai的聊天功能
    return Promise.resolve("Hello, I am a robot");
}

// 实现具体的功能处理函数
async function sttHandler(request, response) {
    const audioData = await getRequestBodyAsBuffer(request);
    try {
        const text = await whisperToText(audioData);
        let t = text.split("]")[1]

        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify({text: t.trim()}));
    } catch (error) {
        response.writeHead(500, {"Content-Type": "application/json"});
        response.end(JSON.stringify({error: error.message}));
    }
}

async function stt2Handler(request, response) {
    const audioData = await getRequestBodyAsBuffer(request);
    try {
        // 创建临时文件
        const tempFilePath = `./data/temp_audio_${Date.now()}.wav`;
        // 将音频数据写入临时文件
        await fs.writeFile(tempFilePath, audioData);

        let params = {
            language: "en",
            model: path.join(__dirname, "./whisper/ggml-medium.bin"),
            fname_inp: tempFilePath,
        };
        const result = await whisperAsync(params);
        let text = [];
        for (let i = 0; i < result.length; i++) {
            let ss = result[i];
            text.push(ss[ss.length - 1]);
        }
        let t = text.join("\n");

        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify({text: t.trim()}));
    } catch (error) {
        response.writeHead(500, {"Content-Type": "application/json"});
        response.end(JSON.stringify({error: error.message}));
    }
}

// 用于处理请求的辅助函数
async function getRequestBodyAsJSON(req) {
    const data = await getRequestBody(req);
    return JSON.parse(data);
}

async function ttsHandler(request, response) {
    if (request.method !== "POST") {
        response.writeHead(405, {"Content-Type": "text/plain"});
        response.end("Method Not Allowed");
        return;
    }

    const requestBody = await getRequestBodyAsJSON(request);
    const text = requestBody.text;
    const audioStream = await textToAudioStream(text);

    response.writeHead(200, {"Content-Type": "audio/mpeg"});
    audioStream.pipe(response);
}

async function chatHandler(request, response) {
    if (request.method !== "POST") {
        response.writeHead(405, {"Content-Type": "text/plain"});
        response.end("Method Not Allowed");
        return;
    }

    const requestBody = await getRequestBodyAsJSON(request);
    const text = requestBody.text;
    const responseText = await openaiChat(text);

    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify({text: responseText}));
}

async function chatHandlerForward(request, response) {
    const openaiUrl = 'api.openai.com'; // OpenAI API的URL
    const requestUrl = url.parse(request.url); // 解析请求的URL

    // 去除请求路径中的 "/chat"
    const path = requestUrl.pathname.replace(/^\/chat/, '');
    let headers = request.headers
    delete headers["host"]
    const options = {
        hostname: openaiUrl,
        port: 443,
        path: path,
        method: request.method,
        headers: headers
    };

    // 根据请求的协议选择使用http或https模块
    const req = https.request(options, (res) => {
        response.writeHead(res.statusCode, res.headers);
        res.pipe(response); // 将响应的内容直接返回给客户端
    });

    req.on('error', (err) => {
        console.error(err);
        response.statusCode = 500;
        response.end();
    });

    request.pipe(req); // 将客户端请求的内容直接转发到OpenAI API
}

function pong(req, res) {
    res.writeHead(200, {"Content-Type": "application/json"});
    let pong = {
        stt: true,
        tts: true,
        chat: true
    }
    res.end(JSON.stringify(pong));
}


// 创建一个HTTP服务器，根据不同的路径调用不同的处理函数
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    console.log(parsedUrl, pathname)

    if (pathname === "/stt") {
        await stt2Handler(req, res);
    } else if (pathname === "/tts") {
        await ttsHandler(req, res);
    } else if (pathname.startsWith("/chat")) {
        await chatHandlerForward(req, res);
    } else if (pathname === "/ping") {
        pong(req, res)
    } else {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.end("Not Found");
    }
});

// 监听一个端口
const port = 8080;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
