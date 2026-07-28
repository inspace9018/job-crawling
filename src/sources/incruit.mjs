// 인크루트(Incruit) — search.incruit.com HTML (EUC-KR).
import { UA } from "../util.mjs";

const SEARCH = "https://search.incruit.com/list/search.asp";

async function fetchHtmlCp949(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "ko-KR,ko;q=0.9" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  try {
    return new TextDecoder("euc-kr").decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

function strip(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseList(html, keyword) {
  const jobs = [];
  const seen = new Set();
  const rows = html.split("<ul class=\"c_row");
  for (let i = 1; i < rows.length; i++) {
    const block = rows[i].slice(0, 5000);
    const jobM = block.match(/jobpost\.asp\?job=(\d+)/i);
    if (!jobM) continue;
    const id = jobM[1];
    if (seen.has(id)) continue;
    const companyM = block.match(/class="cpname"[^>]*>([\s\S]*?)<\//);
    const titleM = block.match(/jobpost\.asp\?job=\d+[^>]*>([\s\S]*?)<\//);
    seen.add(id);
    jobs.push({
      source: "incruit",
      id: `incruit:${id}`,
      title: strip(titleM ? titleM[1] : "채용공고"),
      company: strip(companyM ? companyM[1] : ""),
      url: `https://job.incruit.com/jobdb_info/jobpost.asp?job=${id}`,
      location: "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      keyword,
    });
  }
  return jobs;
}

export async function fetchIncruit(keyword, { pages = 1 } = {}) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url = `${SEARCH}?col=job&kw=${encodeURIComponent(keyword)}&page=${p}`;
    try {
      const html = await fetchHtmlCp949(url);
      const items = parseList(html, keyword);
      if (!items.length) break;
      out.push(...items);
    } catch (e) {
      console.error(`  [incruit] "${keyword}" p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}

export async function fetchIncruitByCompany(company, { pages = 1 } = {}) {
  const items = await fetchIncruit(`${company} 디자인`, { pages });
  const norm = company.replace(/\s/g, "");
  return items.filter((j) => (j.company || "").replace(/\s/g, "").includes(norm));
}
