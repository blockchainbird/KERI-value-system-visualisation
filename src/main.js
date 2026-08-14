import { createGraph } from './graph.js';
import { createEditor } from './editor.js';
import { saveGraphFile, loadGraphFile, validateGraphData } from './fileio.js';
import defaultData from './data/keri-values.json';

// The model is the canonical dataset: links keep string source/target ids.
// D3 gets cloned link objects so it can replace ids with node references.
let model = structuredClone(defaultData);

const fileHint = document.getElementById('file-hint');

const graph = createGraph(document.getElementById('graph'), {
  onNodeClick: (id) => editor.selectNode(id),
});

const editor = createEditor({
  getModel: () => model,
  onChange: render,
  onSelectNode: (id) => graph.setSelected(id),
  onSearch: (ids) => graph.setSearchHighlight(ids),
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
    nodes: model.nodes.map(({ id, label, group, weight, tag, description }) =>
      ({ id, label, group, weight, tag, description })),
    links: model.links.map(({ source, target, weight }) => ({ source, target, weight })),
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
