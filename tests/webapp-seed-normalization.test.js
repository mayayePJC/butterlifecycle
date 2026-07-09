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

const roleSkillSeed = {
  writer: {
    character: {
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
      pressure: "下一班同事已经失联，拒绝会让所有人难堪。",
      choices: [
        { tag: "保持安全", text: "先答应下来，之后再想办法。" },
        { tag: "细微偏航", text: "问清楚这次是否能算加班。" },
        { tag: "冒险选择", text: "直接说自己今天不能继续顶班。" }
      ]
    }
  },
  reviewer: {
    pass: true
  }
};

(async () => {
  const fakeAi = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(roleSkillSeed)
          }
        }
      ]
    }));
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

    const response = await fetch(baseUrl + "/api/ai-seed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.ok, true);
    assert.ok(data.character.title);
    assert.strictEqual(data.character.identity, "夜班便利店店员");
    assert.strictEqual(data.event.choices.length, 3);
  } finally {
    child.kill();
    await close(fakeAi);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
