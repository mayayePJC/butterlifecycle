const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

async function getFreePort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function postJson(baseUrl, path, payload) {
  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function waitForBootstrap(baseUrl, child) {
  let lastError = null;
  for (let index = 0; index < 40; index += 1) {
    if (child.exitCode !== null) break;
    try {
      const result = await postJson(baseUrl, "/api/bootstrap", {});
      if (result.response.ok) return result.data;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError || new Error("web server did not start");
}

function logStep(name, result) {
  const status = result.response.status;
  const data = result.data || {};
  console.log(name + " status:", status);
  if (!result.response.ok || data.ok === false) {
    console.log(name + " error:", data.error || data);
  }
}

(async () => {
  const webPort = await getFreePort();
  const child = spawn(process.execPath, ["webapp/server.js"], {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, {
      WEB_PORT: String(webPort)
    }),
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => {
    stderr += chunk;
  });

  try {
    const baseUrl = "http://127.0.0.1:" + webPort;
    const boot = await waitForBootstrap(baseUrl, child);
    console.log("bootstrap:", JSON.stringify({
      aiConfigured: boot.aiConfigured,
      model: boot.model
    }));

    const seed = await postJson(baseUrl, "/api/ai-seed", {});
    logStep("seed", seed);
    assert.strictEqual(seed.response.status, 200);
    assert.strictEqual(seed.data.ok, true);

    const start = await postJson(baseUrl, "/api/start", {
      character: seed.data.character,
      event: seed.data.event
    });
    logStep("start", start);
    assert.strictEqual(start.response.status, 200);
    assert.strictEqual(start.data.ok, true);

    const action = start.data.story.beats[0].choices[1];
    const turn = await postJson(baseUrl, "/api/turn", {
      story: start.data.story,
      action
    });
    logStep("turn", turn);
    if (turn.data && turn.data.beat) {
      console.log("turn beat:", JSON.stringify({
        hasScene: !!turn.data.beat.scene,
        hasInnerReaction: !!turn.data.beat.innerReaction,
        hasPressure: !!turn.data.beat.pressure,
        choices: Array.isArray(turn.data.beat.choices) ? turn.data.beat.choices.length : 0,
        aiUsed: turn.data.aiUsed === true
      }));
    }
    assert.strictEqual(turn.response.status, 200);
    assert.strictEqual(turn.data.ok, true);

    const retrospect = await postJson(baseUrl, "/api/retrospect", {
      story: turn.data.story
    });
    logStep("retrospect", retrospect);
    if (retrospect.data && retrospect.data.retrospect) {
      console.log("retrospect:", JSON.stringify({
        hasQuote: !!retrospect.data.retrospect.quote,
        tags: Array.isArray(retrospect.data.retrospect.tags) ? retrospect.data.retrospect.tags.length : 0
      }));
    }
    assert.strictEqual(retrospect.response.status, 200);
    assert.strictEqual(retrospect.data.ok, true);
  } finally {
    child.kill();
    if (stderr.trim()) console.log("server stderr:", stderr.trim());
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
