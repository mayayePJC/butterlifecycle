const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const narrative = require("../utils/narrative");
const prompt = require("../utils/prompt");

loadEnv(path.join(__dirname, ".env"));
loadEnv(path.join(__dirname, "..", ".env"));

const PORT = Number(process.env.WEB_PORT || process.env.PORT || 8787);
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const PUBLIC_DIR = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeStory(story) {
  return story && Array.isArray(story.beats) ? story : null;
}

function extractAssistantText(payload) {
  if (!payload) return "";
  if (payload.output_text) return String(payload.output_text).trim();
  if (payload.choices && payload.choices.length) {
    const choice = payload.choices[0];
    if (choice.message && choice.message.content) {
      if (typeof choice.message.content === "string") return choice.message.content.trim();
      if (Array.isArray(choice.message.content)) {
        return choice.message.content.map(part => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          return "";
        }).join("").trim();
      }
    }
    if (choice.text) return String(choice.text).trim();
  }
  return "";
}

function hasUsableApiKey() {
  return !!OPENAI_API_KEY && /^[\x20-\x7E]+$/.test(OPENAI_API_KEY) && !OPENAI_API_KEY.includes("替换");
}

function missingKeyMessage() {
  return "请先在 webapp/.env 填写真实的 OPENAI_API_KEY，然后重启服务";
}

function describeError(error) {
  const parts = [];
  if (error && error.message) parts.push(error.message);
  if (error && error.cause) {
    if (error.cause.code) parts.push(error.cause.code);
    if (error.cause.message) parts.push(error.cause.message);
  }
  return parts.filter(Boolean).join(" - ") || "AI 请求失败";
}

function tryParseJson(raw) {
  const text = (raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {}
    }
  }
  return null;
}

function requireJson(raw, label) {
  const json = tryParseJson(raw);
  if (json) return json;
  const excerpt = String(raw || "").replace(/\s+/g, " ").slice(0, 180);
  throw new Error(label + " 返回的 JSON 不完整，请再点一次生成。" + (excerpt ? " 片段：" + excerpt : ""));
}

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(label + " 缺少有效文本。");
  return text;
}

function requireTextArray(value, label, max) {
  if (!Array.isArray(value)) throw new Error(label + " 必须是数组。");
  const list = value.map(item => String(item || "").trim()).filter(Boolean).slice(0, max || 5);
  if (!list.length) throw new Error(label + " 不能为空。");
  return list;
}

function requireThreeChoices(choices, label) {
  if (!Array.isArray(choices)) throw new Error(label + " 必须提供 3 个选择。");
  const normalized = choices.slice(0, 3).map((choice, index) => {
    if (typeof choice === "string") {
      throw new Error(label + " 第 " + (index + 1) + " 个选择缺少标签。");
    }
    return {
      tag: requireText(choice && (choice.tag || choice.label), label + " 第 " + (index + 1) + " 个选择标签"),
      intent: String(choice && choice.intent || "").trim(),
      text: requireText(choice && choice.text, label + " 第 " + (index + 1) + " 个选择")
    };
  });
  if (normalized.length !== 3) throw new Error(label + " 必须正好生成 3 个选择。");
  return normalized;
}

function normalizeAiCharacter(payload) {
  const source = (payload && payload.writer && payload.writer.character) || payload || {};
  const selves = source.selves || {};
  return {
    id: "ai_character_" + Date.now(),
    title: requireText(source.title, "人物标题"),
    tagline: requireText(source.tagline, "人物短句"),
    identity: requireText(source.identity, "人物身份"),
    summary: requireText(source.summary, "人物摘要"),
    inertia: requireTextArray(source.inertia, "人格惯性", 5),
    desires: requireTextArray(source.desires, "深层欲望", 4),
    fears: requireTextArray(source.fears, "核心恐惧", 4),
    moralLine: requireText(source.moralLine, "道德底线"),
    relationPulls: requireTextArray(source.relationPulls, "关系牵引", 5),
    resources: requireTextArray(source.resources, "资源状态", 5),
    selves: {
      subject: requireText(selves.subject, "主体我"),
      object: requireText(selves.object, "客体我"),
      material: requireText(selves.material, "物质自我"),
      social: requireText(selves.social, "社会自我"),
      spiritual: requireText(selves.spiritual, "精神自我"),
      pure: requireText(selves.pure, "纯粹自我")
    }
  };
}

function normalizeAiEvent(payload) {
  const source = (payload && payload.writer && payload.writer.event) || payload || {};
  return {
    id: "ai_event_" + Date.now(),
    text: requireText(source.text, "起点事件"),
    innerReaction: requireText(source.innerReaction, "起点内心反应"),
    pressure: requireText(source.pressure, "起点现实压力"),
    choices: requireThreeChoices(source.choices, "起点事件")
  };
}

function normalizeAiSeed(payload) {
  const source = payload || {};
  return {
    character: normalizeAiCharacter(source.character || {}),
    event: normalizeAiEvent(source.event || {})
  };
}

function seedShape() {
  return {
    character: {
      title: "",
      tagline: "",
      identity: "",
      summary: "",
      inertia: [],
      desires: [],
      fears: [],
      moralLine: "",
      relationPulls: [],
      resources: [],
      selves: {
        subject: "",
        object: "",
        material: "",
        social: "",
        spiritual: "",
        pure: ""
      }
    },
    event: {
      text: "",
      innerReaction: "",
      pressure: "",
      choices: [
        { tag: "保持安全", text: "" },
        { tag: "细微偏航", text: "" },
        { tag: "冒险选择", text: "" }
      ]
    }
  };
}

function eventShape() {
  return seedShape().event;
}

function normalizeAiChoices(payload, story) {
  const writer = payload && payload.writer ? payload.writer : payload;
  const choices = Array.isArray(writer && writer.choices) ? writer.choices : [];
  return requireThreeChoices(choices, "AI 选项");
}

function requireRoleSkillJson(raw, label) {
  const json = requireJson(raw, label);
  if (!json.writer || !json.reviewer) {
    throw new Error(label + " 没有完整经过 role skill，请再点一次生成。");
  }
  if (json.reviewer.pass === false) {
    const reason = Array.isArray(json.reviewer.blocking_issues) && json.reviewer.blocking_issues.length
      ? json.reviewer.blocking_issues.join("；")
      : "审稿官未通过";
    throw new Error(label + " 被判官退回：" + reason);
  }
  return json;
}

function buildRoleSkillRepairMessages(rawText, label) {
  const writerShape = label.includes("人物")
    ? { character: "把原始输出整理成完整人物对象" }
    : label.includes("事件")
      ? { event: "把原始输出整理成完整事件对象" }
      : { choices: "把原始输出整理成 3 个行动选项" };
  return [
    {
      role: "system",
      content: [
        "你是《蝴蝶人生》的 role skill 协议修复器。",
        "不要重新创作，只把原始输出整理为合法 JSON。",
        "顶层必须恰好包含 6 个字段：archivist, psychologist, fate_director, genre_gatekeeper, writer, reviewer。",
        "writer 必须包含目标内容；reviewer.pass 必须是布尔值。",
        "如果原始输出缺少某些职能字段，请基于原始内容做克制、简短的补全。",
        "只输出合法 JSON，不要 Markdown，不要解释。",
        "writer 目标形状：",
        JSON.stringify(writerShape)
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "任务标签：" + label,
        "原始输出：",
        String(rawText || "").slice(0, 5000)
      ].join("\n")
    }
  ];
}

function buildPlainJsonRepairMessages(rawText, shape, label) {
  return [
    {
      role: "system",
      content: [
        "你是 JSON 修复器。",
        "只把原始内容整理成指定 JSON 形状，不要重新扩写。",
        "只输出合法 JSON，不要 Markdown，不要解释。",
        "目标形状：",
        JSON.stringify(shape)
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "任务：" + label,
        "原始内容：",
        String(rawText || "").slice(0, 3000)
      ].join("\n")
    }
  ];
}

async function chatJson(messages, label, options, shape) {
  const rawText = await chat(messages, options);
  try {
    return requireJson(rawText, label);
  } catch (error) {
    try {
      const repairText = await chat(buildPlainJsonRepairMessages(rawText, shape, label), {
        maxTokens: options.repairMaxTokens || options.maxTokens || 900,
        temperature: 0.15,
        timeout: options.timeout || 75000
      });
      return requireJson(repairText, label);
    } catch (repairError) {
      throw new Error(label + " 失败：" + (repairError.message || error.message));
    }
  }
}

async function chatRoleSkill(messages, label, options) {
  const rawText = await chat(messages, options);
  try {
    return requireRoleSkillJson(rawText, label);
  } catch (error) {
    const repairText = await chat(buildRoleSkillRepairMessages(rawText, label), {
      maxTokens: Math.max(options.repairMaxTokens || options.maxTokens || 900, 1100),
      temperature: 0.2,
      timeout: options.timeout || 75000
    });
    return requireRoleSkillJson(repairText, label);
  }
}

function chatViaPowerShell(body, timeout) {
  return new Promise((resolve, reject) => {
    const script = [
      "$ErrorActionPreference='Stop'",
      "[Console]::InputEncoding=[Text.Encoding]::UTF8",
      "[Console]::OutputEncoding=[Text.Encoding]::UTF8",
      "$body = [Console]::In.ReadToEnd()",
      "$headers = @{ Authorization = 'Bearer ' + $env:OPENAI_API_KEY; 'Content-Type' = 'application/json' }",
      "$response = Invoke-WebRequest -Uri $env:OPENAI_BASE_URL -Method Post -Headers $headers -Body $body -UseBasicParsing -TimeoutSec " + Math.ceil(timeout / 1000),
      "$response.Content"
    ].join("; ");

    const child = spawn("powershell.exe", ["-NoProfile", "-Command", script], {
      env: Object.assign({}, process.env, {
        OPENAI_API_KEY,
        OPENAI_BASE_URL
      })
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("PowerShell request timed out"));
    }, timeout + 5000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error((stderr || "PowerShell request failed").trim()));
        return;
      }
      resolve(stdout);
    });
    child.stdin.end(body, "utf8");
  });
}

async function chat(messages, options = {}) {
  if (!hasUsableApiKey()) return "";
  const timeout = options.timeout || 75000;
  const body = JSON.stringify({
    model: OPENAI_MODEL,
    messages,
    stream: false,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.82,
    max_tokens: options.maxTokens || 1200
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    let text;
    try {
      const upstream = await fetch(OPENAI_BASE_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body
      });
      text = await upstream.text();
      if (!upstream.ok) throw new Error(text || "Upstream request failed");
    } catch (error) {
      console.warn("Node fetch failed, retrying via PowerShell:", describeError(error));
      text = await chatViaPowerShell(body, timeout);
    }
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (error) {}
    if (json) {
      if (json.error) {
        throw new Error(json.error.message || JSON.stringify(json.error));
      }
      return extractAssistantText(json);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function handleApi(req, res) {
  const raw = await readBody(req);
  const payload = raw ? JSON.parse(raw) : {};

  if (req.url === "/api/bootstrap") {
    sendJson(res, 200, {
      ok: true,
      aiConfigured: hasUsableApiKey(),
      model: OPENAI_MODEL
    });
    return;
  }

  if (req.url === "/api/ai-seed") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const aiPayload = await chatJson(prompt.buildSeedMessages(), "开局生成", {
      maxTokens: 1600,
      repairMaxTokens: 1100,
      temperature: 0.82
    }, seedShape());
    const seed = normalizeAiSeed(aiPayload);
    sendJson(res, 200, { ok: true, character: seed.character, event: seed.event });
    return;
  }

  if (req.url === "/api/ai-character") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const skillOutput = await chatRoleSkill(prompt.buildCharacterMessages(), "人物生成", { maxTokens: 1250, repairMaxTokens: 1350, temperature: 0.86 });
    const character = normalizeAiCharacter(skillOutput);
    sendJson(res, 200, { ok: true, character, skillOutput });
    return;
  }

  if (req.url === "/api/custom-character") {
    sendJson(res, 400, { ok: false, error: "本地人物生成已关闭，请使用 AI 随机生成完整开局。" });
    return;
  }

  if (req.url === "/api/ai-event") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const character = payload.character || {};
    const aiPayload = await chatJson(prompt.buildEventMessages(character), "事件生成", {
      maxTokens: 850,
      repairMaxTokens: 700,
      temperature: 0.8
    }, eventShape());
    const event = normalizeAiEvent(aiPayload);
    sendJson(res, 200, { ok: true, event });
    return;
  }

  if (req.url === "/api/custom-event") {
    sendJson(res, 400, { ok: false, error: "本地事件生成已关闭，请使用 AI 随机生成起点事件。" });
    return;
  }

  if (req.url === "/api/start") {
    sendJson(res, 200, {
      ok: true,
      story: narrative.buildInitialStory(payload.character, payload.event)
    });
    return;
  }

  if (req.url === "/api/turn") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const story = normalizeStory(payload.story);
    if (!story) {
      sendJson(res, 400, { ok: false, error: "Missing story" });
      return;
    }
    const action = payload.action || { tag: "自定义行动", text: payload.text || "" };
    const rawText = await chat(prompt.buildTurnMessages(story, action), { maxTokens: 1400 });
    if (!rawText) throw new Error("AI 没有返回下一回合内容，请重试。");
    const beat = narrative.parseTurn(rawText, story, action);
    if (!beat) throw new Error("AI 下一回合格式不完整，请重试。");
    beat.choices = requireThreeChoices(beat.choices, "下一回合");
    const next = narrative.appendBeat(story, action, beat);
    sendJson(res, 200, { ok: true, story: next, beat, aiUsed: !!beat.skillOutput });
    return;
  }

  if (req.url === "/api/ai-choices") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const story = normalizeStory(payload.story);
    if (!story) {
      sendJson(res, 400, { ok: false, error: "Missing story" });
      return;
    }
    const latest = story.beats[story.beats.length - 1];
    const skillOutput = await chatRoleSkill(prompt.buildChoiceMessages(story), "选项生成", { maxTokens: 900, repairMaxTokens: 1050, temperature: 0.86 });
    const choices = normalizeAiChoices(skillOutput, story);
    latest.choices = choices;
    sendJson(res, 200, { ok: true, story, choices, skillOutput });
    return;
  }

  if (req.url === "/api/retrospect") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const story = normalizeStory(payload.story);
    if (!story) {
      sendJson(res, 400, { ok: false, error: "Missing story" });
      return;
    }
    const rawText = await chat(prompt.buildRetrospectMessages(story), { maxTokens: 700, temperature: 0.72 });
    if (!rawText) throw new Error("AI 没有返回回望内容，请重试。");
    const retrospect = narrative.parseRetrospect(rawText, story);
    if (!retrospect) throw new Error("AI 回望格式不完整，请重试。");
    sendJson(res, 200, { ok: true, retrospect });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch(error => {
      sendJson(res, 500, { ok: false, error: error.message || "Server error" });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Butterfly web app running at http://127.0.0.1:${PORT}`);
});
