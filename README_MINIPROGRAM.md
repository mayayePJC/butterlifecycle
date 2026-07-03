# 蝴蝶人生微信原生小程序

这是根据 `PRD.md` 和 `stitch_butterfly_metamorphosis_journey` 原型生成的微信原生小程序 MVP。

## 打开方式

1. 用微信开发者工具导入当前目录 `E:\haigui_codex`。
2. `AppID` 可先使用测试号或游客模式。
3. 入口页是 `pages/character/character`。

## AI 云端流式配置

在小程序内进入“设置”：

- 开启“启用 AI”。
- 填入你的“云端代理 URL”。
- API Key 不在小程序内填写，必须放在云端代理的环境变量里。

故事页会通过 `wx.request({ enableChunked: true })` 请求云端代理并接收流式分块。云端代理再请求 OpenAI-compatible Chat Completions，并把 SSE `data:` 增量转发回来。

代理示例在 `cloudfunctions/ai-stream-proxy/`。正式发布需要在微信公众平台配置 request 合法域名。

## AI Role Skills 融入方式

`AI_ROLE_SKILLS.md` 已作为叙事引擎的内部编排协议接入：

- 当前采用 MVP 单次调用版，不拆成 6 次请求。
- `utils/prompt.js` 要求模型按“档案官、心理官、命运官、世界类型官、编剧官、审稿官”顺序工作，并返回严格 JSON。
- `utils/narrative.js` 解析 JSON：只把 `writer` 内容展示给用户；把 `psychologist.state_delta_suggestion` 合并进隐藏状态；把 `fate_director` 和 `genre_gatekeeper` 的代价/因果债保存到故事状态。
- 如果 `reviewer.pass === false`，字段缺失，或 JSON 解析失败，代码会自动降级到本地规则续写。
- 故事页流式生成时只显示自然等待状态，不暴露内部 JSON、职能和数值。

## 已覆盖的 MVP

- 随机角色卡与自定义角色。
- 随机起点事件与自定义事件。
- 连续叙事回合、三个系统选项、自定义行动。
- 隐藏状态盘：惯性、瞬时偏航、人格沉积、现实压力、世界异化。
- “到此为止”的阶段性回望。
- AI 失败或未配置时的本地规则兜底。
