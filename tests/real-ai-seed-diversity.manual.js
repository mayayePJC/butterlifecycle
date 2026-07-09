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

(async () => {
  const webPort = await getFreePort();
  const child = spawn(process.execPath, ["webapp/server.js"], {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, {
      WEB_PORT: String(webPort)
    }),
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const baseUrl = "http://127.0.0.1:" + webPort;
    const boot = await waitForBootstrap(baseUrl, child);
    console.log("bootstrap:", JSON.stringify({
      aiConfigured: boot.aiConfigured,
      model: boot.model
    }));

    const seeds = [];
    for (let index = 0; index < 3; index += 1) {
      const result = await postJson(baseUrl, "/api/ai-seed", {});
      console.log("seed " + (index + 1) + " status:", result.response.status);
      if (!result.response.ok || result.data.ok === false) {
        console.log("seed error:", result.data.error || result.data);
      }
      assert.strictEqual(result.response.status, 200);
      assert.strictEqual(result.data.ok, true);
      const character = result.data.character;
      const event = result.data.event;
      seeds.push({
        title: character.title,
        identity: character.identity,
        event: event.text
      });
      console.log(JSON.stringify(seeds[seeds.length - 1]));
    }

    const identityCount = new Set(seeds.map(seed => seed.identity)).size;
    const titleCount = new Set(seeds.map(seed => seed.title)).size;
    assert.ok(identityCount >= 2);
    assert.ok(titleCount >= 2);
  } finally {
    child.kill();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
