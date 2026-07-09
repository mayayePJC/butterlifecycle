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

async function waitForBootstrap(baseUrl, child) {
  let lastError = null;
  for (let index = 0; index < 40; index += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(baseUrl + "/api/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError || new Error("web server did not start");
}

const sampleStory = {
  character: {
    title: "被写下的人",
    tagline: "她从一句描述里醒来",
    identity: "一个普通人",
    summary: "她正在试探自己能走多远。",
    inertia: ["迟疑", "自我保护"],
    desires: ["被理解", "重新选择"],
    fears: ["失控", "被误解"],
    moralLine: "不会轻易伤害无辜的人。",
    relationPulls: ["旧关系", "陌生人的目光"],
    resources: ["一点时间", "尚未耗尽的力气"],
    selves: {
      subject: "正在试探自己能走多远。",
      object: "还没有确定自己是哪一种人。",
      material: "生活痕迹仍然朴素。",
      social: "在别人眼中只是一个普通人。",
      spiritual: "想从惯性里拿回一点选择权。",
      pure: "仍然保留连续感。"
    }
  },
  event: {
    text: "她收到一条让她不安的消息。"
  },
  beats: [
    {
      turn: 1,
      scene: "她收到一条让她不安的消息。",
      innerReaction: "她知道自己又想躲开。",
      pressure: "对方还在等回复。",
      choices: [
        { tag: "保持安全", text: "先不回复。" },
        { tag: "细微偏航", text: "问清楚一句。" },
        { tag: "冒险选择", text: "直接说出担心。" }
      ]
    }
  ],
  hiddenStatus: {
    inertia: 68,
    momentDeviation: 0,
    sedimentation: 0,
    realityPressure: 28,
    worldStrangeness: 2
  },
  importantChoices: [],
  causalDebt: []
};

(async () => {
  const fakeAi = http.createServer((req, res) => {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "mock upstream failure" } }));
  });

  const fakePort = await listen(fakeAi);
  const webPort = await getFreePort();

  const child = spawn(process.execPath, ["webapp/server.js"], {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, {
      WEB_PORT: String(webPort),
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "http://127.0.0.1:" + fakePort + "/chat"
    }),
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const baseUrl = "http://127.0.0.1:" + webPort;
    await waitForBootstrap(baseUrl, child);

    const response = await fetch(baseUrl + "/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        story: sampleStory,
        action: { tag: "细微偏航", text: "问清楚一句。" }
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 500);
    assert.strictEqual(data.ok, false);
    assert.match(data.error, /AI|upstream|mock upstream failure|上游/);
    assert.strictEqual(data.story, undefined);
    assert.strictEqual(data.beat, undefined);
  } finally {
    child.kill();
    await close(fakeAi);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
