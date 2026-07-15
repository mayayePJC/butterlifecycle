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

const seed = {
  character: {
    title: "碎时修补者",
    tagline: "她把空白缝回日程",
    identity: "城市边缘的自由项目整理师",
    summary: "她靠替别人整理失控项目生活，自己却总把真正想做的事排到最后。",
    inertia: ["先撑住", "怕断供"],
    desires: ["自由时间", "被看见"],
    fears: ["收入坠落", "关系失望"],
    moralLine: "不再用透支身体证明自己可靠。",
    relationPulls: ["家人的期待", "老客户的依赖"],
    resources: ["可变现技能", "少量存款"],
    selves: {
      subject: "她想把自己的选择放进日程正中。",
      object: "她常觉得自己只是问题处理器。",
      material: "电脑、账单和碎裂日程跟着她。",
      social: "别人眼中她可靠、快、能救场。",
      spiritual: "她想重新相信自己的体感判断。",
      pure: "她仍保留对作品的好奇和野心。"
    }
  },
  event: {
    text: "一个老客户递来高价急单，同时她等了很久的个人项目窗口只剩三周。",
    innerReaction: "她第一反应是接下急单，胸口却像被日历压住。",
    pressure: "账户余额不宽裕，客户也暗示以后还会继续合作。",
    choices: [
      { tag: "顺着惯性", text: "接下急单，把个人项目再往后挪。" },
      { tag: "试探偏离", text: "只接一半急单，给个人项目保留固定上午。" },
      { tag: "押上代价", text: "拒绝急单，把三周完整押给个人项目。" }
    ]
  }
};

(async () => {
  let upstreamBody = null;
  const fakeAi = http.createServer(async (req, res) => {
    upstreamBody = JSON.parse(await readBody(req));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(chatResponse(JSON.stringify(seed))));
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

    const appJs = await fetch(baseUrl + "/app.js");
    assert.strictEqual(appJs.status, 200);
    assert.match(appJs.headers.get("cache-control") || "", /no-store/);

    const quiz = await postJson(baseUrl, "/api/profile-quiz", {});
    assert.strictEqual(quiz.response.status, 200);
    assert.match(quiz.response.headers.get("cache-control") || "", /no-store/);
    assert.strictEqual(quiz.data.questions.length, 15);

    const incomplete = await postJson(baseUrl, "/api/profile-seed", { answers: {} });
    assert.strictEqual(incomplete.response.status, 400);
    assert.strictEqual(incomplete.data.ok, false);
    assert.match(incomplete.data.error, /选择题/);
    assert.strictEqual(upstreamBody, null);

    const answers = {};
    profileQuiz.publicQuestions().forEach((question, index) => {
      answers[question.id] = question.options[index % question.options.length].id;
    });

    const result = await postJson(baseUrl, "/api/profile-seed", { answers });
    assert.strictEqual(result.response.status, 200);
    assert.strictEqual(result.data.ok, true);
    assert.strictEqual(result.data.profile.mode, "semi_real_quiz");
    assert.ok(result.data.profile.summary.includes("自我"));
    assert.ok(result.data.profile.innerDimensions);
    assert.ok(result.data.character.identity);
    assert.ok(result.data.character.lifeDimensions);
    assert.ok(result.data.character.innerDimensions);
    assert.ok(result.data.character.lifeDimensions.self.score >= 0);
    assert.ok(result.data.character.innerDimensions.agency.score >= 0);
    assert.ok(result.data.character.profileSummary.includes("自我"));
    assert.strictEqual(result.data.event.choices.length, 3);

    assert.strictEqual(upstreamBody.temperature, 0.86);
    assert.strictEqual(upstreamBody.top_p, 0.94);
    assert.deepStrictEqual(upstreamBody.response_format, { type: "json_object" });
    const messages = JSON.stringify(upstreamBody.messages);
    assert.match(messages, /半真实/);
    assert.match(messages, /人生场域五维/);
    assert.match(messages, /内在能力五维/);
    assert.match(messages, /semi_real_quiz/);
  } finally {
    child.kill();
    await close(fakeAi);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
