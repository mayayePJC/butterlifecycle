const state = {
  character: null,
  event: null,
  story: null,
  retrospect: null,
  loading: false,
  streamText: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function api(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
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
  renderStory();
  renderRetrospect();
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
    renderStory();
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
  renderAll();
  setStep("character");
}

$$(".tab").forEach(tab => tab.addEventListener("click", () => setStep(tab.dataset.step)));

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
  localStorage.removeItem("butterfly_web_state");
  renderAll();
  setStep("character");
});

init().catch(error => toast(error.message));
