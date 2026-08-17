#!/usr/bin/env node
// Cuts the per-persona clip reels defined in src/data/keri-personas.json into
// actual mp4 files, using the hosted KERICONF26 recordings.
//
//   node scripts/cut-persona-clips.mjs [videosDir|galleryUrl] [outDir]
//
// Default source is https://keri.foundation/confs/2026/videos/ (site.json + mp4s).
// Pass a local directory as the first argument (or VIDEOS_DIR) to cut from disk.
//
// Defaults:
//   galleryUrl = https://keri.foundation/confs/2026/videos/
//   outDir     = <repo>/clips/personas
//              = <videosDir>/../clips/personas  (when a local dir is given)
//
// Per persona it writes <outDir>/<personaId>/NN-<clipId>.mp4 (normalised to
// 720p so they can be joined) plus a single concatenated <personaId>-reel.mp4.
// Requires ffmpeg. Uses the h264_videotoolbox hardware encoder when available
// (macOS), falling back to libx264.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const personasPath = join(root, 'src/data/keri-personas.json');

const DEFAULT_GALLERY_URL = 'https://keri.foundation/confs/2026/videos/';

function withSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function parseArgs() {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const galleryUrl = withSlash(process.env.GALLERY_URL || DEFAULT_GALLERY_URL);
  const explicitLocal = process.env.VIDEOS_DIR || (arg1 && !arg1.startsWith('http') ? arg1 : null);
  const localDir = explicitLocal && existsSync(resolve(explicitLocal)) ? resolve(explicitLocal) : null;
  const outHint = process.env.OUT_DIR || (arg1?.startsWith('http') ? arg2 : explicitLocal ? arg2 : arg1);

  return {
    localDir,
    galleryUrl: arg1?.startsWith('http') ? withSlash(arg1) : galleryUrl,
    outDir: resolve(
      outHint || (localDir ? join(localDir, '..', 'clips', 'personas') : join(root, 'clips', 'personas')),
    ),
  };
}

const { localDir, galleryUrl, outDir } = parseArgs();

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

// Match "Talk Title - Speaker" against "Speaker ｜ Talk Title ｜ KERI Conference 2026.mp4".
// Token-subset match with a small tolerance so typos in filenames still resolve.
function findLocalFile(videoTitle, files) {
  const wanted = norm(videoTitle);
  let best = null;
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.mp4')) continue;
    const have = new Set(norm(f));
    let hits = 0;
    for (const t of wanted) {
      if (have.has(t)) hits += 1;
      else if ([...have].some((h) => h.startsWith(t) || t.startsWith(h))) hits += 0.8;
    }
    const score = hits / wanted.length;
    if (!best || score > best.score) best = { file: f, score };
  }
  return best && best.score >= 0.8 ? best.file : null;
}

function hasVideotoolbox() {
  try {
    return execSync('ffmpeg -hide_banner -encoders 2>/dev/null', { encoding: 'utf8' }).includes(
      'h264_videotoolbox',
    );
  } catch {
    return false;
  }
}

function isPlayable(file) {
  try {
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

async function loadSite() {
  const url = `${galleryUrl}site.json`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch site.json failed: HTTP ${res.status}`);
  return res.json();
}

function mp4Url(relPath) {
  return new URL(relPath, galleryUrl).href;
}

function resolveSource(clip, files, videos) {
  if (files) {
    const src = findLocalFile(clip.videoTitle, files);
    if (src) return { type: 'file', input: join(localDir, src) };
  }
  if (clip.path) return { type: 'url', input: mp4Url(clip.path) };
  const exact = videos.find((v) => v.title === clip.videoTitle);
  if (exact?.path) return { type: 'url', input: mp4Url(exact.path) };
  const name = findLocalFile(
    clip.videoTitle,
    videos.map((v) => v.path.split('/').pop()),
  );
  if (!name) return null;
  const match = videos.find((v) => v.path.split('/').pop() === name);
  return match?.path ? { type: 'url', input: mp4Url(match.path) } : null;
}

async function main() {
  const { personas } = JSON.parse(readFileSync(personasPath, 'utf8'));
  const site = await loadSite();
  const videos = site.videos ?? [];
  const files = localDir ? readdirSync(localDir) : null;
  const vt = hasVideotoolbox();
  const videoArgs = vt
    ? ['-c:v', 'h264_videotoolbox', '-b:v', '3500k']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22'];
  console.log(
    `Videos:  ${localDir ?? `${galleryUrl}KERICONF26/ (remote)`}\nOutput:  ${outDir}\nEncoder: ${vt ? 'h264_videotoolbox' : 'libx264'}\n`,
  );

  for (const p of personas) {
    const dir = join(outDir, p.id);
    mkdirSync(dir, { recursive: true });
    const cutPaths = [];

    p.clips.forEach((c, i) => {
      const src = resolveSource(c, files, videos);
      if (!src) {
        console.warn(`  !! no source for "${c.videoTitle}" — skipping ${c.id}`);
        return;
      }
      const out = join(dir, `${String(i + 1).padStart(2, '0')}-${c.id}.mp4`);
      cutPaths.push(out);
      if (existsSync(out) && isPlayable(out)) {
        console.log(`  = ${p.id}/${String(i + 1).padStart(2, '0')}-${c.id}.mp4 (exists)`);
        return;
      }
      const dur = Math.max((c.end ?? c.start + 60) - c.start, 1);
      console.log(
        `  > ${p.id}/${String(i + 1).padStart(2, '0')}-${c.id}.mp4  ${c.speaker} [${c.start}-${c.end}s] ${src.type === 'url' ? '(http)' : ''}`,
      );
      const httpArgs =
        src.type === 'url'
          ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5']
          : [];
      execFileSync(
        'ffmpeg',
        [
          '-hide_banner', '-loglevel', 'error', '-y',
          ...httpArgs,
          '-ss', String(c.start),
          '-i', src.input,
          '-t', String(dur),
          '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30',
          ...videoArgs,
          '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
          '-movflags', '+faststart',
          out,
        ],
        { stdio: 'inherit' },
      );
    });

    if (cutPaths.length) {
      const listFile = join(dir, 'concat.txt');
      writeFileSync(listFile, cutPaths.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
      const reel = join(outDir, `${p.id}-reel.mp4`);
      console.log(`  # reel: ${p.id}-reel.mp4 (${cutPaths.length} clips)`);
      execFileSync(
        'ffmpeg',
        ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', reel],
        { stdio: 'inherit' },
      );
    }
    console.log('');
  }
  console.log('Done.');
}

await main();
