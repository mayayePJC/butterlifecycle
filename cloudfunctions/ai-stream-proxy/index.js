const http = require("http");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 90000);

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

function extractAssistantText(payload) {
  if (!payload) return "";
  if (payload.output_text) return payload.output_text;
  if (payload.choices && payload.choices.length) {
    const choice = payload.choices[0];
    if (choice.message && choice.message.content) return choice.message.content;
    if (choice.text) return choice.text;
  }
  return "";
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
  const responseFormat = payload.response_format && typeof payload.response_format === "object"
    ? payload.response_format
    : undefined;

  let timeout;
  try {
    const stream = payload.stream !== false;
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const upstream = await fetch(OPENAI_BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        stream,
        max_tokens: typeof payload.max_tokens === "number" ? payload.max_tokens : undefined,
        response_format: responseFormat,
        top_p: typeof payload.top_p === "number" ? payload.top_p : undefined,
        temperature: typeof payload.temperature === "number" ? payload.temperature : 0.82
      })
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      clearTimeout(timeout);
      sendJson(res, upstream.status || 502, {
        ok: false,
        error: errorText || "Upstream request failed"
      });
      return;
    }

    if (!stream) {
      const text = await upstream.text();
      clearTimeout(timeout);
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (error) {}
      sendJson(res, 200, {
        ok: true,
        content: extractAssistantText(json) || text,
        raw: json || text
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
    clearTimeout(timeout);
    res.end();
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    if (!res.headersSent) {
      sendJson(res, 502, { ok: false, error: error.name === "AbortError" ? "Upstream request timed out" : error.message || "Proxy failed" });
    } else {
      res.end();
    }
  }
}

http.createServer(proxyOpenAI).listen(PORT, () => {
  console.log(`AI stream proxy listening on ${PORT}`);
});
