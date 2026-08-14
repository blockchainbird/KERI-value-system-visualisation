/**
 * Regenerates src/data/keri-values.json from the published Google Sheet.
 * Usage: npm run fetch-data
 *
 * Nodes tab: Tag, Description, "Vertices / referenced tags", Type
 * Vertices tab: Source, Destination, Connection Context, Personas
 */
import { writeFile } from 'node:fs/promises';

const SHEET_PUB =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXBjF4JsmIt3RDMBE50hvT_RDipotMcsELpQxE_GEY9ieCoFf5uz1bOUzKjE6vvs333QBdgDHjKeK/pub';

const NODES_GID = '1745295798';
const VERTICES_GID = '1369863761';

const OUTPUT = new URL('../src/data/keri-values.json', import.meta.url);

// Known sheet "Type" values mapped to stable group ids and colours.
// Unknown types get a generated group so new categories in the sheet just work.
const TYPE_GROUPS = {
  'KERISuite unique': { id: 'unique-value', label: 'KERISuite unique values', color: '#7ee08a' },
  'More common values': { id: 'common-value', label: 'More common values', color: '#c792ea' },
  'Common absent values': { id: 'missing-value', label: 'Common absent values', color: '#f07178' },
};

const FALLBACK_COLORS = ['#f2c14e', '#5ab1f0', '#e8a2c8', '#8ad4d0', '#d9b38c'];

function csvUrl(gid) {
  return `${SHEET_PUB}?gid=${gid}&single=true&output=csv`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function headerIndex(header, name) {
  return header.findIndex((h) => h.startsWith(name));
}

function extractTag(description) {
  const match = description.match(/\{(conscientious|mature)\}/);
  const tag = match?.[1] ?? '';
  const cleaned = tag
    ? description.replaceAll(`{${tag}}`, '').replace(/ {2,}/g, ' ').trim()
    : description.trim();
  return { tag, description: cleaned };
}

async function fetchCsv(label, gid) {
  const url = csvUrl(gid);
  console.log(`Fetching ${label}: ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Fetch ${label} failed: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

function linkKey(source, target) {
  return `${source}→${target}`;
}

async function main() {
  const nodeRows = await fetchCsv('Nodes', NODES_GID);
  const vertexRows = await fetchCsv('Vertices', VERTICES_GID);

  const nodeHeader = nodeRows.shift().map((h) => h.trim().toLowerCase());
  const iTag = headerIndex(nodeHeader, 'tag');
  const iDesc = headerIndex(nodeHeader, 'description');
  const iVertices = headerIndex(nodeHeader, 'vertices');
  const iType = headerIndex(nodeHeader, 'type');
  if ([iTag, iDesc, iVertices, iType].includes(-1)) {
    throw new Error(`Unexpected Nodes header: ${nodeHeader.join(', ')}`);
  }

  const vertexHeader = vertexRows.shift().map((h) => h.trim().toLowerCase());
  const iSource = headerIndex(vertexHeader, 'source');
  const iDest = headerIndex(vertexHeader, 'destination');
  const iContext = headerIndex(vertexHeader, 'connection');
  const iPersonas = headerIndex(vertexHeader, 'personas');
  if ([iSource, iDest, iContext, iPersonas].includes(-1)) {
    throw new Error(`Unexpected Vertices header: ${vertexHeader.join(', ')}`);
  }

  const groups = {};
  let fallbackIdx = 0;
  const groupIdForType = (type) => {
    const known = TYPE_GROUPS[type];
    const id = known?.id ?? type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!groups[id]) {
      groups[id] = {
        label: known?.label ?? type,
        color: known?.color ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
      };
    }
    return id;
  };

  const nodes = [];
  const nodeColumnRefs = [];
  for (const row of nodeRows) {
    const id = row[iTag].trim();
    if (!id) continue;
    const { tag, description } = extractTag(row[iDesc].trim());
    nodes.push({
      id,
      label: id,
      group: groupIdForType(row[iType].trim()),
      weight: 0,
      tag,
      description,
    });
    for (const ref of row[iVertices].split(',').map((s) => s.trim()).filter(Boolean)) {
      nodeColumnRefs.push({ source: id, target: ref });
    }
  }

  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set();
  const links = [];

  for (const row of vertexRows) {
    const source = (row[iSource] ?? '').trim();
    const target = (row[iDest] ?? '').trim();
    if (!source || !target) continue;
    if (!ids.has(source) || !ids.has(target)) {
      console.warn(`  Skipping vertex ${source} → ${target}: unknown tag`);
      continue;
    }
    const key = linkKey(source, target);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      source,
      target,
      weight: 1,
      context: (row[iContext] ?? '').trim(),
      personas: (row[iPersonas] ?? '').trim(),
    });
  }

  // Keep any Nodes-tab references that are not yet in the Vertices tab.
  for (const { source, target } of nodeColumnRefs) {
    if (!ids.has(target)) {
      console.warn(`  Skipping Nodes-tab link ${source} → ${target}: unknown tag "${target}"`);
      continue;
    }
    const key = linkKey(source, target);
    if (seen.has(key)) continue;
    seen.add(key);
    console.warn(`  Adding Nodes-tab link missing from Vertices: ${source} → ${target}`);
    links.push({ source, target, weight: 1, context: '', personas: '' });
  }

  const degree = new Map();
  for (const l of links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  for (const n of nodes) {
    n.weight = Math.min(3 + (degree.get(n.id) ?? 0), 9);
  }

  const data = {
    meta: {
      title: 'KERI Value System',
      source: csvUrl(NODES_GID),
      verticesSource: csvUrl(VERTICES_GID),
      updated: new Date().toISOString().slice(0, 10),
      notes:
        'Generated from the published Google Sheet by scripts/fetch-data.mjs. ' +
        'Nodes come from the Nodes tab; links come from the Vertices tab ' +
        '(Source, Destination, Connection Context, Personas). ' +
        'Node weight is derived from the number of connections (3-9); link weight defaults to 1. ' +
        'Weights are subjective and adjustable in the edit panel.',
    },
    groups,
    nodes,
    links,
  };

  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${nodes.length} nodes, ${links.length} links to src/data/keri-values.json`);
}

await main();
