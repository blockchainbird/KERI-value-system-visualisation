/**
 * Save/load of the graph dataset using the HTML5 File System Access API
 * (showSaveFilePicker / showOpenFilePicker), with a graceful fallback to
 * a download link and <input type="file"> for browsers without it.
 */

const FILE_TYPES = [{
  description: 'KERI value graph (JSON)',
  accept: { 'application/json': ['.json'] },
}];

export async function saveGraphFile(data, suggestedName = 'keri-values.json') {
  const json = JSON.stringify(data, null, 2);

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName, types: FILE_TYPES });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return { saved: true, name: handle.name };
    } catch (err) {
      if (err.name === 'AbortError') return { saved: false };
      throw err;
    }
  }

  // Fallback: trigger a download.
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  return { saved: true, name: suggestedName };
}

export async function loadGraphFile() {
  let text;
  let name;

  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES });
      const file = await handle.getFile();
      text = await file.text();
      name = file.name;
    } catch (err) {
      if (err.name === 'AbortError') return { loaded: false };
      throw err;
    }
  } else {
    const file = await pickFileFallback();
    if (!file) return { loaded: false };
    text = await file.text();
    name = file.name;
  }

  const data = JSON.parse(text);
  validateGraphData(data);
  return { loaded: true, name, data };
}

function pickFileFallback() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => resolve(input.files[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function validateGraphData(data) {
  if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
    throw new Error('Invalid file: expected "nodes" and "links" arrays.');
  }
  const ids = new Set(data.nodes.map((n) => n.id));
  for (const l of data.links) {
    if (!ids.has(l.source) || !ids.has(l.target)) {
      throw new Error(`Invalid file: link ${l.source} → ${l.target} references an unknown node.`);
    }
  }
  data.groups ??= {};
  for (const n of data.nodes) {
    n.weight = Number(n.weight) || 1;
    n.label ??= n.id;
    n.tag ??= '';
    n.description ??= '';
    n.kiss ??= '';
  }
  for (const l of data.links) {
    l.weight = Number(l.weight) || 1;
    l.context ??= '';
    l.kiss ??= '';
    l.personas ??= '';
  }
  return data;
}
