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

const sampleStory = {
  character: {
    title: "雨闸验梦员",
    tagline: "她检查别人的梦",
    identity: "雨城第三梦境口岸边检员",
    summary: "她负责检查过闸的梦，习惯按规章退回不合格的温柔请求。",
    inertia: ["守规章", "不多问"],
    desires: ["保住工作", "放过无害的梦"],
    fears: ["误放禁梦", "连累家人"],
    moralLine: "不会明知伤人还装作没看见。",
    relationPulls: ["口岸主任", "失眠小孩"],
    resources: ["验梦印章", "半本旧规程"],
    selves: {
      subject: "她想判断规章之外的对错。",
      object: "她觉得自己只是一个盖章的人。",
      material: "雨衣、印章和潮湿工牌跟着她。",
      social: "别人眼中她安静可靠。",
      spiritual: "她想保留一点柔软判断。",
      pure: "她不愿把所有梦都交给表格。"
    }
  },
  event: {
    text: "雨季午后，阿槐牵来失眠小孩，请她放一只祖母梦过闸；规章写明亡者梦一律退回。",
    innerReaction: "她知道该退回，却听见小孩把伞攥得发响。",
    pressure: "主任半小时后抽查，梦匣已经开始漏雨。"
  },
  beats: [
    {
      turn: 1,
      action: null,
      scene: "雨季午后，阿槐牵来失眠小孩，请她放一只祖母梦过闸；规章写明亡者梦一律退回。",
      innerReaction: "她知道该退回，却听见小孩把伞攥得发响。",
      pressure: "主任半小时后抽查，梦匣已经开始漏雨。",
      choices: [
        { tag: "保持安全", text: "照规章退回祖母梦。" },
        { tag: "细微偏航", text: "先检查梦匣是否真的危险。" },
        { tag: "冒险选择", text: "私下放梦过闸。" }
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
  causalDebt: [],
  openThreads: [],
  knownFacts: []
};

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

    const startedAt = Date.now();
    const response = await fetch(baseUrl + "/api/turn-stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        story: sampleStory,
        action: sampleStory.beats[0].choices[1]
      })
    });
    assert.strictEqual(response.status, 200);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstDeltaAt = null;
    let done = null;

    function handleLine(line) {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === "delta" && !firstDeltaAt) {
        firstDeltaAt = Date.now();
      }
      if (event.type === "error") {
        throw new Error(event.error || "stream error");
      }
      if (event.type === "done") {
        done = event;
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

    assert.ok(firstDeltaAt);
    assert.ok(done);
    assert.strictEqual(done.ok, true);
    assert.strictEqual(done.beat.choices.length, 3);
    console.log("first delta ms:", firstDeltaAt - startedAt);
    console.log("done ms:", Date.now() - startedAt);
  } finally {
    child.kill();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
