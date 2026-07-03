# 云端流式 AI 代理部署说明

## 为什么要云端代理

OpenAI API Key 不能放在小程序前端。当前结构是：

```text
小程序 wx.request(enableChunked) -> 云端 HTTP 代理 -> OpenAI-compatible Chat Completions
```

小程序只保存云端代理 URL，不保存 API Key。

## 部署代理

代理代码在：

```text
cloudfunctions/ai-stream-proxy/
```

它是一个 Node.js HTTP 服务，适合部署到微信云托管、腾讯云函数 HTTP 触发器、Cloud Run、自有 Node 服务等支持流式响应的平台。

## 云端环境变量

在云端服务配置：

```text
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

`OPENAI_API_KEY` 只放在云端，不提交到 Git，不写进小程序。

## 小程序配置

1. 部署 `cloudfunctions/ai-stream-proxy`。
2. 拿到公网 HTTPS URL，例如：
   ```text
   https://example.com/
   ```
3. 在微信公众平台把这个域名加入 request 合法域名。
4. 在小程序“设置”页开启 AI，填入这个云端代理 URL。

## 本地测试代理

在 `cloudfunctions/ai-stream-proxy` 下运行：

```bash
npm start
```

然后用 curl 或 Postman POST：

```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ]
}
```

响应是 `text/event-stream`，小程序会按流式分块解析。
