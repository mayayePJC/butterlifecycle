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
    stateNote: "起点事件仍在生活半径内，偏航尚未沉积。"
  };

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

  if (/保持安全|逃避|隐瞒|讨好/.test(tag)) {
    delta.inertia += 5;
    delta.momentDeviation -= 7;
    delta.realityPressure -= 2;
  } else if (/细微偏航|说出真话|保护弱者|求助/.test(tag)) {
    delta.inertia -= 4;
    delta.momentDeviation += 11;
    delta.sedimentation += 4;
    delta.realityPressure += 6;
  } else if (/冒险|越界|追逐|悬疑/.test(tag)) {
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

function extractSection(raw, name) {
  const text = raw || "";
  const startToken = "【" + name + "】";
  const start = text.indexOf(startToken);
  if (start < 0) return "";
  const rest = text.slice(start + startToken.length);
  const next = rest.search(/【[^】]+】/);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function parseSkillChoices(writer) {
  const choices = Array.isArray(writer && writer.choices) ? writer.choices : [];
  return choices.slice(0, 3).map(function (choice, index) {
    return {
      tag: choice.label || choice.tag || ("选项" + (index + 1)),
      intent: choice.intent || "",
      text: choice.text || ""
    };
  }).filter(function (choice) {
    return !!choice.text;
  });
}

function parseSkillTurn(raw, story) {
  const payload = tryParseJson(raw);
  if (!payload || !payload.writer || !payload.reviewer) return null;
  if (payload.reviewer.pass === false) return null;

  const writer = payload.writer;
  const choices = parseSkillChoices(writer);
  if (!writer.story_text || !writer.inner_reaction || !writer.reality_or_temptation || choices.length < 3) {
    return null;
  }

  const psychologist = payload.psychologist || {};
  const delta = psychologist.state_delta_suggestion || {};
  const fate = payload.fate_director || {};
  const genre = payload.genre_gatekeeper || {};

  return {
    id: makeId("beat"),
    turn: story.beats.length + 1,
    scene: writer.story_text,
    innerReaction: writer.inner_reaction,
    pressure: writer.reality_or_temptation,
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
  appendBeat,
  parseRetrospect
};
