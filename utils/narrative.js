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
    text: raw || "她在一个普通时刻遇到了一件微小却不肯过去的事。",
    innerReaction: "她一边告诉自己这没什么，一边已经感觉到生活的轨道轻轻偏了一下。",
    pressure: "旧习惯要求她立刻恢复正常，但新的问题已经留在她身上。",
    choices: [
      { tag: "保持安全", text: "尽量把这件事压回日常里。" },
      { tag: "细微偏航", text: "做一个很小但不完全符合惯性的回应。" },
      { tag: "冒险选择", text: "承认这件事重要，并为此付出一点代价。" }
    ]
  };
}

function buildInitialStory(character, event) {
  const firstBeat = {
    id: makeId("beat"),
    turn: 1,
    action: null,
    scene: event.text,
    innerReaction: event.innerReaction,
    pressure: event.pressure,
    choices: event.choices || [],
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
    const fallbackLabels = ["回到惯性", "轻微偏航", "高偏航"];
    return {
      tag: choice.label || fallbackLabels[index] || "行动",
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
    } else if (cleaned) {
      choices.push({ tag: "行动", text: cleaned });
    }
  });

  return choices.slice(0, 3);
}

function fallbackChoices(story) {
  const pressure = story.hiddenStatus.realityPressure;
  const strange = story.hiddenStatus.worldStrangeness;
  if (strange > 20) {
    return [
      { tag: "保持安全", text: "把异常先藏起来，回到能解释的日常。" },
      { tag: "追问", text: "沿着刚才的线索继续查下去。" },
      { tag: "求助", text: "把一部分真相告诉可信的人。" }
    ];
  }
  if (pressure > 60) {
    return [
      { tag: "旧习惯", text: "先道歉，把眼前的压力熬过去。" },
      { tag: "说出真话", text: "承认自己的选择，也承认它带来的麻烦。" },
      { tag: "求助", text: "向一个可能理解她的人开口。" }
    ];
  }
  return [
    { tag: "保持安全", text: "退回熟悉的位置，让事情慢慢冷掉。" },
    { tag: "细微偏航", text: "做一个很小但清醒的反应。" },
    { tag: "冒险选择", text: "继续向前一步，不急着把自己解释干净。" }
  ];
}

function parseTurn(raw, story) {
  const skillTurn = parseSkillTurn(raw, story);
  if (skillTurn) return skillTurn;

  const choices = parseChoices(extractSection(raw, "选项"));
  const statusText = extractSection(raw, "状态");
  return {
    id: makeId("beat"),
    turn: story.beats.length + 1,
    scene: extractSection(raw, "外部剧情") || raw || "事情没有像她预想的那样结束。",
    innerReaction: extractSection(raw, "内心反应") || "她发现自己无法立刻回到从前的状态。",
    pressure: extractSection(raw, "现实回拽") || "生活仍然用钱、时间、关系和旧习惯拉住她。",
    choices: choices.length ? choices : fallbackChoices(story),
    stateNote: statusText || "这次选择留下了轻微余震。",
    aiRaw: raw
  };
}

function fallbackTurn(story, actionInput) {
  const action = normalizeAction(actionInput);
  const character = story.character;
  const turn = story.beats.length + 1;
  const everyFourth = turn % 4 === 0;
  const scene = "她选择了：" + action.text + "。事情没有立刻变得戏剧化，只是某个细节开始不肯归位。有人看见了她的迟疑，也有人把她的沉默误解成默认。";
  const inner = "她想把这次选择解释成偶然，可身体比语言诚实。她知道，自己刚才至少有一瞬间不再完全服从旧习惯。";
  const pressure = everyFourth
    ? "现实很快回拽她：消息、账单、工作和关系一起涌来，提醒她任何偏航都要付出具体代价。"
    : "现实没有给她掌声，只给她更难回答的问题。";

  return {
    id: makeId("beat"),
    turn,
    scene,
    innerReaction: inner,
    pressure,
    choices: fallbackChoices(story),
    stateNote: character.title + "仍然像同一个人，只是惯性被轻轻挪动了一寸。"
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
  const latestChoice = story.importantChoices.length
    ? story.importantChoices[story.importantChoices.length - 1].text
    : story.event.text;

  return {
    quote: extractSection(raw, "回望") || raw || "她没有抵达结局，只是从一段人生里暂时走出来。",
    lost: extractSection(raw, "失去") || "一部分无条件的顺从",
    gained: extractSection(raw, "获得") || "一次看见自己的机会",
    strongerSelf: extractSection(raw, "变强的自我") || "精神自我",
    oldSelf: extractSection(raw, "仍在拖拽的旧我") || "那个害怕代价的旧我",
    keyChoice: extractSection(raw, "最重要的选择") || latestChoice,
    tags: (extractSection(raw, "标签") || "偏航,余震")
      .split(/[，,、\s]+/)
      .filter(Boolean)
      .slice(0, 3),
    raw
  };
}

function fallbackRetrospect(story) {
  const character = story.character;
  const status = story.hiddenStatus;
  const latestChoice = story.importantChoices.length
    ? story.importantChoices[story.importantChoices.length - 1].text
    : story.event.text;
  const changed = status.sedimentation > 18 ? "她已经不只是偶尔偏航，而是开始把新的选择沉进骨头里。" : "她还没有彻底改变，但旧生活已经不能完整地解释她。";

  return {
    quote: character.title + "暂时停在这里。" + changed + "她失去了一点不用负责的安全感，也获得了看见自己的距离。",
    lost: "一部分不用选择的安稳",
    gained: status.worldStrangeness > 18 ? "辨认异常的敏感" : "承认欲望的勇气",
    strongerSelf: status.sedimentation > 16 ? "精神自我" : "主体我",
    oldSelf: character.fears[0] || "旧恐惧",
    keyChoice: latestChoice,
    tags: ["偏航", "代价"]
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
  fallbackTurn,
  appendBeat,
  parseRetrospect,
  fallbackRetrospect
};
