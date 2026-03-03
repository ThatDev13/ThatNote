const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DEFAULT_OPENAI_API_KEY = "sk-abcd5678efgh1234abcd5678efgh1234abcd5678";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const sendJson = (res, status, payload) => {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const serveFile = (reqPath, res) => {
  const safePath = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, "");
  let filePath = path.join(ROOT, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = MIME_TYPES[ext] || "application/octet-stream";
      setCorsHeaders(res);
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
  });
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });

const handleAi = async (req, res) => {
  try {
    const body = await parseBody(req);
    const mode = body.mode || "markdown";
    const text = body.text || "";
    const prompt = body.prompt || "";

    if (!prompt.trim()) {
      sendJson(res, 400, { error: "Missing prompt" });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEFAULT_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.6,
        max_output_tokens: 1200,
        input: `Editor mode: ${mode}\n\nCurrent note:\n${text}\n\nTask:\n${prompt}\n\nReturn only the final rewritten note text without explanations.`,
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      sendJson(res, response.status, { error: raw || "OpenAI error" });
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      sendJson(res, 502, { error: "Invalid AI response" });
      return;
    }

    const outputText =
      (typeof data.output_text === "string" && data.output_text.trim()) ||
      (Array.isArray(data.output)
        ? data.output
            .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
            .map((part) => (typeof part.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "");

    if (!outputText) {
      sendJson(res, 502, { error: "No output text" });
      return;
    }

    sendJson(res, 200, { outputText });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ai") {
    handleAi(req, res);
    return;
  }

  if (req.method === "GET") {
    serveFile(url.pathname, res);
    return;
  }

  res.writeHead(405);
  res.end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`ThatNote server running on http://localhost:${PORT}`);
});
