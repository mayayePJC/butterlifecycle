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
    title: "夜班便利店店员",
    tagline: "她把困意留到天亮以后",
    identity: "夜班便利店店员",
    summary: "她总在别人睡着后上班，习惯把自己的事压到最后。",
    inertia: ["忍住", "先照顾别人"],
    desires: ["被认真听见", "换一种生活节奏"],
    fears: ["麻烦别人", "失去稳定收入"],
    moralLine: "不会把无辜的人推出去挡事。",
    relationPulls: ["店长的排班", "母亲的电话"],
    resources: ["一部旧手机", "一点存款"],
    selves: {
      subject: "她想证明自己还有选择。",
      object: "她觉得自己只是一个替班的人。",
      material: "工牌、夜班记录和旧手机跟着她。",
      social: "别人眼中她可靠又安静。",
      spiritual: "她想把沉默换成一句明白话。",
      pure: "她仍想保留不被日程磨掉的自己。"
    }
  },
  event: {
    text: "凌晨交班前，店长临时发来消息，要她继续顶一个白班。",
    innerReaction: "她第一反应是答应，手指却停在发送键上。",
    pressure: "下一班同事已经失联，拒绝会让所有人难堪。"
  },
  beats: [
    {
      turn: 1,
      action: null,
      scene: "凌晨交班前，店长临时发来消息，要她继续顶一个白班。",
      innerReaction: "她第一反应是答应，手指却停在发送键上。",
      pressure: "下一班同事已经失联，拒绝会让所有人难堪。",
      choices: [
        { tag: "保持安全", text: "先答应下来，之后再想办法。" },
        { tag: "细微偏航", text: "问清楚这次是否能算加班。" },
        { tag: "冒险选择", text: "直接说自己今天不能继续顶班。" }
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
  causalDebt: [],
  importantChoices: [],
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

    const startedAt = Date.now();
    const turn = await postJson(baseUrl, "/api/turn", {
      story: sampleStory,
      action: sampleStory.beats[0].choices[1]
    });
    console.log("turn duration ms:", Date.now() - startedAt);
    console.log("turn status:", turn.response.status);
    if (!turn.response.ok || turn.data.ok === false) {
      console.log("turn error:", turn.data.error || turn.data);
    } else {
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
  } finally {
    child.kill();
    if (stderr.trim()) console.log("server stderr:", stderr.trim());
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
