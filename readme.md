# HappyBear App Local Server
> 针对HappyBear App设置中本地服务（Local Server）的基于nodejs实现的版本
> 实现了3个功能接口，分别对应stt、tts、chat


## 功能接口

### stt
> 语音识别接口，接收语音文件，返回识别结果

通过whisper.cpp实现stt

### tts
> 语音合成接口，接收文本，返回语音文件

通过msedge-tts实现tts

### chat
> 转发聊天接口，接收文本，转发给chatgpt返回文本

转发请求给chatgpt

## 使用方法

1. 安装nodejs

2. 构建whisper依赖（必须）

具体见[whisper](./whisper/readme.md)

4. 安装依赖
```bash
npm install
```
5. 启动服务
```bash
npm start
```

6. 测试服务

http://localhost:8080/ping

## docker构建

docker/Dockerfile

目前测试效果不好，建议直接本地跑
