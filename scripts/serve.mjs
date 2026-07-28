// 대시보드 로컬 서버 + 피드백(👍/👎) 수신.
// 사용: node scripts/serve.mjs [포트]  →  http://localhost:8787
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = process.argv[2] ? +process.argv[2] : 8787;
const ROOT = process.cwd();
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
};

import { readLearnedDocument, writeLearnedDocument } from "../src/profile.mjs";

// 피드백 → data/learned.json
async function recordFeedback(body) {
  const p = await readLearnedDocument();
  p.liked_companies = p.liked_companies || [];
  p.disliked_companies = p.disliked_companies || [];
  p.feedback_log = p.feedback_log || [];
  const co = (body.company || "").trim();
  const day = new Date().toISOString().slice(0, 10);
  if (body.reaction === "up" && co) {
    if (!p.liked_companies.includes(co)) p.liked_companies.push(co);
    p.disliked_companies = p.disliked_companies.filter((c) => c !== co);
  } else if (body.reaction === "down" && co) {
    if (!p.disliked_companies.includes(co)) p.disliked_companies.push(co);
    p.liked_companies = p.liked_companies.filter((c) => c !== co);
  }
  p.feedback_log.push({ when: day, id: body.id, title: body.title, company: co, reaction: body.reaction });
  await writeLearnedDocument(p);
  return { ok: true, liked: p.liked_companies.length, disliked: p.disliked_companies.length };
}

createServer(async (req, res) => {
  // 피드백 수신
  if (req.method === "POST" && (req.url || "").startsWith("/feedback")) {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", async () => {
      try {
        const result = await recordFeedback(JSON.parse(raw || "{}"));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  // 정적 파일
  try {
    let pth = decodeURIComponent((req.url || "/").split("?")[0]);
    if (pth === "/" || pth === "") pth = "/reports/dashboard.html";
    const fp = normalize(join(ROOT, pth));
    if (!fp.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    const data = await readFile(fp);
    // 캐시 금지 — 공고를 새로 찾은 뒤에도 브라우저가 옛 대시보드를 그대로 띄우는 일을 막는다
    res.writeHead(200, {
      "Content-Type": TYPES[extname(fp)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT, () => console.log(`serving on http://localhost:${PORT}  (대시보드: http://localhost:${PORT}/ )`));
