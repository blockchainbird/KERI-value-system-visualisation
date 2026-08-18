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
  panelHandle.title = open ? 'Close editor' : 'Open editor';
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

const GRAVITY_KEY = 'keri-gravity-scale';
const GRAVITY_POS_KEY = 'keri-gravity-pos';
const GRAVITY_SLIDER_DEFAULT = 20;
const gravitySlider = document.getElementById('gravity-slider');
const gravityControl = document.getElementById('gravity-control');

function sliderToScale(value) {
  const t = Number(value) / GRAVITY_SLIDER_DEFAULT;
  if (t >= 1) return t;
  return t * t;
}

const savedGravity = Number(localStorage.getItem(GRAVITY_KEY));
gravitySlider.value = Number.isFinite(savedGravity) ? String(savedGravity) : String(GRAVITY_SLIDER_DEFAULT);
graph.setGravityScale(sliderToScale(gravitySlider.value));

gravitySlider.oninput = () => {
  localStorage.setItem(GRAVITY_KEY, gravitySlider.value);
  graph.setGravityScale(sliderToScale(gravitySlider.value));
};

function clampGravityPosition(left, top) {
  const parent = gravityControl.offsetParent ?? document.getElementById('graph-container');
  const bounds = parent.getBoundingClientRect();
  const size = gravityControl.getBoundingClientRect();
  const maxLeft = Math.max(8, bounds.width - size.width - 8);
  const maxTop = Math.max(8, bounds.height - size.height - 8);
  return {
    left: Math.min(maxLeft, Math.max(8, left)),
    top: Math.min(maxTop, Math.max(8, top)),
  };
}

function applyGravityPosition(left, top) {
  const pos = clampGravityPosition(left, top);
  gravityControl.style.left = `${pos.left}px`;
  gravityControl.style.top = `${pos.top}px`;
  gravityControl.style.right = 'auto';
  gravityControl.style.bottom = 'auto';
  return pos;
}

try {
  const savedPos = JSON.parse(localStorage.getItem(GRAVITY_POS_KEY) ?? '');
  if (Number.isFinite(savedPos?.left) && Number.isFinite(savedPos?.top)) {
    applyGravityPosition(savedPos.left, savedPos.top);
  }
} catch {
  // keep the default bottom-left placement
}

{
  const handle = gravityControl.querySelector('.gravity-handle');
  let drag = null;
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const rect = gravityControl.getBoundingClientRect();
    const parent = (gravityControl.offsetParent ?? document.getElementById('graph-container')).getBoundingClientRect();
    drag = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      parentLeft: parent.left,
      parentTop: parent.top,
    };
    gravityControl.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const pos = applyGravityPosition(
      event.clientX - drag.parentLeft - drag.dx,
      event.clientY - drag.parentTop - drag.dy,
    );
    localStorage.setItem(GRAVITY_POS_KEY, JSON.stringify(pos));
  });
  const endDrag = (event) => {
    if (!drag) return;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    drag = null;
    gravityControl.classList.remove('is-dragging');
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
}

window.addEventListener('resize', () => {
  const left = Number.parseFloat(gravityControl.style.left);
  const top = Number.parseFloat(gravityControl.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const pos = applyGravityPosition(left, top);
  localStorage.setItem(GRAVITY_POS_KEY, JSON.stringify(pos));
});

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
