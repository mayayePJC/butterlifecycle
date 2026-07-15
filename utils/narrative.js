const constants = require("./constants");

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pick(list) {
  return list[randomInt(list.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}

const LIFE_DIMENSIONS = [
  { key: "self", name: "自我" },
  { key: "relation", name: "关系" },
  { key: "resources", name: "资源" },
  { key: "body", name: "身体" },
  { key: "world", name: "世界" }
];

const INNER_DIMENSIONS = [
  { key: "agency", name: "能动性" },
  { key: "courage", name: "勇气" },
  { key: "clarity", name: "清明" },
  { key: "resilience", name: "韧性" },
  { key: "flexibility", name: "灵活性" }
];

function getCharacterCards() {
  return constants.CHARACTER_PRESETS.slice();
}

function createCharacterFromText(text) {
  const raw = (text || "").trim();
  const clipped = raw.length > 120 ? raw.slice(0, 120) + "..." : raw;
  return {
    id: makeId("custom_character"),
    title: "被写下的人",
    tagline: "她从一句描述里醒来",
    identity: clipped || "一个普通人",
    summary: clipped || "她还没有被完整讲述，但生活已经开始推着她往前走。",
    inertia: ["迟疑", "自我保护", "习惯沉默"],
    desires: ["被理解", "重新选择"],
    fears: ["失控", "被误解", "付出代价"],
    moralLine: "不会轻易伤害无辜的人。",
    relationPulls: ["旧关系", "陌生人的目光", "生活里的责任"],
    resources: ["一点时间", "尚未耗尽的力气", "不稳定的信息"],
    selves: {
      subject: "正在试探自己能走多远。",
      object: "还没有确定自己是哪一种人。",
      material: "随身物件和生活痕迹仍然朴素。",
      social: "在别人眼中只是一个普通人。",
      spiritual: "想从惯性里拿回一点选择权。",
      pure: "仍然保留某种不肯消失的连续感。"
    }
  };
}

function pickEvent(character) {
  const event = Object.assign({}, pick(constants.EVENT_LIBRARY));
  event.characterHint = character ? character.identity : "";
  return event;
}

function createEventFromText(text) {
  const raw = (text || "").trim();
  return {
    id: makeId("custom_event"),
    text: raw,
    innerReaction: "",
    pressure: "",
    choices: []
  };
}

function normalizeChoices(choices) {
  const list = Array.isArray(choices) ? choices : [];
  const normalized = list.slice(0, 3).map(function (choice, index) {
    if (typeof choice === "string") {
      return null;
    }
    return {
      tag: choice && (choice.tag || choice.label) || "",
      intent: choice && choice.intent || "",
      text: choice && choice.text || ""
    };
  }).filter(function (choice) {
    return !!choice && !!choice.tag && !!choice.text;
  });
  return normalized.length >= 3 ? normalized : null;
}

function normalizeLifeDimensions(value) {
  const source = value || {};
  const normalized = {};
  LIFE_DIMENSIONS.forEach(function (dimension) {
    const raw = source[dimension.key];
    const score = raw && typeof raw === "object" ? raw.score : raw;
    const number = Number(score);
    normalized[dimension.key] = {
      name: dimension.name,
      score: clamp(isFinite(number) ? Math.round(number) : 50, 0, 100)
    };
  });
  return normalized;
}

function normalizeInnerDimensions(value) {
  const source = value || {};
  const normalized = {};
  INNER_DIMENSIONS.forEach(function (dimension) {
    const raw = source[dimension.key];
    const score = raw && typeof raw === "object" ? raw.score : raw;
    const number = Number(score);
    normalized[dimension.key] = {
      name: dimension.name,
      score: clamp(isFinite(number) ? Math.round(number) : 50, 0, 100)
    };
  });
  return normalized;
}

function deriveInitialLifeDimensions(character) {
  const base = normalizeLifeDimensions(character && character.lifeDimensions);
  if (character && character.lifeDimensions) return base;

  const text = JSON.stringify(character || {});
  const add = {
    self: /自由|选择|重新|远方|作品|好奇|判断/.test(text) ? 8 : 0,
    relation: /家|母|父|伴侣|孩子|同事|客户|关系|责任|期待|亏欠/.test(text) ? 8 : 0,
    resources: /钱|存款|技能|证件|工具|履历|工作|收入|资源/.test(text) ? 6 : 0,
    body: /疲惫|失眠|身体|病|伤|累|透支|睡/.test(text) ? -8 : 0,
    world: /制度|城市|行业|规则|公司|时代|站|局|档案|审查|债/.test(text) ? 8 : 0
  };

  Object.keys(add).forEach(function (key) {
    base[key].score = clamp(base[key].score + add[key], 0, 100);
  });
  return base;
}

function deriveInitialInnerDimensions(character) {
  const base = normalizeInnerDimensions(character && character.innerDimensions);
  if (character && character.innerDimensions) return base;

  const text = JSON.stringify(character || {});
  const add = {
    agency: /自由|选择|决定|主动|重新|主体|拿回/.test(text) ? 8 : 0,
    courage: /拒绝|冒险|越界|代价|押|勇敢|说出/.test(text) ? 7 : 0,
    clarity: /判断|清楚|体感|看见|明白|整理|秩序/.test(text) ? 7 : 0,
    resilience: /长期|撑|恢复|练习|坚持|修补|承受/.test(text) ? 6 : 0,
    flexibility: /试探|小步|转向|机会|岔路|变化|窗口/.test(text) ? 7 : 0
  };

  if (/疲惫|失眠|透支|累|麻木/.test(text)) add.resilience -= 6;
  if (/期待|亏欠|依赖|评价|关系/.test(text)) add.courage -= 3;

  Object.keys(add).forEach(function (key) {
    base[key].score = clamp(base[key].score + add[key], 0, 100);
  });
  return base;
}

function classifyActionIntent(action) {
  const text = ((action && action.intent) || "") + " " + ((action && action.tag) || "") + " " + ((action && action.text) || "");
  if (/return_to_inertia|顺着惯性|回到惯性|保持安全|退回|逃避|隐瞒|讨好/.test(text)) return "return";
  if (/high_deviation|押上代价|高偏航|冒险|越界|追逐|悬疑/.test(text)) return "high";
  return "mild";
}

function estimateLifeDimensionDelta(action, mergedDelta) {
  const intent = classifyActionIntent(action);
  const delta = {
    self: 0,
    relation: 0,
    resources: 0,
    body: 0,
    world: 0
  };

  if (intent === "return") {
    delta.self -= 2;
    delta.relation += 2;
    delta.resources += 2;
    delta.body += 1;
    delta.world -= 1;
  } else if (intent === "high") {
    delta.self += 5;
    delta.relation -= 4;
    delta.resources -= 5;
    delta.body -= 3;
    delta.world += 4;
  } else {
    delta.self += 3;
    delta.relation -= 1;
    delta.resources -= 1;
    delta.body -= 1;
    delta.world += 1;
  }

  delta.self += Math.round((mergedDelta.sedimentation || 0) * 0.35);
  delta.resources -= Math.max(0, Math.round((mergedDelta.realityPressure || 0) * 0.18));
  delta.body -= Math.max(0, Math.round((mergedDelta.realityPressure || 0) * 0.16));
  delta.world += Math.round((mergedDelta.worldStrangeness || 0) * 0.5);

  return delta;
}

function estimateInnerDimensionDelta(action, mergedDelta) {
  const intent = classifyActionIntent(action);
  const delta = {
    agency: 0,
    courage: 0,
    clarity: 0,
    resilience: 0,
    flexibility: 0
  };

  if (intent === "return") {
    delta.agency -= 2;
    delta.courage -= 3;
    delta.clarity += 1;
    delta.resilience += 1;
    delta.flexibility -= 1;
  } else if (intent === "high") {
    delta.agency += 4;
    delta.courage += 5;
    delta.clarity += 1;
    delta.resilience -= 2;
    delta.flexibility += 2;
  } else {
    delta.agency += 3;
    delta.courage += 2;
    delta.clarity += 2;
    delta.resilience += 1;
    delta.flexibility += 3;
  }

  delta.agency += Math.round((mergedDelta.sedimentation || 0) * 0.25);
  delta.courage += Math.round((mergedDelta.momentDeviation || 0) * 0.2);
  delta.clarity += Math.round((mergedDelta.sedimentation || 0) * 0.2);
  delta.resilience += Math.round((mergedDelta.sedimentation || 0) * 0.18);
  delta.flexibility += Math.round((mergedDelta.worldStrangeness || 0) * 0.25);

  const pressure = Math.max(0, mergedDelta.realityPressure || 0);
  delta.clarity -= Math.round(pressure * 0.08);
  delta.resilience -= Math.round(pressure * 0.12);

  return delta;
}

function applyLifeDimensionDelta(current, delta) {
  const source = normalizeLifeDimensions(current);
  const next = {};
  LIFE_DIMENSIONS.forEach(function (dimension) {
    next[dimension.key] = {
      name: dimension.name,
      score: clamp(source[dimension.key].score + Math.round(delta[dimension.key] || 0), 0, 100)
    };
  });
  return next;
}

function applyInnerDimensionDelta(current, delta) {
  const source = normalizeInnerDimensions(current);
  const next = {};
  INNER_DIMENSIONS.forEach(function (dimension) {
    next[dimension.key] = {
      name: dimension.name,
      score: clamp(source[dimension.key].score + Math.round(delta[dimension.key] || 0), 0, 100)
    };
  });
  return next;
}

function makeDimensionSnapshot(turn, dimensions, action, note) {
  return {
    turn,
    action: action ? { tag: action.tag, text: action.text } : null,
    values: normalizeLifeDimensions(dimensions),
    note: note || "",
    createdAt: Date.now()
  };
}

function makeInnerDimensionSnapshot(turn, dimensions, action, note) {
  return {
    turn,
    action: action ? { tag: action.tag, text: action.text } : null,
    values: normalizeInnerDimensions(dimensions),
    note: note || "",
    createdAt: Date.now()
  };
}

function buildInitialStory(character, event) {
  const choices = normalizeChoices(event && event.choices);
  if (!choices) {
    throw new Error("起点事件缺少 AI 生成的 3 个选择，请重新生成事件。");
  }
  const firstBeat = {
    id: makeId("beat"),
    turn: 1,
    action: null,
    scene: event.text,
    innerReaction: event.innerReaction,
    pressure: event.pressure,
    choices,
    stateNote: "开局惯性已经显形，转向尚未开始沉积。"
  };

  const lifeDimensions = deriveInitialLifeDimensions(character);
  const innerDimensions = deriveInitialInnerDimensions(character);
  return {
    id: makeId("story"),
    character,
    event,
    beats: [firstBeat],
    hiddenStatus: {
      inertia: 68,
      momentDeviation: 0,
      sedimentation: 0,
      realityPressure: 28,
      worldStrangeness: 2
    },
    lifeDimensions,
    innerDimensions,
    dimensionHistory: [
      makeDimensionSnapshot(1, lifeDimensions, null, "开局五维")
    ],
    innerDimensionHistory: [
      makeInnerDimensionSnapshot(1, innerDimensions, null, "开局内在能力")
    ],
    causalDebt: [],
    importantChoices: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalizeAction(action) {
  if (typeof action === "string") {
    return { tag: "自定义行动", text: action };
  }
  return action || { tag: "沉默", text: "她没有立刻做出选择。" };
}

function estimateDelta(action, turnCount) {
  const tag = (action.tag || "") + " " + (action.text || "");
  const delta = {
    inertia: 0,
    momentDeviation: 0,
    sedimentation: 0,
    realityPressure: 0,
    worldStrangeness: 0
  };

  if (/顺着惯性|回到惯性|保持安全|逃避|隐瞒|讨好/.test(tag)) {
    delta.inertia += 5;
    delta.momentDeviation -= 7;
    delta.realityPressure -= 2;
  } else if (/试探偏离|细微偏航|说出真话|保护弱者|求助/.test(tag)) {
    delta.inertia -= 4;
    delta.momentDeviation += 11;
    delta.sedimentation += 4;
    delta.realityPressure += 6;
  } else if (/押上代价|高偏航|冒险|越界|追逐|悬疑/.test(tag)) {
    delta.inertia -= 7;
    delta.momentDeviation += 16;
    delta.sedimentation += 5;
    delta.realityPressure += 9;
    delta.worldStrangeness += 4;
  } else {
    delta.momentDeviation += 8;
    delta.sedimentation += 2;
    delta.realityPressure += 4;
  }

  if (turnCount > 0 && turnCount % 4 === 0) {
    delta.realityPressure += 8;
    delta.momentDeviation -= 3;
  }

  return delta;
}

function parseNumberDelta(text, name) {
  if (!text) return 0;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(escaped + "\\s*[:：]?\\s*([+-]?\\d+)", "i"));
  return match ? Number(match[1]) || 0 : 0;
}

function applyStatusDelta(status, delta) {
  return {
    inertia: clamp(status.inertia + delta.inertia, 0, 100),
    momentDeviation: clamp(status.momentDeviation + delta.momentDeviation, 0, 100),
    sedimentation: clamp(status.sedimentation + delta.sedimentation, 0, 100),
    realityPressure: clamp(status.realityPressure + delta.realityPressure, 0, 100),
    worldStrangeness: clamp(status.worldStrangeness + delta.worldStrangeness, 0, 100)
  };
}

function normalizeNumber(value) {
  const number = Number(value);
  if (!isFinite(number)) return 0;
  return clamp(Math.round(number), -20, 20);
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
      } catch (innerError) {
        return null;
      }
    }
  }
  return null;
}

function coerceText(value) {
  if (Array.isArray(value)) {
    return value.map(coerceText).filter(Boolean).join("、").trim();
  }
  if (value && typeof value === "object") {
    return coerceText(
      value.text ||
      value.story_text ||
      value.scene ||
      value.narrative ||
      value.content ||
      value.description ||
      value.summary ||
      value.title ||
      value.name ||
      value.label
    );
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

function extractSection(raw, name) {
  const text = raw || "";
  const startToken = "【" + name + "】";
  const start = text.indexOf(startToken);
  if (start < 0) return "";
  const rest = text.slice(start + startToken.length);
  const next = rest.search(/【[^】]+】/);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function pickSkillChoices(writer) {
  const source = writer || {};
  const choices = source.choices ||
    source.next_choices ||
    source.options ||
    source.actions ||
    source.next_actions ||
    source.action_options;
  return Array.isArray(choices) ? choices : [];
}

function parseSkillChoices(writer) {
  const choices = pickSkillChoices(writer);
  return choices.slice(0, 3).map(function (choice, index) {
    const tag = coerceText(choice && (choice.label || choice.tag || choice.intent || choice.name || choice.type));
    const text = coerceText(choice && (choice.text || choice.action || choice.description || choice.content || choice.choice));
    if (!tag || !text) return null;
    return {
      tag,
      intent: coerceText(choice && choice.intent),
      text
    };
  }).filter(function (choice) {
    return !!choice;
  });
}

function parseSkillTurn(raw, story) {
  const payload = tryParseJson(raw);
  if (!payload || !payload.writer || !payload.reviewer) return null;
  if (payload.reviewer.pass === false) return null;

  const writer = payload.writer;
  const choices = parseSkillChoices(writer);
  const scene = firstText(
    writer.story_text,
    writer.scene,
    writer.external_story,
    writer.external_result,
    writer.narrative,
    writer.text,
    writer.story,
    writer.result,
    writer.content
  );
  const innerReaction = firstText(
    writer.inner_reaction,
    writer.innerReaction,
    writer.inner,
    writer.internal_reaction,
    writer.psychological_reaction,
    writer.reaction,
    writer.feeling
  );
  const pressure = firstText(
    writer.reality_or_temptation,
    writer.pressure,
    writer.reality_pressure,
    writer.realityPullback,
    writer.reality_pullback,
    writer.temptation,
    writer.conflict,
    writer.cost
  );
  if (!scene || !innerReaction || !pressure || choices.length < 3) {
    return null;
  }

  const psychologist = payload.psychologist || {};
  const delta = psychologist.state_delta_suggestion || {};
  const fate = payload.fate_director || {};
  const genre = payload.genre_gatekeeper || {};

  return {
    id: makeId("beat"),
    turn: story.beats.length + 1,
    scene,
    innerReaction,
    pressure,
    choices,
    stateNote: [
      "惯性:" + normalizeNumber(delta.inertia_strength),
      "瞬时偏航:" + normalizeNumber(delta.instant_deviation),
      "人格沉积:" + normalizeNumber(delta.personality_sediment),
      "现实压力:" + normalizeNumber(delta.reality_pressure),
      "世界异化:" + normalizeNumber(delta.world_strangeness)
    ].join("；"),
    skillOutput: payload,
    archivist: payload.archivist || {},
    review: payload.reviewer,
    fateNote: fate.thread_to_advance || fate.reality_pullback || "",
    genreNote: genre.genre_door_can_open || genre.max_strangeness_this_turn || "",
    aiRaw: raw
  };
}

function parseChoices(text) {
  const lines = (text || "").split(/\n+/).map(function (line) {
    return line.trim();
  }).filter(Boolean);

  const choices = [];
  lines.forEach(function (line) {
    const cleaned = line.replace(/^\d+[.、]\s*/, "").replace(/^[-*]\s*/, "");
    const match = cleaned.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (match) {
      choices.push({ tag: match[1].trim(), text: match[2].trim() });
    }
  });

  return choices.slice(0, 3);
}

function parseTurn(raw, story, actionInput) {
  const skillTurn = parseSkillTurn(raw, story);
  if (skillTurn) return skillTurn;

  const choices = parseChoices(extractSection(raw, "选项"));
  const statusText = extractSection(raw, "状态");
  const sceneText = extractSection(raw, "外部剧情");
  const innerReaction = extractSection(raw, "内心反应");
  const pressure = extractSection(raw, "现实回拽");
  if (!sceneText || !innerReaction || !pressure || choices.length < 3) {
    return null;
  }
  return {
    id: makeId("beat"),
    turn: story.beats.length + 1,
    scene: sceneText,
    innerReaction,
    pressure,
    choices,
    stateNote: statusText,
    aiRaw: raw
  };
}

function listKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "无";
  const keys = Object.keys(value).slice(0, 16);
  return keys.length ? keys.join(", ") : "空对象";
}

function compactExcerpt(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function describeTurnParseFailure(raw) {
  const expected = "需要 writer.story_text/scene/narrative、writer.inner_reaction/innerReaction、writer.reality_or_temptation/pressure，以及 writer.choices/next_choices 的 3 个有效选项。";
  const payload = tryParseJson(raw);
  const excerpt = compactExcerpt(raw);
  if (!payload) {
    return "AI 下一回合格式不完整：" + expected + (excerpt ? " 返回片段：" + excerpt : "");
  }
  if (payload.reviewer && payload.reviewer.pass === false) {
    const issues = Array.isArray(payload.reviewer.blocking_issues) ? payload.reviewer.blocking_issues.filter(Boolean).join("；") : "";
    return "AI 下一回合被审稿官退回：" + (issues || "reviewer.pass=false") + (excerpt ? " 返回片段：" + excerpt : "");
  }
  return [
    "AI 下一回合格式不完整：" + expected,
    "实际顶层字段：" + listKeys(payload),
    "writer 字段：" + listKeys(payload.writer),
    excerpt ? "返回片段：" + excerpt : ""
  ].filter(Boolean).join(" ");
}

function appendBeat(story, actionInput, beatInput) {
  const action = normalizeAction(actionInput);
  const beat = Object.assign({}, beatInput, {
    id: beatInput.id || makeId("beat"),
    turn: story.beats.length + 1,
    action
  });
  const ruleDelta = estimateDelta(action, story.beats.length + 1);
  const aiDelta = {
    inertia: parseNumberDelta(beat.stateNote, "惯性"),
    momentDeviation: parseNumberDelta(beat.stateNote, "瞬时偏航"),
    sedimentation: parseNumberDelta(beat.stateNote, "人格沉积"),
    realityPressure: parseNumberDelta(beat.stateNote, "现实压力"),
    worldStrangeness: parseNumberDelta(beat.stateNote, "世界异化")
  };
  const mergedDelta = {
    inertia: ruleDelta.inertia + Math.round(aiDelta.inertia * 0.4),
    momentDeviation: ruleDelta.momentDeviation + Math.round(aiDelta.momentDeviation * 0.4),
    sedimentation: ruleDelta.sedimentation + Math.round(aiDelta.sedimentation * 0.4),
    realityPressure: ruleDelta.realityPressure + Math.round(aiDelta.realityPressure * 0.4),
    worldStrangeness: ruleDelta.worldStrangeness + Math.round(aiDelta.worldStrangeness * 0.4)
  };

  const hiddenStatus = applyStatusDelta(story.hiddenStatus, mergedDelta);
  const lifeDimensionDelta = estimateLifeDimensionDelta(action, mergedDelta);
  const lifeDimensions = applyLifeDimensionDelta(story.lifeDimensions || deriveInitialLifeDimensions(story.character), lifeDimensionDelta);
  const innerDimensionDelta = estimateInnerDimensionDelta(action, mergedDelta);
  const innerDimensions = applyInnerDimensionDelta(story.innerDimensions || deriveInitialInnerDimensions(story.character), innerDimensionDelta);
  const dimensionHistory = (story.dimensionHistory || [
    makeDimensionSnapshot(1, story.lifeDimensions || deriveInitialLifeDimensions(story.character), null, "开局五维")
  ]).concat([
    makeDimensionSnapshot(beat.turn, lifeDimensions, action, "选择后的五维变化")
  ]).slice(-20);
  const innerDimensionHistory = (story.innerDimensionHistory || [
    makeInnerDimensionSnapshot(1, story.innerDimensions || deriveInitialInnerDimensions(story.character), null, "开局内在能力")
  ]).concat([
    makeInnerDimensionSnapshot(beat.turn, innerDimensions, action, "选择后的内在能力变化")
  ]).slice(-20);
  const importantChoices = story.importantChoices.slice();
  if (mergedDelta.sedimentation >= 4 || importantChoices.length === 0) {
    importantChoices.push({
      turn: beat.turn,
      tag: action.tag,
      text: action.text
    });
  }

  const causalDebt = story.causalDebt.slice();
  if (mergedDelta.worldStrangeness > 3) {
    causalDebt.push("第 " + beat.turn + " 回合的异常需要在后续用具体代价偿还。");
  }
  if (beat.skillOutput && beat.skillOutput.genre_gatekeeper) {
    const required = beat.skillOutput.genre_gatekeeper.causal_debt_required || [];
    required.forEach(function (debt) {
      if (debt) causalDebt.push(String(debt));
    });
  }
  if (beat.skillOutput && beat.skillOutput.fate_director && beat.skillOutput.fate_director.cost) {
    causalDebt.push("代价：" + beat.skillOutput.fate_director.cost);
  }

  const openThreads = (story.openThreads || []).slice();
  if (beat.skillOutput && beat.skillOutput.archivist) {
    (beat.skillOutput.archivist.open_threads || []).forEach(function (thread) {
      if (thread) openThreads.push(String(thread));
    });
  }
  if (beat.skillOutput && beat.skillOutput.fate_director && beat.skillOutput.fate_director.thread_to_advance) {
    openThreads.push(String(beat.skillOutput.fate_director.thread_to_advance));
  }

  const knownFacts = (story.knownFacts || []).slice();
  if (beat.skillOutput && beat.skillOutput.archivist) {
    (beat.skillOutput.archivist.confirmed_facts || []).forEach(function (fact) {
      if (fact) knownFacts.push(String(fact));
    });
  }

  return Object.assign({}, story, {
    beats: story.beats.concat([beat]),
    hiddenStatus,
    lifeDimensions,
    innerDimensions,
    dimensionHistory,
    innerDimensionHistory,
    importantChoices: importantChoices.slice(-6),
    causalDebt: causalDebt.slice(-6),
    openThreads: openThreads.slice(-8),
    knownFacts: knownFacts.slice(-10),
    updatedAt: Date.now()
  });
}

function parseRetrospect(raw, story) {
  const quote = extractSection(raw, "回望");
  const lost = extractSection(raw, "失去");
  const gained = extractSection(raw, "获得");
  const strongerSelf = extractSection(raw, "变强的自我");
  const oldSelf = extractSection(raw, "仍在拖拽的旧我");
  const keyChoice = extractSection(raw, "最重要的选择");
  const tags = (extractSection(raw, "标签") || "")
    .split(/[，,、\s]+/)
    .filter(Boolean)
    .slice(0, 3);

  if (!quote || !lost || !gained || !strongerSelf || !oldSelf || !keyChoice || !tags.length) {
    return null;
  }

  return {
    quote,
    lost,
    gained,
    strongerSelf,
    oldSelf,
    keyChoice,
    tags,
    raw
  };
}

module.exports = {
  getCharacterCards,
  createCharacterFromText,
  pickEvent,
  createEventFromText,
  buildInitialStory,
  parseTurn,
  parseSkillTurn,
  describeTurnParseFailure,
  appendBeat,
  parseRetrospect
};
