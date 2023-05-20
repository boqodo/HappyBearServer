# whisper
> 基于开源项目whisper.cpp构建依赖
> 


## 构建依赖（必须）

- main
- whisper-addon.node

**注：目前工程中的是基于m1芯片构建的，需要自行按照下列方式构建**

```shell


git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
cd examples/addon.node
npm install
npx cmake-js compile -T whisper-addon -B Release

# 拷贝 build/Release/whisper-addon.node 到当前目录
# 拷贝 main 到当前目录

```

具体细节见：https://github.com/ggerganov/whisper.cpp


## 下载模型（必须）

- ggml-base.en.bin
- ggml-medium.bin

进入 https://huggingface.co/ggerganov/whisper.cpp 下载

具体细节见： https://github.com/ggerganov/whisper.cpp#ggml-format
