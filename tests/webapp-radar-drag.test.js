const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function makeClassList() {
  const classes = new Set();
  return {
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

function makeNode(selector) {
  const node = {
    selector,
    innerHTML: "",
    textContent: "",
    value: "",
    dataset: {},
    style: {},
    listeners: {},
    classList: makeClassList(),
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setPointerCapture(pointerId) {
      this.capturedPointerId = pointerId;
    },
    releasePointerCapture(pointerId) {
      this.releasedPointerId = pointerId;
    },
    closest() {
      return null;
    },
    scrollTo() {},
    getBoundingClientRect() {
      const width = selector === "#dimensionRadar" ? 224 : 160;
      const height = selector === "#dimensionRadar" ? 186 : 80;
      const left = Number.parseFloat(this.style.left) || 22;
      const top = Number.parseFloat(this.style.top) || (720 - height - 20);
      return { left, top, width, height, right: left + width, bottom: top + height };
    }
  };
  return node;
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

(async () => {
  const nodes = new Map();
  const storage = new Map();
  const windowListeners = {};

  function querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, makeNode(selector));
    return nodes.get(selector);
  }

  const context = {
    console,
    TextDecoder,
    setTimeout,
    clearTimeout,
    window: {
      innerWidth: 1024,
      innerHeight: 720,
      addEventListener(type, handler) {
        windowListeners[type] = handler;
      }
    },
    localStorage: {
      removeItem(key) {
        storage.delete(key);
      },
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    document: {
      documentElement: { clientWidth: 1024, clientHeight: 720 },
      querySelector,
      querySelectorAll() {
        return [];
      }
    },
    fetch: async path => ({
      ok: true,
      json: async () => path === "/api/bootstrap"
        ? { ok: true, aiConfigured: true, model: "test-model" }
        : { ok: true, questions: [{ id: "q1", group: "g", text: "t", options: [{ id: "a", text: "A" }] }] }
    })
  };

  vm.runInNewContext(fs.readFileSync("webapp/app.js", "utf8"), context);

  const radar = querySelector("#dimensionRadar");
  await waitFor(() => {
    assert.strictEqual(typeof radar.listeners.pointerdown, "function");
    assert.strictEqual(typeof radar.listeners.pointermove, "function");
    assert.strictEqual(typeof radar.listeners.pointerup, "function");
  });

  radar.listeners.pointerdown({
    pointerId: 1,
    clientX: 42,
    clientY: 540,
    preventDefault() {
      this.prevented = true;
    }
  });
  radar.listeners.pointermove({
    pointerId: 1,
    clientX: 420,
    clientY: 260,
    preventDefault() {}
  });
  radar.listeners.pointerup({ pointerId: 1 });

  assert.ok(Number.parseFloat(radar.style.left) > 300);
  assert.ok(Number.parseFloat(radar.style.top) > 200);
  assert.ok(storage.get("butterlife_radar_position"));
})();
