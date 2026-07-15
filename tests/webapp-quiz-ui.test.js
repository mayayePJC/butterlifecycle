const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function makeClassList() {
  const classes = new Set();
  return {
    classes,
    add(name) {
      classes.add(name);
    },
    remove(name) {
      classes.delete(name);
    },
    toggle(name, enabled) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    }
  };
}

function makeNode(selector, dataset = {}) {
  return {
    selector,
    dataset,
    innerHTML: "",
    textContent: "",
    value: "",
    scrollHeight: 0,
    style: {},
    listeners: {},
    classList: makeClassList(),
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    closest() {
      return null;
    },
    scrollTo() {}
  };
}

function waitFor(assertion, timeoutMs = 500) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    function tick() {
      try {
        assertion();
        resolve();
      } catch (error) {
        if (Date.now() - startedAt > timeoutMs) {
          reject(error);
          return;
        }
        setTimeout(tick, 10);
      }
    }
    tick();
  });
}

const questions = [
  {
    id: "self_q",
    group: "自我",
    text: "你会如何开始？",
    options: [{ id: "a", text: "先试一点" }]
  },
  {
    id: "world_q",
    group: "世界",
    text: "你相信哪种机会？",
    options: [{ id: "b", text: "意外岔路" }]
  }
];

const character = {
  title: "半真实旅人",
  tagline: "她从旧节奏里挪出一点空地",
  identity: "在稳定工作里寻找转向的人",
  summary: "她习惯先维持局面，但开始给自己的选择留位置。",
  inertia: ["先稳住"],
  desires: ["更自由的节奏"],
  lifeDimensions: {
    self: { score: 40 },
    relation: { score: 30 },
    resources: { score: 50 },
    body: { score: 20 },
    world: { score: 60 }
  },
  innerDimensions: {
    agency: { score: 54 },
    courage: { score: 48 },
    clarity: { score: 57 },
    resilience: { score: 42 },
    flexibility: { score: 61 }
  }
};

const event = {
  text: "一个新机会和原来的承诺撞在同一天。",
  innerReaction: "她想答应所有人，但身体先慢了下来。",
  pressure: "两边都看起来不能轻易放掉。",
  choices: [
    { tag: "惯性", text: "先按原计划走。" },
    { tag: "偏离", text: "保留一个上午给新机会。" },
    { tag: "冒险", text: "直接推掉旧承诺。" }
  ]
};

const story = {
  beats: [
    {
      turn: 1,
      scene: event.text,
      innerReaction: event.innerReaction,
      pressure: event.pressure,
      choices: event.choices
    }
  ],
  lifeDimensions: character.lifeDimensions,
  innerDimensions: character.innerDimensions,
  dimensionHistory: [
    { turn: 1, values: character.lifeDimensions, action: null, note: "开局五维" }
  ],
  innerDimensionHistory: [
    { turn: 1, values: character.innerDimensions, action: null, note: "开局内在能力" }
  ]
};

(async () => {
  const nodes = new Map();
  const tabs = ["character", "event", "story", "retrospect"].map(step => makeNode(".tab", { step }));
  const panels = ["character", "event", "story", "retrospect"].map(panel => makeNode(".panel", { panel }));
  const openingModes = ["ai", "quiz"].map(openingMode => makeNode("[data-opening-mode]", { openingMode }));
  const openingPanels = ["ai", "quiz"].map(openingPanel => makeNode("[data-opening-panel]", { openingPanel }));
  const fetchPaths = [];

  function querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, makeNode(selector));
    return nodes.get(selector);
  }

  function querySelectorAll(selector) {
    if (selector === ".tab") return tabs;
    if (selector === ".panel") return panels;
    if (selector === "[data-opening-mode]") return openingModes;
    if (selector === "[data-opening-panel]") return openingPanels;
    return [];
  }

  const context = {
    console,
    TextDecoder,
    setTimeout,
    clearTimeout,
    localStorage: {
      removeItem() {},
      getItem() {
        return null;
      },
      setItem() {}
    },
    document: {
      querySelector,
      querySelectorAll
    },
    fetch: async (path, options = {}) => {
      fetchPaths.push(path);
      if (path === "/api/bootstrap") {
        return { ok: true, json: async () => ({ ok: true, aiConfigured: true, model: "test-model" }) };
      }
      if (path === "/api/profile-quiz") {
        return { ok: true, json: async () => ({ ok: true, questions }) };
      }
      if (path === "/api/profile-seed") {
        assert.deepStrictEqual(JSON.parse(options.body).answers, {
          self_q: "a",
          world_q: "b"
        });
        return {
          ok: true,
          json: async () => ({
            ok: true,
            character,
            event,
            profile: {
              mode: "semi_real_quiz",
              summary: "半真实画像",
              innerDimensions: character.innerDimensions
            }
          })
        };
      }
      if (path === "/api/start") {
        const payload = JSON.parse(options.body);
        assert.strictEqual(payload.character.title, character.title);
        assert.strictEqual(payload.event.text, event.text);
        return { ok: true, json: async () => ({ ok: true, story }) };
      }
      throw new Error("Unexpected fetch path: " + path);
    }
  };

  vm.runInNewContext(fs.readFileSync("webapp/app.js", "utf8"), context);

  await waitFor(() => {
    assert.match(querySelector("#quizQuestions").innerHTML, /你会如何开始/);
  });

  const quizClick = querySelector("#quizQuestions").listeners.click;
  questions.forEach(question => {
    quizClick({
      target: {
        closest(selector) {
          if (selector === "[data-retry-quiz]") return null;
          if (selector === "[data-question][data-option]") {
            return {
              dataset: {
                question: question.id,
                option: question.options[0].id
              }
            };
          }
          return null;
        }
      }
    });
  });

  await querySelector("#submitQuizSeed").listeners.click();

  assert.ok(fetchPaths.includes("/api/profile-seed"));
  assert.ok(fetchPaths.includes("/api/start"));
  assert.match(querySelector("#choices").innerHTML, /保留一个上午给新机会/);
  assert.match(querySelector("#abilityStrip").innerHTML, /Agency/);
  assert.match(querySelector("#abilityStrip").innerHTML, /Flexibility/);
  assert.ok(panels.find(panel => panel.dataset.panel === "story").classList.contains("active"));
  assert.ok(!panels.find(panel => panel.dataset.panel === "character").classList.contains("active"));
})();
