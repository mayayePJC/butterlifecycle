const http = require("http");
const fs = require("fs");
const path = require("path");

const narrative = require("../utils/narrative");
const prompt = require("../utils/prompt");
const profileQuiz = require("../utils/profileQuiz");

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
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
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

function extractStreamDelta(payload) {
  if (!payload) return "";
  if (payload.type === "response.output_text.delta" && payload.delta) return String(payload.delta);
  if (typeof payload.delta === "string") return payload.delta;
  if (payload.choices && payload.choices.length) {
    const choice = payload.choices[0];
    if (choice.delta && typeof choice.delta.content === "string") return choice.delta.content;
    if (choice.message && typeof choice.message.content === "string") return choice.message.content;
    if (typeof choice.text === "string") return choice.text;
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

function coerceText(value) {
  if (Array.isArray(value)) {
    return value.map(coerceText).filter(Boolean).join("、").trim();
  }
  if (value && typeof value === "object") {
    return coerceText(value.text || value.title || value.name || value.label || value.identity || value.role || value.occupation || value.summary || value.description || value.profile || value.content);
  }
  return String(value || "").trim();
}

function firstText() {
  for (let index = 0; index < arguments.length; index += 1) {
    const text = coerceText(arguments[index]);
    if (text) return text;
  }
  return "";
}

function normalizePayloadObject(value, textKey) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  const text = coerceText(value);
  return text ? { [textKey]: text } : {};
}

function normalizeTextArray(value, label, max) {
  let list = [];
  if (Array.isArray(value)) {
    list = value.map(coerceText).filter(Boolean);
  } else {
    const text = coerceText(value);
    if (text) list = text.split(/[，,、;；]/).map(item => item.trim()).filter(Boolean);
  }
  if (!list.length) throw new Error(label + " 缺少有效文本。");
  return list.slice(0, max || 5);
}

function pickCharacterPayload(payload) {
  const source = payload || {};
  const writer = source.writer || {};
  const seed = source.seed || source.opening || writer.seed || writer.opening || {};
  const candidate = source.character ||
    writer.character ||
    seed.character ||
    source.persona ||
    writer.persona ||
    source.protagonist ||
    writer.protagonist ||
    source.main_character ||
    writer.main_character ||
    source.character_profile ||
    writer.character_profile ||
    source.profile_card ||
    writer.profile_card ||
    source.profile ||
    writer.profile ||
    (writer.identity || writer.title || writer.summary ? writer : null) ||
    source;
  return normalizePayloadObject(candidate, "identity");
}

function pickEventPayload(payload) {
  const source = payload || {};
  const writer = source.writer || {};
  const seed = source.seed || source.opening || writer.seed || writer.opening || {};
  const candidate = source.event ||
    writer.event ||
    seed.event ||
    writer.start_event ||
    source.start_event ||
    writer.opening_event ||
    source.opening_event ||
    writer.trigger_event ||
    source.trigger_event ||
    writer.inciting_incident ||
    source.inciting_incident ||
    (writer.event_text || writer.scene || writer.situation ? writer : null) ||
    source;
  return normalizePayloadObject(candidate, "text");
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
      text: requireText(choice && (choice.text || choice.action || choice.description || choice.content), label + " 第 " + (index + 1) + " 个选择")
    };
  });
  if (normalized.length !== 3) throw new Error(label + " 必须正好生成 3 个选择。");
  return normalized;
}

function normalizeAiCharacter(payload) {
  const source = pickCharacterPayload(payload);
  const selves = source.selves || source.six_selves || {};
  const summaryCandidate = firstText(source.summary, source.description, source.profile, source.background);
  const identity = requireText(firstText(
    source.identity,
    source.role,
    source.occupation,
    source.profession,
    source.job,
    source.name,
    source.title,
    source.label,
    source.protagonist,
    source.character_base,
    source.tagline,
    source.subtitle,
    source.short,
    summaryCandidate.slice(0, 24)
  ), "人物身份");
  const summary = requireText(firstText(summaryCandidate, identity), "人物摘要");
  const title = firstText(source.title, source.name, source.label, identity);
  const tagline = firstText(source.tagline, source.subtitle, source.one_liner, source.oneLiner, source.short, summary.slice(0, 28));
  return {
    id: "ai_character_" + Date.now(),
    title: requireText(title, "人物标题"),
    tagline: requireText(tagline, "人物短句"),
    identity,
    summary,
    inertia: normalizeTextArray(source.inertia || source.personality_inertia, "人格惯性", 5),
    desires: normalizeTextArray(source.desires || source.deep_desires || source.wants, "深层欲望", 4),
    fears: normalizeTextArray(source.fears || source.core_fears || source.shadows, "核心恐惧", 4),
    moralLine: requireText(firstText(source.moralLine, source.moral_line, source.moral_boundaries), "道德底线"),
    relationPulls: normalizeTextArray(source.relationPulls || source.relation_pulls || source.relationships, "关系牵引", 5),
    resources: normalizeTextArray(source.resources || source.resource_state, "资源状态", 5),
    selves: {
      subject: requireText(firstText(selves.subject, selves.i_self), "主体我"),
      object: requireText(firstText(selves.object, selves.me_self), "客体我"),
      material: requireText(firstText(selves.material, selves.material_self), "物质自我"),
      social: requireText(firstText(selves.social, selves.social_self), "社会自我"),
      spiritual: requireText(firstText(selves.spiritual, selves.spiritual_self), "精神自我"),
      pure: requireText(firstText(selves.pure, selves.pure_ego, source.personality_constant), "纯粹自我")
    }
  };
}

function normalizeAiEvent(payload) {
  const source = pickEventPayload(payload);
  const text = requireText(firstText(
    source.text,
    source.event_text,
    source.scene,
    source.situation,
    source.summary,
    source.description,
    source.premise,
    source.trigger,
    source.trigger_event,
    source.inciting_incident,
    source.opening,
    source.context
  ), "起点事件");
  return {
    id: "ai_event_" + Date.now(),
    text,
    innerReaction: requireText(firstText(source.innerReaction, source.inner_reaction, source.reaction, source.feeling), "起点内心反应"),
    pressure: requireText(firstText(source.pressure, source.reality_pressure, source.reality_or_temptation, source.conflict, source.cost), "起点现实压力"),
    choices: requireThreeChoices(source.choices, "起点事件")
  };
}

function normalizeAiSeed(payload) {
  return {
    character: normalizeAiCharacter(payload),
    event: normalizeAiEvent(payload)
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
        { tag: "顺着惯性", text: "" },
        { tag: "试探偏离", text: "" },
        { tag: "押上代价", text: "" }
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
        timeout: options.timeout || 75000,
        jsonMode: true
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
      timeout: options.timeout || 75000,
      jsonMode: true
    });
    return requireRoleSkillJson(repairText, label);
  }
}

async function chat(messages, options = {}) {
  if (!hasUsableApiKey()) throw new Error(missingKeyMessage());
  const timeout = options.timeout || 75000;
  const requestBody = {
    model: OPENAI_MODEL,
    messages,
    stream: false,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.82,
    max_tokens: options.maxTokens || 1200
  };
  if (typeof options.topP === "number") {
    requestBody.top_p = options.topP;
  }
  if (options.jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }
  const body = JSON.stringify(requestBody);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
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
    const text = await upstream.text();
    if (!upstream.ok) {
      throw new Error("AI 上游请求失败：" + (text || upstream.status));
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
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("AI 请求超时，请检查模型、网络或代理配置。");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function streamChat(messages, options, onDelta) {
  if (!hasUsableApiKey()) throw new Error(missingKeyMessage());
  const timeout = options.timeout || 75000;
  const requestBody = {
    model: OPENAI_MODEL,
    messages,
    stream: true,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.82,
    max_tokens: options.maxTokens || 1200
  };
  if (typeof options.topP === "number") {
    requestBody.top_p = options.topP;
  }
  if (options.jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const upstream = await fetch(OPENAI_BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      throw new Error("AI 上游请求失败：" + (text || upstream.status));
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    function handleLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return;
      const data = trimmed.indexOf("data:") === 0 ? trimmed.slice(5).trim() : trimmed;
      if (!data || data === "[DONE]") return;
      let parsed = null;
      try {
        parsed = JSON.parse(data);
      } catch (error) {
        return;
      }
      if (parsed && parsed.error) {
        throw new Error(parsed.error.message || JSON.stringify(parsed.error));
      }
      const delta = extractStreamDelta(parsed);
      if (delta) {
        fullText += delta;
        onDelta(delta, fullText);
      }
    }

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) handleLine(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const lines = buffer.split(/\r?\n/);
      for (const line of lines) handleLine(line);
    }
    return fullText;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("AI 请求超时，请检查模型、网络或代理配置。");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sendNdjson(res, body) {
  res.write(JSON.stringify(body) + "\n");
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

  if (req.url === "/api/profile-quiz") {
    sendJson(res, 200, {
      ok: true,
      questions: profileQuiz.publicQuestions()
    });
    return;
  }

  if (req.url === "/api/ai-seed") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const aiPayload = await chatJson(prompt.buildSeedMessages(), "开局生成", {
      maxTokens: 2400,
      repairMaxTokens: 1800,
      temperature: 0.95,
      topP: 0.98,
      jsonMode: true
    }, seedShape());
    const seed = normalizeAiSeed(aiPayload);
    sendJson(res, 200, { ok: true, character: seed.character, event: seed.event });
    return;
  }

  if (req.url === "/api/profile-seed") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    let profile;
    try {
      profile = profileQuiz.summarizeAnswers(payload.answers || {});
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || "选择题答案不完整" });
      return;
    }
    const aiPayload = await chatJson(prompt.buildProfileSeedMessages(profile), "半真实开局生成", {
      maxTokens: 2400,
      repairMaxTokens: 1800,
      temperature: 0.86,
      topP: 0.94,
      jsonMode: true
    }, seedShape());
    const seed = normalizeAiSeed(aiPayload);
    seed.character.lifeDimensions = profile.dimensions;
    seed.character.innerDimensions = profile.innerDimensions;
    seed.character.profileSummary = profile.summary;
    sendJson(res, 200, { ok: true, character: seed.character, event: seed.event, profile });
    return;
  }

  if (req.url === "/api/ai-character") {
    if (!hasUsableApiKey()) {
      sendJson(res, 400, { ok: false, error: missingKeyMessage() });
      return;
    }
    const skillOutput = await chatRoleSkill(prompt.buildCharacterMessages(), "人物生成", { maxTokens: 1500, repairMaxTokens: 1500, temperature: 0.92, topP: 0.98, jsonMode: true });
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
      maxTokens: 1100,
      repairMaxTokens: 900,
      temperature: 0.88,
      topP: 0.96,
      jsonMode: true
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
    const rawText = await chat(prompt.buildTurnMessages(story, action), {
      maxTokens: 1200,
      temperature: 0.78,
      topP: 0.94,
      timeout: 45000,
      jsonMode: true
    });
    if (!rawText) throw new Error("AI 没有返回下一回合内容，请重试。");
    const beat = narrative.parseTurn(rawText, story, action);
    if (!beat) throw new Error(narrative.describeTurnParseFailure(rawText));
    beat.choices = requireThreeChoices(beat.choices, "下一回合");
    const next = narrative.appendBeat(story, action, beat);
    sendJson(res, 200, { ok: true, story: next, beat, aiUsed: true });
    return;
  }

  if (req.url === "/api/turn-stream") {
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
    res.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive"
    });
    try {
      const rawText = await streamChat(prompt.buildTurnMessages(story, action), {
        maxTokens: 1200,
        temperature: 0.78,
        topP: 0.94,
        timeout: 45000,
        jsonMode: true
      }, (delta) => {
        sendNdjson(res, { type: "delta", text: delta });
      });
      if (!rawText) throw new Error("AI 没有返回下一回合内容，请重试。");
      const beat = narrative.parseTurn(rawText, story, action);
      if (!beat) throw new Error(narrative.describeTurnParseFailure(rawText));
      beat.choices = requireThreeChoices(beat.choices, "下一回合");
      const next = narrative.appendBeat(story, action, beat);
      sendNdjson(res, { type: "done", ok: true, story: next, beat, aiUsed: true });
      res.end();
    } catch (error) {
      sendNdjson(res, { type: "error", ok: false, error: error.message || "AI 生成失败" });
      res.end();
    }
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
    const skillOutput = await chatRoleSkill(prompt.buildChoiceMessages(story), "选项生成", { maxTokens: 1100, repairMaxTokens: 1100, temperature: 0.85, topP: 0.96, jsonMode: true });
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
    res.writeHead(200, {
      "content-type": MIME[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
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
