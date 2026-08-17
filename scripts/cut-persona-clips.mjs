#!/usr/bin/env node
// Cuts the per-persona clip reels defined in src/data/keri-personas.json into
// actual mp4 files, using the local KERICONF26 recordings.
//
//   node scripts/cut-persona-clips.mjs [videosDir] [outDir]
//
// Defaults:
//   videosDir = ~/webdev/wordpress-sites/kerifoundation/confs/2026/videos/KERICONF26
//   outDir    = <videosDir>/../clips/personas
//
// Per persona it writes <outDir>/<personaId>/NN-<clipId>.mp4 (normalised to
// 720p so they can be joined) plus a single concatenated <personaId>-reel.mp4.
// Requires ffmpeg. Uses the h264_videotoolbox hardware encoder when available
// (macOS), falling back to libx264.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const personasPath = join(root, 'src/data/keri-personas.json');

const videosDir = resolve(
  process.argv[2] ||
    join(homedir(), 'webdev/wordpress-sites/kerifoundation/confs/2026/videos/KERICONF26'),
);
const outDir = resolve(process.argv[3] || join(videosDir, '..', 'clips', 'personas'));

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

function main() {
  const { personas } = JSON.parse(readFileSync(personasPath, 'utf8'));
  const files = readdirSync(videosDir);
  const vt = hasVideotoolbox();
  const videoArgs = vt
    ? ['-c:v', 'h264_videotoolbox', '-b:v', '3500k']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22'];
  console.log(`Videos:  ${videosDir}\nOutput:  ${outDir}\nEncoder: ${vt ? 'h264_videotoolbox' : 'libx264'}\n`);

  for (const p of personas) {
    const dir = join(outDir, p.id);
    mkdirSync(dir, { recursive: true });
    const cutPaths = [];

    p.clips.forEach((c, i) => {
      const src = findLocalFile(c.videoTitle, files);
      if (!src) {
        console.warn(`  !! no local file for "${c.videoTitle}" — skipping ${c.id}`);
        return;
      }
      const out = join(dir, `${String(i + 1).padStart(2, '0')}-${c.id}.mp4`);
      cutPaths.push(out);
      if (existsSync(out) && isPlayable(out)) {
        console.log(`  = ${p.id}/${String(i + 1).padStart(2, '0')}-${c.id}.mp4 (exists)`);
        return;
      }
      console.log(`  > ${p.id}/${String(i + 1).padStart(2, '0')}-${c.id}.mp4  ${c.speaker} [${c.start}-${c.end}s]`);
      execFileSync(
        'ffmpeg',
        [
          '-hide_banner', '-loglevel', 'error', '-y',
          '-ss', String(c.start), '-to', String(c.end),
          '-i', join(videosDir, src),
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

main();
