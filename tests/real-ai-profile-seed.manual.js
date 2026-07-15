const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const profileQuiz = require("../utils/profileQuiz");

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
      if (result.response.ok) {
        console.log("bootstrap:", JSON.stringify(result.data));
        return;
      }
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
    await waitForBootstrap(baseUrl, child);

    const answers = {};
    profileQuiz.publicQuestions().forEach((question, index) => {
      answers[question.id] = question.options[(index + 1) % question.options.length].id;
    });

    const startedAt = Date.now();
    const seed = await postJson(baseUrl, "/api/profile-seed", { answers });
    console.log("profile-seed status:", seed.response.status, "duration ms:", Date.now() - startedAt);
    if (!seed.response.ok || seed.data.ok === false) {
      console.log("profile-seed error:", seed.data.error || seed.data);
    } else {
      console.log("profile:", JSON.stringify({
        summary: seed.data.profile && seed.data.profile.summary,
        tags: seed.data.profile && seed.data.profile.tags && seed.data.profile.tags.slice(0, 4)
      }));
      console.log("seed:", JSON.stringify({
        identity: seed.data.character && seed.data.character.identity,
        title: seed.data.character && seed.data.character.title,
        event: seed.data.event && seed.data.event.text,
        choices: seed.data.event && seed.data.event.choices && seed.data.event.choices.length
      }));
    }
    assert.strictEqual(seed.response.status, 200);
    assert.strictEqual(seed.data.ok, true);
    assert.ok(seed.data.character.identity);
    assert.ok(seed.data.event.text);
    assert.strictEqual(seed.data.event.choices.length, 3);

    const start = await postJson(baseUrl, "/api/start", {
      character: seed.data.character,
      event: seed.data.event
    });
    console.log("start status:", start.response.status);
    assert.strictEqual(start.response.status, 200);
    assert.strictEqual(start.data.ok, true);
    assert.strictEqual(start.data.story.beats.length, 1);
  } finally {
    child.kill();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
