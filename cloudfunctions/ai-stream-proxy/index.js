const http = require("http");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function proxyOpenAI(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { ok: false, error: "Missing OPENAI_API_KEY" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (error) {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
    return;
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!messages.length) {
    sendJson(res, 400, { ok: false, error: "Missing messages" });
    return;
  }

  try {
    const upstream = await fetch(OPENAI_BASE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        stream: true,
        temperature: typeof payload.temperature === "number" ? payload.temperature : 0.82
      })
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      sendJson(res, upstream.status || 502, {
        ok: false,
        error: errorText || "Upstream request failed"
      });
      return;
    }

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "access-control-allow-origin": "*"
    });

    const reader = upstream.body.getReader();
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      res.write(Buffer.from(result.value));
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 502, { ok: false, error: error.message || "Proxy failed" });
    } else {
      res.end();
    }
  }
}

http.createServer(proxyOpenAI).listen(PORT, () => {
  console.log(`AI stream proxy listening on ${PORT}`);
});
