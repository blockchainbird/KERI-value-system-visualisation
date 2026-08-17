/**
 * Regenerates src/data/keri-clips.json from the "SEGMENTS ..." sub-issues of
 * keri-foundation/CONF26-subtitles#21. Usage: npm run fetch-clips
 *
 * Each sub-issue analyses one conference talk: lines starting with a timestamp
 * (optionally a range) describe a segment, with KERI value tags (SECUFIRST,
 * SAFETY, ...) mentioned inline. Segments that carry at least one tag become
 * clips, playable in the video gallery via its hash deep-link mechanism:
 *   <galleryUrl>#<videoId>&t=<start>&e=<end>
 */
import { readFile, writeFile } from 'node:fs/promises';

const SUB_ISSUES_URL =
  'https://api.github.com/repos/keri-foundation/CONF26-subtitles/issues/21/sub_issues?per_page=100';

// Public gallery: site.json supplies the talk titles the gallery slugifies into
// #<videoId>&t=..&e=.. deep links, plus the relative mp4 paths.
const GALLERY_URL = 'https://keri.foundation/confs/2026/videos/';

const VALUES_JSON = new URL('../src/data/keri-values.json', import.meta.url);
const OUTPUT = new URL('../src/data/keri-clips.json', import.meta.url);

// Misspellings and variants of value tags found in the sub-issues.
const TAG_ALIASES = {
  MINIMSUFF: 'MINIMSUFFI',
  MINISUFFI: 'MINIMSUFFI',
  MINIMUFFI: 'MINIMSUFFI',
  MATURE: 'MATURITY',
  ECONINF: 'ECONINFEA',
  VERNOVAL: 'VERNOTVAL',
  OTHRUNSAFE: 'OTHUNSAFE',
  HARDPROB1ST: 'HARPROB1ST',
  PROVCONTEXT: 'PROVCONTXT',
  PROVCCONTXT: 'PROVCONTXT',
  '1PERCONTR': '1PERSCONTR',
  '1PERDSCONTR': '1PERSCONTR',
  INLCUSIVE: 'INCLUSIVE',
  SECFIRST: 'SECUFIRST',
  SECUFRIST: 'SECUFIRST',
  SECUROTY: 'SECUFIRST',
  SECURITY: 'SECUFIRST',
  GRALICONF: 'GRALIFCONF',
  GRALIFCON: 'GRALIFCONF',
  PERPUTUAL: 'PERPETUAL',
  LGEOVPOL: 'LEGOVPOL',
  LERGOVPOL: 'LEGOVPOL',
  NOSHARESECR: 'NOSHARSECR',
  COMMUEDU: 'COMMUNEDU',
  COMMMUNEDU: 'COMMUNEDU',
  REALPRAGM: 'REALMPRAGM',
  SCALABILITY: 'ATSCALE',
};

const TS = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}`;
const SEGMENT_LINE = new RegExp(String.raw`^\s*(${TS})\s*(?:[-–]\s*(${TS}))?\s*(.*)$`);
const TERMS_HEADING = /^\s*#*\s*(NEW\s+TERMS?|TERMS?\s+NEW)\b/i;

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'for', 'to', 'with', 'keynote', 'break', 'out', 'segments']);

function parseTimestamp(ts) {
  const parts = ts.split(':').map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function tokenize(title) {
  return new Set(
    title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOPWORDS.has(t))
  );
}

/** Same slug algorithm as generateVideoId() in the gallery's gallery.js. */
function videoIdFromTitle(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function matchVideo(issueTitle, videos) {
  const issueTokens = tokenize(issueTitle.replace(/^SEGMENTS\s*/i, ''));
  let best = null;
  let bestScore = 0;
  for (const video of videos) {
    const vTokens = tokenize(video.title);
    const inter = [...issueTokens].filter((t) => vTokens.has(t)).length;
    const union = new Set([...issueTokens, ...vTokens]).size;
    const score = union ? inter / union : 0;
    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

function extractTags(text, knownIds) {
  const tags = new Set();
  for (const token of text.split(/[^A-Za-z0-9]+/)) {
    if (!token || token !== token.toUpperCase() || !/[A-Z]/.test(token)) continue;
    const id = knownIds.has(token) ? token : TAG_ALIASES[token];
    if (id && knownIds.has(id)) tags.add(id);
  }
  return [...tags];
}

function cleanQuote(text, knownIds) {
  let out = text;
  for (const token of text.split(/[^A-Za-z0-9]+/)) {
    if (!token || token !== token.toUpperCase() || !/[A-Z]/.test(token)) continue;
    if (knownIds.has(token) || TAG_ALIASES[token]) {
      out = out.replace(new RegExp(String.raw`\(?~?${token}\)?[.,;:]?`, 'g'), ' ');
    }
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/^[\s\-–,.;:]+|[\s\-–,]+$/g, '')
    .trim();
}

function parseSegments(body) {
  const segments = [];
  for (const line of body.split('\n')) {
    if (TERMS_HEADING.test(line)) break;
    if (/^\s*#/.test(line)) continue;
    const m = line.match(SEGMENT_LINE);
    if (m) {
      segments.push({
        start: parseTimestamp(m[1]),
        end: m[2] ? parseTimestamp(m[2]) : null,
        text: m[3].trim(),
      });
    } else if (segments.length && line.trim()) {
      segments.at(-1).text += ` ${line.trim()}`;
    }
  }
  // Fill in missing end times: run until the next segment, else 60 seconds.
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (seg.end === null || seg.end <= seg.start) {
      const next = segments[i + 1];
      seg.end = next && next.start > seg.start ? next.start : seg.start + 60;
    }
  }
  return segments;
}

function clipsFromIssue(issue, video, knownIds) {
  const dashIdx = video.title.lastIndexOf(' - ');
  const talk = dashIdx === -1 ? video.title : video.title.slice(0, dashIdx);
  const speaker = dashIdx === -1 ? '' : video.title.slice(dashIdx + 3);

  const clips = [];
  let skipped = 0;
  for (const seg of parseSegments(issue.body ?? '')) {
    const tags = extractTags(seg.text, knownIds);
    if (!tags.length) {
      skipped += 1;
      continue;
    }
    clips.push({
      id: `${issue.number}-${clips.length + 1}`,
      issue: issue.number,
      issueUrl: issue.html_url,
      videoId: videoIdFromTitle(video.title),
      videoTitle: video.title,
      path: video.path,
      talk,
      speaker,
      start: seg.start,
      end: seg.end,
      quote: cleanQuote(seg.text, knownIds),
      tags,
    });
  }
  return { clips, skipped };
}

async function loadSite() {
  const url = `${GALLERY_URL}site.json`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch site.json failed: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const values = JSON.parse(await readFile(VALUES_JSON, 'utf8'));
  const knownIds = new Set(values.nodes.map((n) => n.id));

  const site = await loadSite();
  const videos = site.videos;

  console.log(`Fetching ${SUB_ISSUES_URL}`);
  const headers = { Accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(SUB_ISSUES_URL, { headers });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const issues = await res.json();

  const clips = [];
  let skippedUntagged = 0;
  for (const issue of issues) {
    if (!/^SEGMENTS/i.test(issue.title)) continue;
    const video = matchVideo(issue.title, videos);
    if (!video) {
      console.warn(`  Skipping issue #${issue.number} "${issue.title}": no matching video found`);
      continue;
    }
    const result = clipsFromIssue(issue, video, knownIds);
    clips.push(...result.clips);
    skippedUntagged += result.skipped;
    console.log(`  #${issue.number} "${issue.title}" → ${video.title}: ${result.clips.length} clips`);
  }

  const data = {
    meta: {
      source: 'https://github.com/keri-foundation/CONF26-subtitles/issues/21',
      galleryUrl: GALLERY_URL,
      generated: new Date().toISOString().slice(0, 10),
      notes:
        'Generated from the SEGMENTS sub-issues by scripts/fetch-clips.mjs. '
        + 'Only segments mentioning at least one value tag are included. '
        + `A clip link is <galleryUrl>#<videoId>&t=<start>&e=<end>.`,
    },
    clips,
  };

  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${clips.length} clips to src/data/keri-clips.json (${skippedUntagged} untagged segments skipped)`);
}

await main();
