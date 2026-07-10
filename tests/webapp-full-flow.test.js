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

async function postJson(baseUrl, path, payload) {
  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json();
  return { response, data };
}

async function waitForBootstrap(baseUrl, child) {
  let lastError = null;
  for (let index = 0; index < 40; index += 1) {
    if (child.exitCode !== null) break;
    try {
      const result = await postJson(baseUrl, "/api/bootstrap", {});
      if (result.response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError || new Error("web server did not start");
}

function chatResponse(content) {
  return {
    choices: [
      {
        message: {
          content
        }
      }
    ]
  };
}

const seedWithoutIdentity = {
  writer: {
    protagonist: {
      tagline: "\u5979\u628a\u81ea\u5df1\u7684\u56f0\u653e\u5728\u5929\u4eae\u4e4b\u540e",
      summary: "\u591c\u73ed\u4fbf\u5229\u5e97\u5e97\u5458\uff0c\u603b\u5728\u522b\u4eba\u7761\u7740\u540e\u4e0a\u73ed\uff0c\u4e60\u60ef\u628a\u81ea\u5df1\u7684\u4e8b\u538b\u5230\u6700\u540e\u3002",
      inertia: ["\u5fcd\u4f4f", "\u5148\u7167\u987e\u522b\u4eba"],
      desires: ["\u88ab\u8ba4\u771f\u542c\u89c1", "\u6362\u4e00\u79cd\u751f\u6d3b\u8282\u594f"],
      fears: ["\u9ebb\u70e6\u522b\u4eba", "\u5931\u53bb\u7a33\u5b9a\u6536\u5165"],
      moralLine: "\u4e0d\u4f1a\u628a\u65e0\u8f9c\u7684\u4eba\u63a8\u51fa\u53bb\u6321\u4e8b\u3002",
      relationPulls: ["\u5e97\u957f\u7684\u6392\u73ed", "\u6bcd\u4eb2\u7684\u7535\u8bdd"],
      resources: ["\u4e00\u90e8\u65e7\u624b\u673a", "\u4e00\u70b9\u5b58\u6b3e"],
      selves: {
        subject: "\u5979\u60f3\u8bc1\u660e\u81ea\u5df1\u8fd8\u6709\u9009\u62e9\u3002",
        object: "\u5979\u89c9\u5f97\u81ea\u5df1\u53ea\u662f\u4e00\u4e2a\u66ff\u73ed\u7684\u4eba\u3002",
        material: "\u5de5\u724c\u3001\u591c\u73ed\u8bb0\u5f55\u548c\u65e7\u624b\u673a\u8ddf\u7740\u5979\u3002",
        social: "\u522b\u4eba\u773c\u4e2d\u5979\u53ef\u9760\u53c8\u5b89\u9759\u3002",
        spiritual: "\u5979\u60f3\u628a\u6c89\u9ed8\u6362\u6210\u4e00\u53e5\u660e\u767d\u8bdd\u3002",
        pure: "\u5979\u4ecd\u60f3\u4fdd\u7559\u4e0d\u88ab\u65e5\u7a0b\u78e8\u6389\u7684\u81ea\u5df1\u3002"
      }
    },
    event: {
      situation: "\u51cc\u6668\u4ea4\u73ed\u524d\uff0c\u5e97\u957f\u4e34\u65f6\u53d1\u6765\u6d88\u606f\uff0c\u8981\u5979\u7ee7\u7eed\u9876\u4e00\u4e2a\u767d\u73ed\u3002",
      innerReaction: "\u5979\u7b2c\u4e00\u53cd\u5e94\u662f\u7b54\u5e94\uff0c\u624b\u6307\u5374\u505c\u5728\u53d1\u9001\u952e\u4e0a\u3002",
      pressure: "\u4e0b\u4e00\u73ed\u540c\u4e8b\u5df2\u7ecf\u5931\u8054\uff0c\u62d2\u7edd\u4f1a\u8ba9\u6240\u6709\u4eba\u96be\u582a\u3002",
      choices: [
        { tag: "\u4fdd\u6301\u5b89\u5168", text: "\u5148\u7b54\u5e94\u4e0b\u6765\uff0c\u4e4b\u540e\u518d\u60f3\u529e\u6cd5\u3002" },
        { tag: "\u7ec6\u5fae\u504f\u822a", text: "\u95ee\u6e05\u695a\u8fd9\u6b21\u662f\u5426\u80fd\u7b97\u52a0\u73ed\u3002" },
        { tag: "\u5192\u9669\u9009\u62e9", text: "\u76f4\u63a5\u8bf4\u81ea\u5df1\u4eca\u5929\u4e0d\u80fd\u7ee7\u7eed\u9876\u73ed\u3002" }
      ]
    }
  },
  reviewer: { pass: true }
};

const turnPayload = {
  writer: {
    scene: "\u5979\u6ca1\u6709\u7acb\u523b\u7b54\u5e94\uff0c\u800c\u662f\u628a\u624b\u673a\u653e\u5230\u6536\u94f6\u53f0\u8fb9\uff0c\u5148\u95ee\u5e97\u957f\u8fd9\u4e00\u73ed\u600e\u4e48\u7b97\u3002\u6d88\u606f\u53d1\u51fa\u540e\uff0c\u5e97\u91cc\u8fd8\u662f\u5f88\u5b89\u9759\uff0c\u4f46\u5979\u6ca1\u6709\u50cf\u4ee5\u524d\u90a3\u6837\u9a6c\u4e0a\u541e\u56de\u53bb\u3002",
    innerReaction: "\u5979\u6709\u70b9\u7d27\u5f20\uff0c\u4f46\u4e5f\u610f\u8bc6\u5230\u81ea\u5df1\u53ea\u662f\u5728\u95ee\u4e00\u4e2a\u5408\u7406\u7684\u95ee\u9898\uff0c\u4e0d\u662f\u5728\u5236\u9020\u9ebb\u70e6\u3002",
    pressure: "\u5e97\u957f\u6ca1\u7acb\u523b\u56de\uff0c\u65f6\u95f4\u5374\u4e00\u76f4\u5f80\u4ea4\u73ed\u70b9\u9760\u8fd1\u3002",
    next_choices: [
      { label: "\u56de\u5230\u60ef\u6027", intent: "return_to_inertia", text: "\u5148\u8865\u4e00\u53e5\u201c\u4e0d\u884c\u5c31\u7b97\u4e86\u201d\u3002" },
      { label: "\u8f7b\u5fae\u504f\u822a", intent: "mild_deviation", text: "\u7ee7\u7eed\u7b49\u56de\u590d\uff0c\u4e0d\u81ea\u5df1\u5148\u6539\u53e3\u3002" },
      { label: "\u9ad8\u504f\u822a", intent: "high_deviation", text: "\u7ed9\u4e0b\u4e00\u73ed\u540c\u4e8b\u6253\u7535\u8bdd\u786e\u8ba4\u60c5\u51b5\u3002" }
    ]
  },
  psychologist: {
    state_delta_suggestion: {
      inertia_strength: -2,
      instant_deviation: 8,
      personality_sediment: 2,
      reality_pressure: 4,
      world_strangeness: 0
    }
  },
  fate_director: {
    reality_pullback: "\u5e97\u957f\u7684\u6c89\u9ed8\u8ba9\u5979\u627f\u53d7\u538b\u529b\u3002",
    thread_to_advance: "\u6392\u73ed\u8fb9\u754c"
  },
  genre_gatekeeper: {
    max_strangeness_this_turn: "\u4ecd\u5728\u73b0\u5b9e\u5de5\u4f5c\u573a\u666f\u5185",
    causal_debt_required: []
  },
  archivist: {
    confirmed_facts: ["\u5979\u662f\u591c\u73ed\u5e97\u5458"],
    open_threads: ["\u52a0\u73ed\u7b97\u6cd5"]
  },
  reviewer: { pass: true }
};

const retrospectText = [
  "\u3010\u56de\u671b\u3011",
  "\u5979\u4ecd\u7136\u6ca1\u6709\u5b8c\u5168\u8d70\u51fa\u4e60\u60ef\uff0c\u4f46\u5979\u7b2c\u4e00\u6b21\u628a\u95ee\u53e5\u653e\u5728\u4e86\u9053\u6b49\u524d\u9762\u3002\u8fd9\u4e0d\u50cf\u80dc\u5229\uff0c\u66f4\u50cf\u4e00\u4e2a\u53ef\u4ee5\u91cd\u590d\u7ec3\u4e60\u7684\u5f00\u59cb\u3002",
  "\u3010\u5931\u53bb\u3011",
  "\u4e00\u70b9\u81ea\u52a8\u987a\u4ece",
  "\u3010\u83b7\u5f97\u3011",
  "\u4e00\u53e5\u6e05\u695a\u7684\u8be2\u95ee",
  "\u3010\u53d8\u5f3a\u7684\u81ea\u6211\u3011",
  "\u4e3b\u4f53\u6211",
  "\u3010\u4ecd\u5728\u62d6\u62fd\u7684\u65e7\u6211\u3011",
  "\u6015\u9ebb\u70e6\u522b\u4eba",
  "\u3010\u6700\u91cd\u8981\u7684\u9009\u62e9\u3011",
  "\u5979\u6ca1\u6709\u7acb\u523b\u7b54\u5e94\u9876\u73ed\uff0c\u800c\u662f\u95ee\u6e05\u695a\u52a0\u73ed\u600e\u4e48\u7b97\u3002",
  "\u3010\u6807\u7b7e\u3011",
  "\u8fb9\u754c\uff0c\u591c\u73ed\uff0c\u504f\u822a"
].join("\n");

(async () => {
  let aiRequestCount = 0;
  let seedRequestBody = null;
  let turnRequestBody = null;
  const fakeAi = http.createServer(async (req, res) => {
    aiRequestCount += 1;
    const body = JSON.parse(await readBody(req));
    const text = JSON.stringify(body.messages || []);
    let content;
    if (text.includes("retrospect") || text.includes("\u56de\u671b")) {
      content = retrospectText;
    } else if (text.includes("turn_index") || text.includes("user_action")) {
      turnRequestBody = body;
      content = JSON.stringify(turnPayload);
    } else {
      seedRequestBody = body;
      content = JSON.stringify(seedWithoutIdentity);
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(chatResponse(content)));
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

    const seed = await postJson(baseUrl, "/api/ai-seed", {});
    assert.strictEqual(seed.response.status, 200);
    assert.strictEqual(seed.data.ok, true);
    assert.ok(seed.data.character.identity);
    assert.ok(seed.data.character.title);
    assert.strictEqual(seed.data.event.choices.length, 3);
    assert.strictEqual(seedRequestBody.temperature, 0.95);
    assert.strictEqual(seedRequestBody.top_p, 0.98);
    assert.deepStrictEqual(seedRequestBody.response_format, { type: "json_object" });
    assert.match(JSON.stringify(seedRequestBody.messages), /随机创作坐标/);
    assert.doesNotMatch(JSON.stringify(seedRequestBody.messages), /只能写当代现实/);

    const start = await postJson(baseUrl, "/api/start", {
      character: seed.data.character,
      event: seed.data.event
    });
    assert.strictEqual(start.response.status, 200);
    assert.strictEqual(start.data.ok, true);
    assert.strictEqual(start.data.story.beats.length, 1);

    const action = start.data.story.beats[0].choices[1];
    const turn = await postJson(baseUrl, "/api/turn", {
      story: start.data.story,
      action
    });
    assert.strictEqual(turn.response.status, 200);
    assert.strictEqual(turn.data.ok, true);
    assert.strictEqual(turn.data.story.beats.length, 2);
    assert.strictEqual(turn.data.beat.choices.length, 3);
    assert.strictEqual(turnRequestBody.max_tokens, 1200);
    assert.strictEqual(turnRequestBody.temperature, 0.78);
    assert.strictEqual(turnRequestBody.top_p, 0.94);
    assert.deepStrictEqual(turnRequestBody.response_format, { type: "json_object" });

    const retrospect = await postJson(baseUrl, "/api/retrospect", {
      story: turn.data.story
    });
    assert.strictEqual(retrospect.response.status, 200);
    assert.strictEqual(retrospect.data.ok, true);
    assert.ok(retrospect.data.retrospect.quote);
    assert.ok(retrospect.data.retrospect.tags.length >= 2);
    assert.strictEqual(aiRequestCount, 3);
  } finally {
    child.kill();
    await close(fakeAi);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
