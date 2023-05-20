# 使用具有 Node.js 的 Docker 基础镜像
FROM node:latest

# 创建应用目录
WORKDIR /app

# 安装 app 依赖项
COPY ../package*.json ./

RUN npm install

# 将应用程序的源文件复制到容器中
COPY ../http.js .

# 安装 git
RUN apt-get update && apt-get install -y git  && apt-get install -y cmake

# 克隆 whisper.cpp 仓库
RUN git clone https://github.com/ggerganov/whisper.cpp.git

# 进入 whisper.cpp 仓库目录
WORKDIR /app/whisper.cpp

# 下载 Whisper 模型
#RUN bash ./models/download-ggml-model.sh base.en

# 构建主示例
RUN make

# 开放应用的端口
EXPOSE 8080

# 进入 whisper-addon 目录
WORKDIR /app/whisper.cpp/examples/addon.node

RUN npm install

WORKDIR /app/whisper.cpp

RUN npx cmake-js compile -T whisper-addon -B Release

# 拷贝编译好的模块
RUN cp build/Release/whisper-addon.node /app/whisper/whisper-addon.node

# 拷贝whisper.cpp目录下的main并且重构命名为whisper
RUN cp main /app/whisper/main

WORKDIR /app

# 在容器中运行 Node.js 应用
CMD [ "node", "http.js" ]
