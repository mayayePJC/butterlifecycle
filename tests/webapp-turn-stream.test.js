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

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
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

const turnPayload = JSON.stringify({
  writer: {
    story_text: "她没有立刻退回梦匣，而是把它放到验梦灯下。灯芯闪了两下，祖母梦里只有一张旧餐桌和一碗还热的汤。",
    inner_reaction: "她第一次觉得，规章也许只看见了危险，没看见告别。",
    reality_or_temptation: "主任的脚步声从走廊尽头传来，抽查表已经翻开。",
    choices: [
      { label: "回到惯性", intent: "return_to_inertia", text: "立刻盖下退回章。" },
      { label: "轻微偏航", intent: "mild_deviation", text: "记录异常，申请人工复核。" },
      { label: "高偏航", intent: "high_deviation", text: "先让梦过闸，再补一份风险说明。" }
    ]
  },
  reviewer: {
    pass: true,
    blocking_issues: []
  }
});

(async () => {
  let upstreamBody = null;
  const fakeAi = http.createServer(async (req, res) => {
    upstreamBody = JSON.parse(await readBody(req));
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache"
    });
    for (let index = 0; index < turnPayload.length; index += 45) {
      const delta = turnPayload.slice(index, index + 45);
      res.write("data: " + JSON.stringify({ choices: [{ delta: { content: delta } }] }) + "\n\n");
    }
    res.end("data: [DONE]\n\n");
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
    const response = await fetch(baseUrl + "/api/turn-stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        story: sampleStory,
        action: sampleStory.beats[0].choices[1]
      })
    });
    assert.strictEqual(response.status, 200);
    const text = await response.text();
    const events = text.trim().split(/\r?\n/).map(line => JSON.parse(line));
    const deltas = events.filter(event => event.type === "delta");
    const done = events.find(event => event.type === "done");

    assert.ok(deltas.length > 1);
    assert.strictEqual(done.ok, true);
    assert.strictEqual(done.beat.choices.length, 3);
    assert.strictEqual(done.aiUsed, true);
    assert.strictEqual(upstreamBody.stream, true);
    assert.strictEqual(upstreamBody.max_tokens, 1200);
    assert.deepStrictEqual(upstreamBody.response_format, { type: "json_object" });
  } finally {
    child.kill();
    await close(fakeAi);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
