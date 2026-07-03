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

function streamChat(options) {
  const config = options.config || {};
  const messages = options.messages || [];
  const onDelta = options.onDelta || function () {};
  const temperature = typeof options.temperature === "number" ? options.temperature : 0.82;

  if (!config.enabled || !config.apiKey) {
    return Promise.reject(new Error("AI 未启用或缺少 API Key"));
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
      url: config.endpoint,
      method: "POST",
      enableChunked: true,
      timeout: 120000,
      header: {
        "content-type": "application/json",
        "authorization": "Bearer " + config.apiKey
      },
      data: {
        model: config.model,
        messages,
        stream: true,
        temperature
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

module.exports = {
  streamChat
};
