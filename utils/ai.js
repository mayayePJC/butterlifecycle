function concatBytes(left, right) {
  const a = left || new Uint8Array(0);
  const b = right || new Uint8Array(0);
  const merged = new Uint8Array(a.length + b.length);
  merged.set(a, 0);
  merged.set(b, a.length);
  return merged;
}

function utf8Decode(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if (c >= 0xc0 && c < 0xe0 && i < bytes.length) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
    } else if (c >= 0xe0 && c < 0xf0 && i + 1 < bytes.length) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
    } else if (c >= 0xf0 && i + 2 < bytes.length) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      const codePoint = ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
      const adjusted = codePoint - 0x10000;
      out += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
    }
  }
  return out;
}

function splitCompleteBytes(bytes) {
  const end = bytes.length;
  if (!end) return { complete: bytes, rest: new Uint8Array(0) };
  let i = end - 1;
  while (i >= 0 && (bytes[i] & 0xc0) === 0x80) i--;
  if (i < 0) return { complete: new Uint8Array(0), rest: bytes };
  const first = bytes[i];
  let need = 1;
  if (first >= 0xf0) need = 4;
  else if (first >= 0xe0) need = 3;
  else if (first >= 0xc0) need = 2;
  const have = end - i;
  if (have < need) {
    return { complete: bytes.slice(0, i), rest: bytes.slice(i) };
  }
  return { complete: bytes, rest: new Uint8Array(0) };
}

function createDecoder() {
  if (typeof TextDecoder !== "undefined") {
    const decoder = new TextDecoder("utf-8");
    return {
      decode(buffer) {
        return decoder.decode(buffer, { stream: true });
      },
      flush() {
        return decoder.decode();
      }
    };
  }

  let pending = new Uint8Array(0);
  return {
    decode(buffer) {
      const bytes = concatBytes(pending, new Uint8Array(buffer));
      const split = splitCompleteBytes(bytes);
      pending = split.rest;
      return utf8Decode(split.complete);
    },
    flush() {
      const text = utf8Decode(pending);
      pending = new Uint8Array(0);
      return text;
    }
  };
}

function parseDelta(json) {
  if (!json) return "";
  if (json.type === "response.output_text.delta" && json.delta) return json.delta;
  if (json.delta && typeof json.delta === "string") return json.delta;
  if (json.choices && json.choices.length) {
    const choice = json.choices[0];
    if (choice.delta && choice.delta.content) return choice.delta.content;
    if (choice.message && choice.message.content) return choice.message.content;
    if (choice.text) return choice.text;
  }
  return "";
}

function describeError(error) {
  const raw = error && error.message ? error.message : String(error || "AI 请求失败");
  let message = raw.replace(/^AI 请求失败：?/, "").trim();
  try {
    const jsonStart = message.indexOf("{");
    if (jsonStart >= 0) {
      const parsed = JSON.parse(message.slice(jsonStart));
      if (parsed.error) {
        if (typeof parsed.error === "string") message = parsed.error;
        else if (parsed.error.message) message = parsed.error.message;
        else message = JSON.stringify(parsed.error);
      }
    }
  } catch (ignore) {}
  return message || "AI 请求失败";
}

function readPartialJsonString(raw, keys) {
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const marker = "\"" + keys[keyIndex] + "\"";
    const start = raw.indexOf(marker);
    if (start < 0) continue;
    const colon = raw.indexOf(":", start + marker.length);
    if (colon < 0) continue;
    const quote = raw.indexOf("\"", colon + 1);
    if (quote < 0) continue;
    let value = "";
    let escaping = false;
    for (let index = quote + 1; index < raw.length; index += 1) {
      const char = raw[index];
      if (escaping) {
        if (char === "n") value += "\n";
        else if (char === "t") value += "\t";
        else value += char;
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        break;
      } else {
        value += char;
      }
    }
    if (value.trim()) return value.trim();
  }
  return "";
}

function previewTurnText(raw) {
  const text = String(raw || "");
  try {
    const json = JSON.parse(text);
    const writer = json.writer || json;
    return [
      writer.story_text || writer.scene || writer.narrative || writer.text || writer.story,
      writer.inner_reaction || writer.innerReaction || writer.inner,
      writer.reality_or_temptation || writer.pressure || writer.reality_pressure
    ].filter(Boolean).join("\n\n");
  } catch (ignore) {}
  return [
    readPartialJsonString(text, ["story_text", "scene", "narrative", "story"]),
    readPartialJsonString(text, ["inner_reaction", "innerReaction", "inner"]),
    readPartialJsonString(text, ["reality_or_temptation", "pressure", "reality_pressure"])
  ].filter(Boolean).join("\n\n");
}

function streamChat(options) {
  const config = options.config || {};
  const messages = options.messages || [];
  const onDelta = options.onDelta || function () {};
  const temperature = typeof options.temperature === "number" ? options.temperature : 0.82;
  const timeout = typeof options.timeout === "number" ? options.timeout : 120000;
  const maxTokens = typeof options.maxTokens === "number" ? options.maxTokens : undefined;
  const topP = typeof options.topP === "number" ? options.topP : undefined;
  const responseFormat = options.jsonMode ? { type: "json_object" } : undefined;

  if (!config.enabled || !config.proxyUrl) {
    return Promise.reject(new Error("AI 未启用或缺少云端代理地址"));
  }

  return new Promise(function (resolve, reject) {
    let fullText = "";
    let sseBuffer = "";
    let settled = false;
    let chunked = false;
    const decoder = createDecoder();

    function finish(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }

    function emit(delta) {
      if (!delta) return;
      fullText += delta;
      onDelta(delta, fullText);
    }

    function handleDataLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed === "[DONE]") {
        finish(fullText);
        return;
      }
      try {
        emit(parseDelta(JSON.parse(trimmed)));
      } catch (error) {
        if (trimmed[0] !== "{") emit(trimmed);
      }
    }

    function handleText(text) {
      if (!text) return;
      sseBuffer += text;
      const lines = sseBuffer.split(/\r?\n/);
      sseBuffer = lines.pop();
      lines.forEach(function (line) {
        if (line.indexOf("data:") === 0) {
          handleDataLine(line.slice(5));
        } else if (line.trim().charAt(0) === "{") {
          handleDataLine(line);
        }
      });
    }

    const requestTask = wx.request({
      url: config.proxyUrl,
      method: "POST",
      enableChunked: true,
      timeout,
      header: {
        "content-type": "application/json"
      },
      data: {
        messages,
        temperature,
        stream: true,
        max_tokens: maxTokens,
        top_p: topP,
        response_format: responseFormat
      },
      success(res) {
        if (res.statusCode >= 400) {
          const message = typeof res.data === "string" ? res.data : JSON.stringify(res.data || {});
          fail(new Error("AI 请求失败：" + res.statusCode + " " + message));
          return;
        }

        if (!chunked && res.data) {
          if (typeof res.data === "string") {
            handleText(res.data);
          } else if (res.data.choices) {
            emit(parseDelta(res.data));
          }
        }
      },
      fail(err) {
        fail(new Error(err.errMsg || "AI 请求失败"));
      },
      complete() {
        if (settled) return;
        handleText(decoder.flush());
        if (sseBuffer.trim()) handleDataLine(sseBuffer.replace(/^data:\s*/, ""));
        finish(fullText);
      }
    });

    if (requestTask && requestTask.onChunkReceived) {
      requestTask.onChunkReceived(function (res) {
        chunked = true;
        handleText(decoder.decode(res.data));
      });
    }
  });
}

function requestChat(options) {
  const config = options.config || {};
  const messages = options.messages || [];
  const temperature = typeof options.temperature === "number" ? options.temperature : 0.82;
  const timeout = typeof options.timeout === "number" ? options.timeout : 90000;
  const maxTokens = typeof options.maxTokens === "number" ? options.maxTokens : undefined;
  const topP = typeof options.topP === "number" ? options.topP : undefined;
  const responseFormat = options.jsonMode ? { type: "json_object" } : undefined;

  if (!config.enabled || !config.proxyUrl) {
    return Promise.reject(new Error("AI 未启用或缺少云端代理地址"));
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: config.proxyUrl,
      method: "POST",
      timeout,
      header: {
        "content-type": "application/json"
      },
      data: {
        messages,
        temperature,
        stream: false,
        max_tokens: maxTokens,
        top_p: topP,
        response_format: responseFormat
      },
      success(res) {
        if (res.statusCode >= 400) {
          const message = typeof res.data === "string" ? res.data : JSON.stringify(res.data || {});
          reject(new Error("AI 请求失败：" + res.statusCode + " " + message));
          return;
        }
        if (typeof res.data === "string") {
          resolve(res.data);
          return;
        }
        if (res.data && res.data.ok === false) {
          reject(new Error(res.data.error || "AI 请求失败"));
          return;
        }
        resolve((res.data && (res.data.content || res.data.text)) || JSON.stringify(res.data || {}));
      },
      fail(err) {
        reject(new Error(err.errMsg || "AI 请求失败"));
      }
    });
  });
}

function testConnection(config) {
  return streamChat({
    config,
    temperature: 0,
    messages: [
      { role: "system", content: "你是连接测试服务。只回复 OK。" },
      { role: "user", content: "请回复 OK" }
    ]
  });
}

module.exports = {
  streamChat,
  requestChat,
  testConnection,
  describeError,
  previewTurnText
};
