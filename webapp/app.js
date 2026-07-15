const state = {
  character: null,
  event: null,
  story: null,
  retrospect: null,
  loading: false,
  streamText: "",
  openingMode: "ai",
  quizQuestions: [],
  quizAnswers: {},
  quizProfile: null,
  quizLoading: false,
  quizLoadError: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const RADAR_POSITION_KEY = "butterlife_radar_position";

const LIFE_DIMENSION_ORDER = [
  { key: "self", name: "Self" },
  { key: "relation", name: "Relation" },
  { key: "resources", name: "Resources" },
  { key: "body", name: "Body" },
  { key: "world", name: "World" }
];

const INNER_DIMENSION_ORDER = [
  { key: "agency", name: "Agency" },
  { key: "courage", name: "Courage" },
  { key: "clarity", name: "Clarity" },
  { key: "resilience", name: "Resilience" },
  { key: "flexibility", name: "Flexibility" }
];

const PROFILE_QUIZ_FALLBACK = [
  {
    id: "self_new_direction",
    group: "自我",
    text: "当你很想尝试一个新方向时，第一反应通常是？",
    options: [
      { id: "stability_math", text: "先算它会不会影响收入和稳定" },
      { id: "others_view", text: "先想别人会不会觉得我不靠谱" },
      { id: "self_doubt", text: "先兴奋一下，然后很快开始自我怀疑" },
      { id: "too_tired", text: "先拖着，因为现在真的太累了" }
    ]
  },
  {
    id: "self_decision_style",
    group: "自我",
    text: "一个选择没有标准答案时，你更常怎么做？",
    options: [
      { id: "wait_for_proof", text: "等更多证据，直到它看起来足够安全" },
      { id: "ask_people", text: "问几个重要的人，先看他们的反应" },
      { id: "small_test", text: "先做一个很小、可撤回的试验" },
      { id: "hard_cut", text: "忍到某个点后突然切断旧路" }
    ]
  },
  {
    id: "self_wish",
    group: "自我",
    text: "你最难承认的愿望更接近哪一种？",
    options: [
      { id: "more_freedom", text: "我想要更自由的时间和节奏" },
      { id: "be_seen", text: "我想被认真看见，而不是只被需要" },
      { id: "start_over", text: "我想从某个身份里重新开始" },
      { id: "rest_first", text: "我想先停下来，不再证明什么" }
    ]
  },
  {
    id: "relation_disappoint",
    group: "关系",
    text: "想到改变现状时，最容易浮现的是谁？",
    options: [
      { id: "family_expectation", text: "家人或伴侣的期待" },
      { id: "team_dependency", text: "工作伙伴或团队对我的依赖" },
      { id: "past_self", text: "过去那个努力撑到现在的自己" },
      { id: "future_no_one", text: "未来可能没有人接住我" }
    ]
  },
  {
    id: "relation_support",
    group: "关系",
    text: "你最需要别人给你的支持是？",
    options: [
      { id: "practical_help", text: "具体帮忙分担一些现实事务" },
      { id: "permission", text: "允许我不那么可靠一次" },
      { id: "quiet_company", text: "不用劝我，只安静陪我想清楚" },
      { id: "distance", text: "给我一点距离，别立刻评价" }
    ]
  },
  {
    id: "relation_pattern",
    group: "关系",
    text: "在人际关系里，你最常重复的模式是？",
    options: [
      { id: "over_responsible", text: "先照顾局面，之后才想自己" },
      { id: "avoid_need", text: "不太开口要东西，怕显得麻烦" },
      { id: "prove_value", text: "通过有用来证明自己值得被留下" },
      { id: "quick_withdraw", text: "一旦失望，就很想迅速撤离" }
    ]
  },
  {
    id: "resource_blank",
    group: "资源",
    text: "如果人生突然给你三个月空白，你最可能先担心？",
    options: [
      { id: "money", text: "钱和下一步安排" },
      { id: "resume_gap", text: "履历中断后怎么解释" },
      { id: "waste_time", text: "怕自己浪费这段时间" },
      { id: "sleep", text: "可能会先睡很久，恢复一点知觉" }
    ]
  },
  {
    id: "resource_asset",
    group: "资源",
    text: "你现在最可靠的资源是什么？",
    options: [
      { id: "skill", text: "某种可变现的技能或经验" },
      { id: "discipline", text: "长期自律和解决问题的能力" },
      { id: "network", text: "一些信任我的人和关系" },
      { id: "taste", text: "审美、判断力或对方向的敏感" }
    ]
  },
  {
    id: "resource_cost",
    group: "资源",
    text: "你最难承受哪种试错成本？",
    options: [
      { id: "income_drop", text: "收入明显下降" },
      { id: "status_loss", text: "已有身份和履历失效" },
      { id: "time_loss", text: "投入很久却没有结果" },
      { id: "trust_loss", text: "重要的人不再相信我" }
    ]
  },
  {
    id: "body_signal",
    group: "身体",
    text: "你的身体最近最常发出的信号是？",
    options: [
      { id: "tired", text: "累，恢复很慢" },
      { id: "tense", text: "紧绷，停下来也不太放松" },
      { id: "numb", text: "麻木，对很多事没感觉" },
      { id: "ok_but_cut", text: "还行，但时间被切得很碎" }
    ]
  },
  {
    id: "body_pressure",
    group: "身体",
    text: "压力很大时，你更像哪一种？",
    options: [
      { id: "push_harder", text: "继续硬撑，先把事做完" },
      { id: "freeze", text: "卡住，知道该做但动不起来" },
      { id: "control_details", text: "开始控制细节，让自己有点秩序感" },
      { id: "seek_air", text: "需要空间、走路、独处，才回得来" }
    ]
  },
  {
    id: "body_limit",
    group: "身体",
    text: "如果要真正转向，你最需要身体层面的什么？",
    options: [
      { id: "sleep", text: "稳定睡眠" },
      { id: "slower_rhythm", text: "更慢的节奏" },
      { id: "less_noise", text: "少一点信息和人际噪音" },
      { id: "body_trust", text: "重新相信自己的体感判断" }
    ]
  },
  {
    id: "world_pressure",
    group: "世界",
    text: "你感觉外部世界最常怎样挤压你？",
    options: [
      { id: "speed", text: "所有东西都太快，来不及消化" },
      { id: "competition", text: "比较和竞争让人不能停" },
      { id: "uncertainty", text: "规则变化太快，计划总被打断" },
      { id: "narrow_path", text: "能被认可的路太窄" }
    ]
  },
  {
    id: "world_opening",
    group: "世界",
    text: "你更相信哪种机会会打开人生岔路？",
    options: [
      { id: "small_project", text: "一个小项目慢慢长大" },
      { id: "new_relation", text: "遇到一个不同圈层的人" },
      { id: "accident", text: "一次意外打断原来的安排" },
      { id: "private_practice", text: "一段长期私下练习终于显影" }
    ]
  },
  {
    id: "world_bottom_line",
    group: "世界",
    text: "无论怎么变，你最不想牺牲的是？",
    options: [
      { id: "dignity", text: "基本尊严，不被异化成工具" },
      { id: "important_people", text: "几个重要的人和关系" },
      { id: "health", text: "身体和精神的底线" },
      { id: "creative_fire", text: "还能创造、好奇和被触动" }
    ]
  }
];

async function api(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "请求失败");
  return data;
}

async function streamTurn(payload, onDelta) {
  const response = await fetch("/api/turn-stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "AI 生成失败");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData = null;

  function handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed);
    if (event.type === "delta") {
      onDelta(event.text || "");
      return;
    }
    if (event.type === "done") {
      finalData = event;
      return;
    }
    if (event.type === "error") {
      throw new Error(event.error || "AI 生成失败");
    }
  }

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(handleLine);
  }
  buffer += decoder.decode();
  if (buffer.trim()) buffer.split(/\r?\n/).forEach(handleLine);
  if (!finalData) throw new Error("AI 流式生成没有返回完整故事。");
  return finalData;
}

function save() {
  localStorage.removeItem("butterfly_web_state");
}

function toast(message) {
  const node = $("#toast");
  const text = String(message || "");
  node.textContent = text;
  node.classList.add("show");
  clearTimeout(toast.timer);
  const duration = Math.min(12000, Math.max(2200, text.length * 80));
  toast.timer = setTimeout(() => node.classList.remove("show"), duration);
}

function setStep(step) {
  $$(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.step === step));
  $$(".panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === step));
}

function setOpeningMode(mode) {
  state.openingMode = mode || "ai";
  $$("[data-opening-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.openingMode === state.openingMode);
  });
  $$("[data-opening-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.openingPanel === state.openingMode);
  });
  if (state.openingMode === "quiz" && !state.quizQuestions.length && !state.quizLoading) {
    loadQuizQuestions();
  }
}

function renderQuiz() {
  const container = $("#quizQuestions");
  if (!container) return;
  if (state.quizLoadError) {
    container.innerHTML = `
      <div class="quiz-empty">
        <p>${escapeHtml(state.quizLoadError)}</p>
        <button class="ghost-button quiz-retry" type="button" data-retry-quiz>重新加载选择题</button>
      </div>
    `;
    return;
  }
  if (!state.quizQuestions.length) {
    container.innerHTML = "<p class=\"quiz-empty\">选择题加载中...</p>";
    return;
  }
  container.innerHTML = state.quizQuestions.map((question, index) => `
    <section class="quiz-question">
      <div class="quiz-meta">${escapeHtml(question.group)} · ${index + 1}/${state.quizQuestions.length}</div>
      <h3>${escapeHtml(question.text)}</h3>
      <div class="quiz-options">
        ${(question.options || []).map(option => {
          const active = state.quizAnswers[question.id] === option.id;
          return `
            <button class="quiz-option${active ? " active" : ""}" type="button" data-question="${escapeHtml(question.id)}" data-option="${escapeHtml(option.id)}">
              ${escapeHtml(option.text)}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");

  const profileCard = $("#quizProfileCard");
  if (!profileCard) return;
  if (!state.quizProfile) {
    const answered = Object.keys(state.quizAnswers).length;
    profileCard.innerHTML = `
      <span class="chip dark">半真实画像</span>
      <p class="summary">已回答 ${answered}/${state.quizQuestions.length} 题。</p>
    `;
    return;
  }
  const dimensions = state.quizProfile.dimensions || {};
  const innerDimensions = state.quizProfile.innerDimensions || {};
  profileCard.innerHTML = `
    <span class="chip dark">半真实画像</span>
    <p class="summary">${escapeHtml(state.quizProfile.summary || "")}</p>
    <div class="dimension-list">
      ${Object.keys(dimensions).map(key => `
        <div class="dimension-row">
          <span>${escapeHtml(dimensions[key].name)}</span>
          <strong>${escapeHtml(dimensions[key].state)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="ability-list">
      ${INNER_DIMENSION_ORDER.map(dimension => {
        const item = innerDimensions[dimension.key] || {};
        const score = Number.isFinite(Number(item.score)) ? Math.round(Number(item.score)) : 50;
        return `
          <div class="ability-row">
            <span>${escapeHtml(dimension.name)}</span>
            <strong>${score}</strong>
          </div>
        `;
      }).join("")}
    </div>
    <div class="chip-row">${(state.quizProfile.tags || []).slice(0, 6).map(tag => `<span class="chip warm">${escapeHtml(tag)}</span>`).join("")}</div>
  `;
}

async function loadQuizQuestions() {
  state.quizLoading = true;
  state.quizLoadError = "";
  renderQuiz();
  try {
    const quiz = await api("/api/profile-quiz");
    if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
      throw new Error("选择题接口没有返回题目。");
    }
    state.quizQuestions = quiz.questions;
    state.quizAnswers = {};
    state.quizProfile = null;
  } catch (error) {
    state.quizQuestions = PROFILE_QUIZ_FALLBACK.slice();
    state.quizAnswers = {};
    state.quizProfile = null;
    state.quizLoadError = "";
    toast("选择题接口暂不可用，已使用内置题库。生成半真实开局需要新版本地服务。");
  } finally {
    state.quizLoading = false;
    renderQuiz();
  }
}

function setLoading(loading, message) {
  state.loading = loading;
  $(".control-pane").classList.toggle("loading", loading);
  const overlay = $("#loadingOverlay");
  if (overlay) {
    overlay.classList.toggle("show", loading);
    $("#loadingText").textContent = message || "正在生成...";
  }
  if (message && !loading) toast(message);
}

function readPartialJsonString(raw, keys) {
  for (const key of keys) {
    const marker = '"' + key + '"';
    const keyIndex = raw.indexOf(marker);
    if (keyIndex < 0) continue;
    const colon = raw.indexOf(":", keyIndex + marker.length);
    if (colon < 0) continue;
    const quote = raw.indexOf('"', colon + 1);
    if (quote < 0) continue;
    let value = "";
    let escaping = false;
    for (let index = quote + 1; index < raw.length; index += 1) {
      const char = raw[index];
      if (escaping) {
        if (char === "n") value += "\n";
        else if (char === "t") value += "\t";
        else value += char;
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        break;
      } else {
        value += char;
      }
    }
    if (value.trim()) return value.trim();
  }
  return "";
}

function previewTurnText(raw) {
  const text = String(raw || "");
  try {
    const json = JSON.parse(text);
    const writer = json.writer || json;
    return [
      writer.story_text || writer.scene || writer.narrative || writer.text || writer.story,
      writer.inner_reaction || writer.innerReaction || writer.inner,
      writer.reality_or_temptation || writer.pressure || writer.reality_pressure
    ].filter(Boolean).join("\n\n");
  } catch (error) {}
  return [
    readPartialJsonString(text, ["story_text", "scene", "narrative", "story"]),
    readPartialJsonString(text, ["inner_reaction", "innerReaction", "inner"]),
    readPartialJsonString(text, ["reality_or_temptation", "pressure", "reality_pressure"])
  ].filter(Boolean).join("\n\n");
}

function renderCharacter() {
  if (!state.character) {
    $("#characterCard").innerHTML = "<p>点击 AI 随机，生成一个人物和起点事件。</p>";
    return;
  }
  $("#characterCard").innerHTML = `
    <span class="chip dark">${escapeHtml(state.character.identity)}</span>
    <h3>${escapeHtml(state.character.title)}</h3>
    <p class="tagline">“${escapeHtml(state.character.tagline || "")}”</p>
    <p class="summary">${escapeHtml(state.character.summary)}</p>
    <div class="chip-row">${state.character.inertia.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
    <div class="chip-row">${state.character.desires.map(item => `<span class="chip warm">${escapeHtml(item)}</span>`).join("")}</div>
  `;
}

function renderEvent() {
  if (!state.event) {
    $("#eventCard").innerHTML = "<p>先选择人物，再生成或填写一个起点事件。</p>";
    return;
  }
  $("#eventCard").innerHTML = `
    <p>${escapeHtml(state.event.text)}</p>
    <p class="tagline">“${escapeHtml(state.event.innerReaction)}”</p>
    <p>${escapeHtml(state.event.pressure)}</p>
  `;
}

function normalizeDimensionValues(dimensions, fallbackScore) {
  const source = dimensions || {};
  const fallback = typeof fallbackScore === "number" ? fallbackScore : 50;
  const values = {};
  LIFE_DIMENSION_ORDER.forEach(dimension => {
    const raw = source[dimension.key];
    const score = raw && typeof raw === "object" ? raw.score : raw;
    const number = Number(score);
    values[dimension.key] = {
      name: dimension.name,
      score: Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback
    };
  });
  return values;
}

function normalizeInnerDimensionValues(dimensions, fallbackScore) {
  const source = dimensions || {};
  const fallback = typeof fallbackScore === "number" ? fallbackScore : 50;
  const values = {};
  INNER_DIMENSION_ORDER.forEach(dimension => {
    const raw = source[dimension.key];
    const score = raw && typeof raw === "object" ? raw.score : raw;
    const number = Number(score);
    values[dimension.key] = {
      name: dimension.name,
      score: Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback
    };
  });
  return values;
}

function radarPoint(index, score, radius) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / LIFE_DIMENSION_ORDER.length;
  const distance = radius * score / 100;
  return {
    x: 100 + Math.cos(angle) * distance,
    y: 92 + Math.sin(angle) * distance
  };
}

function radarPolygon(values, radius) {
  return LIFE_DIMENSION_ORDER.map((dimension, index) => {
    const point = radarPoint(index, values[dimension.key].score, radius);
    return point.x.toFixed(1) + "," + point.y.toFixed(1);
  }).join(" ");
}

function renderDimensionRadar() {
  const node = $("#dimensionRadar");
  if (!node) return;
  const source = state.story && state.story.lifeDimensions
    ? state.story.lifeDimensions
    : state.character && state.character.lifeDimensions;

  const values = normalizeDimensionValues(source, source ? 50 : 0);
  const grid = [25, 50, 75, 100].map(level => `
    <polygon points="${radarPolygon(normalizeDimensionValues({
      self: level,
      relation: level,
      resources: level,
      body: level,
      world: level
    }), 64)}" class="radar-grid-line"></polygon>
  `).join("");
  const axes = LIFE_DIMENSION_ORDER.map((dimension, index) => {
    const end = radarPoint(index, 100, 64);
    return `
      <line x1="100" y1="92" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" class="radar-axis"></line>
    `;
  }).join("");
  const points = LIFE_DIMENSION_ORDER.map((dimension, index) => {
    const value = values[dimension.key].score;
    const point = radarPoint(index, value, 64);
    const label = radarPoint(index, 100, 82);
    const tooltip = radarPoint(index, Math.max(value, 18), 64);
    const labelText = `${dimension.name} ${value}`;
    return `
      <g class="radar-point" tabindex="0" aria-label="${escapeHtml(labelText)}">
        <title>${escapeHtml(labelText)}</title>
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="10" class="radar-hit"></circle>
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.6" class="radar-dot"></circle>
        <text x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" class="radar-label" text-anchor="middle">${dimension.name}</text>
        <text x="${tooltip.x.toFixed(1)}" y="${(tooltip.y - 8).toFixed(1)}" class="radar-value-pop" text-anchor="middle">${labelText}</text>
      </g>
    `;
  }).join("");

  node.innerHTML = `
    <div class="dimension-radar-body">
      <svg class="radar-svg" viewBox="0 0 200 184" role="img" aria-label="雷达图">
        ${grid}
        ${axes}
        <polygon points="${radarPolygon(values, 64)}" class="radar-shape"></polygon>
        ${points}
      </svg>
    </div>
  `;
}

function getViewportSize() {
  const root = document.documentElement || {};
  const win = typeof window !== "undefined" ? window : null;
  return {
    width: win && Number.isFinite(win.innerWidth) ? win.innerWidth : root.clientWidth || 1024,
    height: win && Number.isFinite(win.innerHeight) ? win.innerHeight : root.clientHeight || 768
  };
}

function getRadarRect(node) {
  const rect = node && node.getBoundingClientRect ? node.getBoundingClientRect() : {};
  const width = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : node.offsetWidth || 224;
  const height = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : node.offsetHeight || 186;
  return {
    left: Number.isFinite(rect.left) ? rect.left : 22,
    top: Number.isFinite(rect.top) ? rect.top : 20,
    width,
    height
  };
}

function clampRadarPosition(node, left, top) {
  const margin = 8;
  const rect = getRadarRect(node);
  const viewport = getViewportSize();
  const maxLeft = Math.max(margin, viewport.width - rect.width - margin);
  const maxTop = Math.max(margin, viewport.height - rect.height - margin);
  return {
    left: Math.max(margin, Math.min(maxLeft, left)),
    top: Math.max(margin, Math.min(maxTop, top))
  };
}

function saveRadarPosition(position) {
  try {
    localStorage.setItem(RADAR_POSITION_KEY, JSON.stringify(position));
  } catch (error) {}
}

function readRadarPosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RADAR_POSITION_KEY) || "null");
    if (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) return parsed;
  } catch (error) {}
  return null;
}

function applyRadarPosition(node, position, shouldSave) {
  const next = clampRadarPosition(node, position.left, position.top);
  node.style.left = next.left + "px";
  node.style.top = next.top + "px";
  node.style.right = "auto";
  node.style.bottom = "auto";
  if (shouldSave) saveRadarPosition(next);
  return next;
}

function initDraggableRadar() {
  const node = $("#dimensionRadar");
  if (!node || node.dataset.dragReady) return;
  node.dataset.dragReady = "true";

  const saved = readRadarPosition();
  if (saved) applyRadarPosition(node, saved, false);

  let drag = null;

  node.addEventListener("pointerdown", event => {
    if (typeof event.button === "number" && event.button !== 0) return;
    const rect = getRadarRect(node);
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    node.classList.add("dragging");
    if (node.setPointerCapture && event.pointerId !== undefined) node.setPointerCapture(event.pointerId);
    if (event.preventDefault) event.preventDefault();
  });

  node.addEventListener("pointermove", event => {
    if (!drag) return;
    if (drag.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
    applyRadarPosition(node, {
      left: event.clientX - drag.offsetX,
      top: event.clientY - drag.offsetY
    }, false);
    if (event.preventDefault) event.preventDefault();
  });

  function finishDrag(event) {
    if (!drag) return;
    const rect = getRadarRect(node);
    saveRadarPosition(clampRadarPosition(node, rect.left, rect.top));
    node.classList.remove("dragging");
    if (node.releasePointerCapture && event && event.pointerId !== undefined) {
      node.releasePointerCapture(event.pointerId);
    }
    drag = null;
  }

  node.addEventListener("pointerup", finishDrag);
  node.addEventListener("pointercancel", finishDrag);

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("resize", () => {
      if (!node.style.left || !node.style.top) return;
      const rect = getRadarRect(node);
      applyRadarPosition(node, { left: rect.left, top: rect.top }, true);
    });
  }
}

function renderAbilityStrip() {
  const node = $("#abilityStrip");
  if (!node) return;
  const source = state.story && state.story.innerDimensions
    ? state.story.innerDimensions
    : state.character && state.character.innerDimensions;
  if (!state.story) {
    node.innerHTML = "";
    return;
  }
  const values = normalizeInnerDimensionValues(source, source ? 50 : 0);
  const history = state.story && Array.isArray(state.story.innerDimensionHistory) ? state.story.innerDimensionHistory : [];
  const previous = history.length >= 2 ? normalizeInnerDimensionValues(history[history.length - 2].values) : null;
  node.innerHTML = INNER_DIMENSION_ORDER.map(dimension => {
    const value = values[dimension.key].score;
    const diff = previous ? value - previous[dimension.key].score : 0;
    const diffText = previous && diff !== 0 ? (diff > 0 ? "+" + diff : String(diff)) : "";
    const diffClass = diff > 0 ? "up" : diff < 0 ? "down" : "";
    return `
      <div class="ability-chip" title="${escapeHtml(dimension.name + " " + value)}">
        <span>${escapeHtml(dimension.name)}</span>
        <strong>${value}</strong>
        ${diffText ? `<em class="${diffClass}">${diffText}</em>` : ""}
      </div>
    `;
  }).join("");
}

function renderStory() {
  const empty = $("#emptyState");
  const beats = $("#beats");
  if (!state.story) {
    empty.style.display = "";
    beats.innerHTML = "";
    $("#choices").innerHTML = "";
    return;
  }

  empty.style.display = "none";
  const streamBeat = state.streamText ? `
    <article class="beat streaming-beat">
      <div class="beat-number">...</div>
      <p class="scene">${escapeHtml(state.streamText)}</p>
      <div class="typing-cursor"></div>
    </article>
  ` : "";

  beats.innerHTML = state.story.beats.map(beat => `
    <article class="beat">
      <div class="beat-number">${String(beat.turn).padStart(2, "0")}.</div>
      ${beat.action ? `<div class="action-recap">${escapeHtml(beat.action.text)}</div>` : ""}
      <p class="scene">${escapeHtml(beat.scene)}</p>
      <div class="inner-note">“${escapeHtml(beat.innerReaction)}”</div>
      <p class="pressure">${escapeHtml(beat.pressure)}</p>
    </article>
  `).join("") + streamBeat;

  const latest = state.story.beats[state.story.beats.length - 1];
  $("#choices").innerHTML = (latest.choices || []).map((choice, index) => `
    <button class="choice-button" data-choice="${index}">
      <span>${escapeHtml(choice.text)}</span>
      <span>→</span>
    </button>
  `).join("");

  $("#storyPaper").scrollTo({ top: $("#storyPaper").scrollHeight, behavior: "smooth" });
}

function renderRetrospect() {
  if (!state.retrospect) {
    $("#retrospectCard").innerHTML = "<p>故事停下时，这里会生成一段回望。</p>";
    return;
  }
  const r = state.retrospect;
  $("#retrospectCard").innerHTML = `
    <p class="tagline">“${escapeHtml(r.quote)}”</p>
    <p><strong>失去：</strong>${escapeHtml(r.lost)}</p>
    <p><strong>获得：</strong>${escapeHtml(r.gained)}</p>
    <p><strong>变强的自我：</strong>${escapeHtml(r.strongerSelf)}</p>
    <p><strong>仍在拖拽的旧我：</strong>${escapeHtml(r.oldSelf)}</p>
    <p><strong>最重要的选择：</strong>${escapeHtml(r.keyChoice)}</p>
    <div class="chip-row">${(r.tags || []).map(tag => `<span class="chip warm">${escapeHtml(tag)}</span>`).join("")}</div>
  `;
}

function renderAll() {
  renderCharacter();
  renderEvent();
  renderDimensionRadar();
  renderAbilityStrip();
  renderStory();
  renderRetrospect();
  renderQuiz();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function pickAiEvent() {
  if (!state.character) return;
  const data = await api("/api/ai-event", { character: state.character });
  state.event = data.event;
  renderEvent();
  save();
}

async function chooseAction(action) {
  if (!state.story || state.loading) return;
  let rawStream = "";
  state.streamText = "AI 正在续写...";
  renderStory();
  setLoading(true, "AI 正在写下一回合...");
  try {
    const data = await streamTurn({ story: state.story, action }, (delta) => {
      rawStream += delta;
      const preview = previewTurnText(rawStream);
      if (preview && preview !== state.streamText) {
        state.streamText = preview;
        renderStory();
      }
    });
    state.story = data.story;
    state.streamText = "";
    renderAll();
    save();
  } catch (error) {
    state.streamText = "";
    renderStory();
    toast("AI 生成失败：" + (error.message || "请检查代理、Key 或模型输出。"));
  } finally {
    setLoading(false);
  }
}

async function init() {
  localStorage.removeItem("butterfly_web_state");
  const boot = await api("/api/bootstrap");
  $("#aiStatus").textContent = boot.aiConfigured ? `AI ${boot.model}` : "AI 未配置";
  $("#aiStatus").classList.toggle("ai", boot.aiConfigured);

  state.character = null;
  state.event = null;
  state.story = null;
  state.retrospect = null;
  state.streamText = "";
  state.quizQuestions = [];
  state.quizAnswers = {};
  state.quizProfile = null;
  state.quizLoadError = "";
  setOpeningMode("ai");
  renderAll();
  initDraggableRadar();
  setStep("character");
  loadQuizQuestions();
}

$$(".tab").forEach(tab => tab.addEventListener("click", () => setStep(tab.dataset.step)));

$$("[data-opening-mode]").forEach(button => {
  button.addEventListener("click", () => setOpeningMode(button.dataset.openingMode));
});

$("#quizQuestions").addEventListener("click", (event) => {
  const retry = event.target.closest("[data-retry-quiz]");
  if (retry) {
    if (!state.quizLoading) loadQuizQuestions();
    return;
  }
  const button = event.target.closest("[data-question][data-option]");
  if (!button || state.loading) return;
  state.quizAnswers[button.dataset.question] = button.dataset.option;
  state.quizProfile = null;
  renderQuiz();
});

$("#resetQuiz").addEventListener("click", () => {
  if (state.loading) return;
  state.quizAnswers = {};
  state.quizProfile = null;
  renderQuiz();
});

$("#submitQuizSeed").addEventListener("click", async () => {
  if (state.loading) return;
  const answered = Object.keys(state.quizAnswers).length;
  if (answered < state.quizQuestions.length) {
    toast(`请先答完全部选择题：${answered}/${state.quizQuestions.length}`);
    return;
  }
  setLoading(true, "正在生成半真实开局...");
  try {
    const seed = await api("/api/profile-seed", { answers: state.quizAnswers });
    setLoading(true, "正在进入半真实故事...");
    const started = await api("/api/start", { character: seed.character, event: seed.event });
    state.character = seed.character;
    state.event = seed.event;
    state.quizProfile = seed.profile || null;
    state.story = started.story;
    state.retrospect = null;
    state.streamText = "";
    setOpeningMode("quiz");
    renderAll();
    save();
    setStep("story");
    toast("半真实故事已开始");
  } catch (error) {
    const message = error && error.message === "Not found"
      ? "当前后端还是旧版本：请打开 http://127.0.0.1:8795 或重启本地服务后再生成半真实开局。"
      : error.message;
    toast(message);
  } finally {
    setLoading(false);
  }
});

$("#aiCharacter").addEventListener("click", async () => {
  if (state.loading) return;
  setLoading(true, "正在生成开局...");
  try {
    const data = await api("/api/ai-seed");
    state.character = data.character;
    state.event = data.event;
    state.story = null;
    state.retrospect = null;
    state.streamText = "";
    state.quizProfile = null;
    setOpeningMode("ai");
    renderAll();
    save();
    toast("AI 开局已生成");
  } catch (error) {
    toast(error.message);
  } finally {
    setLoading(false);
  }
});

$("#useCustomCharacter").addEventListener("click", async () => {
  toast("本地人物生成已关闭，请使用 AI 随机");
});

$("#confirmCharacter").addEventListener("click", () => {
  if (!state.character) {
    toast("请先生成或填写人物");
    return;
  }
  setStep("event");
});

$("#aiEvent").addEventListener("click", async () => {
  if (state.loading) return;
  setLoading(true, "正在随机生成事件...");
  try {
    await pickAiEvent();
    state.story = null;
    state.retrospect = null;
    state.streamText = "";
    renderAll();
    save();
    toast("AI 事件已生成");
  } catch (error) {
    toast(error.message);
  } finally {
    setLoading(false);
  }
});

$("#useCustomEvent").addEventListener("click", async () => {
  toast("本地事件生成已关闭，请使用 AI 随机");
});

$("#startStory").addEventListener("click", async () => {
  if (!state.character || !state.event) {
    toast("请先生成完整人物和起点事件");
    return;
  }
  try {
    const data = await api("/api/start", { character: state.character, event: state.event });
    state.story = data.story;
    state.retrospect = null;
    state.streamText = "";
    renderAll();
    save();
    setStep("story");
  } catch (error) {
    toast(error.message || "起点缺少 AI 生成的选项");
  }
});

$("#choices").addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) return;
  const latest = state.story.beats[state.story.beats.length - 1];
  chooseAction(latest.choices[Number(button.dataset.choice)]);
});

$("#customActionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#customAction");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  chooseAction({ tag: "自定义行动", text });
});

$("#finishStory").addEventListener("click", async () => {
  if (!state.story) return;
  setLoading(true, "正在生成回望...");
  try {
    const data = await api("/api/retrospect", { story: state.story });
    state.retrospect = data.retrospect;
    renderRetrospect();
    save();
    setStep("retrospect");
  } catch (error) {
    toast(error.message);
  } finally {
    setLoading(false);
  }
});

$("#backToStory").addEventListener("click", () => setStep("story"));

$("#restartStory").addEventListener("click", () => {
  state.story = null;
  state.retrospect = null;
  state.streamText = "";
  state.quizProfile = null;
  localStorage.removeItem("butterfly_web_state");
  renderAll();
  setStep("character");
});

init().catch(error => toast(error.message));
