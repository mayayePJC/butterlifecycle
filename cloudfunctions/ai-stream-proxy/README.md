# AI Stream Proxy

这是小程序使用的云端流式 AI 代理。

前端只请求这个 HTTPS 地址，不保存、不发送 OpenAI API Key。密钥只放在云端环境变量里。

## 环境变量

```text
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

## 请求

```http
POST /
content-type: application/json

{
  "messages": [],
  "temperature": 0.82
}
```

响应为 OpenAI-compatible SSE 流，前端通过 `wx.request({ enableChunked: true })` 读取。

## 部署建议

这个函数需要部署成可公网 HTTPS 访问、支持流式响应的 HTTP 云函数或云托管服务。普通 `wx.cloud.callFunction` 不适合这里，因为它拿不到逐段返回的流。

部署后，把 HTTPS 地址填到小程序设置页的“云函数 URL”。正式版需要在微信公众平台配置 request 合法域名。
