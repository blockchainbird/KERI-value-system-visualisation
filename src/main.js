import { createGraph } from './graph.js';
import { createEditor } from './editor.js';
import { saveGraphFile, loadGraphFile, validateGraphData } from './fileio.js';
import defaultData from './data/keri-values.json';
import clipsData from './data/keri-clips.json';

// The model is the canonical dataset: links keep string source/target ids.
// D3 gets cloned link objects so it can replace ids with node references.
let model = structuredClone(defaultData);

const fileHint = document.getElementById('file-hint');

const clipCountByTag = new Map();
for (const clip of clipsData.clips) {
  for (const tag of clip.tags) {
    clipCountByTag.set(tag, (clipCountByTag.get(tag) ?? 0) + 1);
  }
}

const panel = document.getElementById('panel');
const panelHandle = document.getElementById('panel-handle');
const btnPanelOpen = document.getElementById('btn-panel-open');
const btnPanelClose = document.getElementById('btn-panel-close');

function setPanelOpen(open) {
  panel.classList.toggle('is-open', open);
  document.getElementById('app').classList.toggle('panel-open', open);
  panel.toggleAttribute('inert', !open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  panelHandle.setAttribute('aria-expanded', open ? 'true' : 'false');
  panelHandle.title = open ? 'Close more' : 'Open more';
}

function openPanel() { setPanelOpen(true); }
function closePanel() { setPanelOpen(false); }
function togglePanel() { setPanelOpen(!panel.classList.contains('is-open')); }

function nudgeEditorTab() {
  if (panel.classList.contains('is-open')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of [panelHandle, btnPanelOpen]) {
    el.classList.remove('wobble');
    void el.offsetWidth;
    el.classList.add('wobble');
  }
}

panelHandle.addEventListener('animationend', () => panelHandle.classList.remove('wobble'));
btnPanelOpen.addEventListener('animationend', () => btnPanelOpen.classList.remove('wobble'));

panelHandle.onclick = togglePanel;
btnPanelOpen.onclick = openPanel;
btnPanelClose.onclick = closePanel;
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanel();
});

const LEVEL_KEY = 'keri-explanation-level';
let level = localStorage.getItem(LEVEL_KEY) === 'expert' ? 'expert' : 'beginner';

function syncLevelButtons() {
  for (const btn of document.querySelectorAll('#level-toggle [data-level]')) {
    btn.classList.toggle('is-active', btn.dataset.level === level);
  }
}
syncLevelButtons();

const graph = createGraph(document.getElementById('graph'), {
  onNodeClick: (id) => editor.selectNode(id),
  onLinkClick: (source, target) => editor.selectLink(source, target),
  getClipCount: (id) => clipCountByTag.get(id) ?? 0,
  getLevel: () => level,
});

const editor = createEditor({
  getModel: () => model,
  onChange: render,
  onSelectNode: (id) => {
    graph.setSelected(id);
    if (id) nudgeEditorTab();
  },
  onSearch: (ids) => graph.setSearchHighlight(ids),
  clips: clipsData,
  getLevel: () => level,
});

function setLevel(next) {
  level = next === 'expert' ? 'expert' : 'beginner';
  localStorage.setItem(LEVEL_KEY, level);
  syncLevelButtons();
  editor.render();
}

for (const btn of document.querySelectorAll('#level-toggle [data-level]')) {
  btn.onclick = () => setLevel(btn.dataset.level);
}

const EDITOR_KEY = 'keri-editor-enabled';
let editorEnabled = localStorage.getItem(EDITOR_KEY) === 'on';

function setEditorEnabled(on) {
  editorEnabled = on;
  localStorage.setItem(EDITOR_KEY, on ? 'on' : 'off');
  document.getElementById('app').classList.toggle('editor-on', on);
  for (const btn of document.querySelectorAll('#editor-toggle [data-editor]')) {
    btn.classList.toggle('is-active', (btn.dataset.editor === 'on') === on);
  }
}

for (const btn of document.querySelectorAll('#editor-toggle [data-editor]')) {
  btn.onclick = () => setEditorEnabled(btn.dataset.editor === 'on');
}
setEditorEnabled(editorEnabled);

const GRAVITY_KEY = 'keri-gravity-scale';
const GRAVITY_SLIDER_DEFAULT = 20;
const GRAVITY_MAX = 100;
let gravityValue = GRAVITY_SLIDER_DEFAULT;

function sliderToScale(value) {
  const t = Number(value) / GRAVITY_SLIDER_DEFAULT;
  if (t >= 1) return t;
  return t * t;
}

function syncGravityToggle(value) {
  const n = Number(value);
  for (const btn of document.querySelectorAll('#gravity-stepper [data-gravity]')) {
    const g = Number(btn.dataset.gravity);
    btn.classList.toggle('is-active', g === GRAVITY_MAX ? n >= GRAVITY_SLIDER_DEFAULT : n < GRAVITY_SLIDER_DEFAULT);
  }
}

function applyGravityValue(value) {
  gravityValue = Number(value);
  localStorage.setItem(GRAVITY_KEY, String(gravityValue));
  graph.setGravityScale(sliderToScale(gravityValue));
  syncGravityToggle(gravityValue);
}

const savedGravity = Number(localStorage.getItem(GRAVITY_KEY));
applyGravityValue(Number.isFinite(savedGravity) ? savedGravity : GRAVITY_SLIDER_DEFAULT);

for (const btn of document.querySelectorAll('#gravity-stepper [data-gravity]')) {
  btn.onclick = () => applyGravityValue(btn.dataset.gravity);
}

function render() {
  graph.update({
    nodes: model.nodes,
    links: model.links.map((l) => ({ ...l })),
    groups: model.groups,
  });
  editor.render();
  renderLegend();
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = Object.values(model.groups)
    .map((g) => `
      <div class="legend-item">
        <span class="legend-swatch" style="background:${g.color}"></span>
        <span>${g.label}</span>
      </div>`)
    .join('');
}

// ---------- file actions ----------

function serializableModel() {
  // Strip the simulation properties D3 adds to node objects.
  return {
    meta: { ...model.meta, updated: new Date().toISOString().slice(0, 10) },
    groups: model.groups,
    nodes: model.nodes.map(({ id, label, group, layer, weight, tag, description, kiss }) =>
      ({ id, label, group, layer: layer ?? 'values', weight, tag, description, kiss: kiss ?? '' })),
    links: model.links.map(({ source, target, weight, context, kiss, personas, layer }) =>
      ({ source, target, weight, context: context ?? '', kiss: kiss ?? '', personas: personas ?? '', layer: layer ?? 'values' })),
  };
}

document.getElementById('btn-save').onclick = async () => {
  try {
    const result = await saveGraphFile(serializableModel());
    fileHint.textContent = result.saved ? `Saved as ${result.name}` : 'Save cancelled.';
  } catch (err) {
    fileHint.textContent = `Save failed: ${err.message}`;
  }
};

document.getElementById('btn-load').onclick = async () => {
  try {
    const result = await loadGraphFile();
    if (!result.loaded) {
      fileHint.textContent = 'Load cancelled.';
      return;
    }
    model = result.data;
    render();
    setTimeout(() => graph.zoomFit(), 800);
    fileHint.textContent = `Loaded ${result.name}`;
  } catch (err) {
    fileHint.textContent = `Load failed: ${err.message}`;
  }
};

document.getElementById('btn-reset').onclick = () => {
  if (!confirm('Discard current edits and restore the bundled dataset?')) return;
  model = validateGraphData(structuredClone(defaultData));
  render();
  setTimeout(() => graph.zoomFit(), 800);
  fileHint.textContent = 'Restored default dataset.';
};

document.getElementById('btn-zoom-fit').onclick = () => graph.zoomFit();

// ---------- boot ----------

validateGraphData(model);
render();
setTimeout(() => graph.zoomFit(), 1200);
