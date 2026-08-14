/**
 * Edit panel: CRUD for nodes and links.
 * Operates on the shared model (nodes with plain data, links with string
 * source/target ids) and calls onChange() after every mutation so the
 * graph re-renders.
 */
export function createEditor({ getModel, onChange, onSelectNode }) {
  const el = (id) => document.getElementById(id);

  const nodeSelect = el('node-select');
  const nodeForm = el('node-form');
  const nodeId = el('node-id');
  const nodeLabel = el('node-label');
  const nodeGroup = el('node-group');
  const nodeWeight = el('node-weight');
  const nodeWeightValue = el('node-weight-value');
  const nodeTag = el('node-tag');
  const nodeDescription = el('node-description');
  const linkSource = el('link-source');
  const linkTarget = el('link-target');
  const linkWeight = el('link-weight');
  const linkList = el('link-list');

  let selectedNodeId = null;

  const model = () => getModel();
  const findNode = (id) => model().nodes.find((n) => n.id === id);

  // ---------- rendering ----------

  function fillNodeOptions(select, value) {
    const nodes = [...model().nodes].sort((a, b) => a.label.localeCompare(b.label));
    select.innerHTML = nodes
      .map((n) => `<option value="${n.id}">${n.label}</option>`)
      .join('');
    if (value != null) select.value = value;
  }

  function fillGroupOptions() {
    nodeGroup.innerHTML = Object.entries(model().groups)
      .map(([id, g]) => `<option value="${id}">${g.label}</option>`)
      .join('');
  }

  function renderNodeForm() {
    const node = findNode(selectedNodeId);
    nodeForm.classList.toggle('hidden', !node);
    if (!node) return;
    nodeId.value = node.id;
    nodeLabel.value = node.label;
    nodeGroup.value = node.group;
    nodeWeight.value = node.weight;
    nodeWeightValue.textContent = node.weight;
    nodeTag.value = node.tag ?? '';
    nodeDescription.value = node.description ?? '';
  }

  function renderLinkList() {
    const links = selectedNodeId
      ? model().links.filter((l) => l.source === selectedNodeId || l.target === selectedNodeId)
      : model().links;

    linkList.innerHTML = '';
    for (const link of links) {
      const idx = model().links.indexOf(link);
      const li = document.createElement('li');

      const desc = document.createElement('span');
      desc.className = 'link-desc';
      desc.textContent = `${findNode(link.source)?.label ?? link.source} → ${findNode(link.target)?.label ?? link.target}`;
      desc.title = desc.textContent;

      const weightSel = document.createElement('select');
      weightSel.className = 'link-weight';
      weightSel.innerHTML = [1, 2, 3]
        .map((w) => `<option value="${w}" ${w === link.weight ? 'selected' : ''}>${w}</option>`)
        .join('');
      weightSel.onchange = () => {
        model().links[idx].weight = Number(weightSel.value);
        onChange();
      };

      const del = document.createElement('button');
      del.textContent = '×';
      del.title = 'Delete link';
      del.className = 'danger';
      del.onclick = () => {
        model().links.splice(idx, 1);
        onChange();
      };

      li.append(desc, weightSel, del);
      linkList.appendChild(li);
    }
  }

  function renderCounts() {
    el('node-count').textContent = `(${model().nodes.length})`;
    el('link-count').textContent = selectedNodeId
      ? `(${model().links.filter((l) => l.source === selectedNodeId || l.target === selectedNodeId).length} of ${model().links.length})`
      : `(${model().links.length})`;
  }

  function render() {
    fillGroupOptions();
    fillNodeOptions(nodeSelect, selectedNodeId);
    fillNodeOptions(linkSource, linkSource.value || undefined);
    fillNodeOptions(linkTarget, linkTarget.value || undefined);
    if (selectedNodeId && !findNode(selectedNodeId)) selectedNodeId = null;
    if (selectedNodeId) nodeSelect.value = selectedNodeId;
    renderNodeForm();
    renderLinkList();
    renderCounts();
  }

  // ---------- node selection ----------

  function selectNode(id) {
    selectedNodeId = id;
    render();
    onSelectNode?.(id);
  }

  nodeSelect.onchange = () => selectNode(nodeSelect.value);

  // ---------- node editing ----------

  function updateSelected(mutate) {
    const node = findNode(selectedNodeId);
    if (!node) return;
    mutate(node);
    onChange();
  }

  nodeLabel.oninput = () => updateSelected((n) => { n.label = nodeLabel.value; });
  nodeGroup.onchange = () => updateSelected((n) => { n.group = nodeGroup.value; });
  nodeTag.onchange = () => updateSelected((n) => { n.tag = nodeTag.value; });
  nodeDescription.oninput = () => updateSelected((n) => { n.description = nodeDescription.value; });
  nodeWeight.oninput = () => {
    nodeWeightValue.textContent = nodeWeight.value;
    updateSelected((n) => { n.weight = Number(nodeWeight.value); });
  };

  nodeId.onchange = () => {
    const newId = nodeId.value.trim();
    const node = findNode(selectedNodeId);
    if (!node || !newId || newId === node.id) return;
    if (findNode(newId)) {
      alert(`A node with id "${newId}" already exists.`);
      nodeId.value = node.id;
      return;
    }
    for (const l of model().links) {
      if (l.source === node.id) l.source = newId;
      if (l.target === node.id) l.target = newId;
    }
    node.id = newId;
    selectedNodeId = newId;
    onChange();
    onSelectNode?.(newId);
  };

  el('btn-add-node').onclick = () => {
    let i = 1;
    while (findNode(`NEW-${i}`)) i += 1;
    const groupIds = Object.keys(model().groups);
    model().nodes.push({
      id: `NEW-${i}`,
      label: `NEW-${i}`,
      group: groupIds[0] ?? '',
      weight: 3,
      tag: '',
      description: '',
    });
    selectedNodeId = `NEW-${i}`;
    onChange();
    onSelectNode?.(selectedNodeId);
  };

  el('btn-del-node').onclick = () => {
    const node = findNode(selectedNodeId);
    if (!node) return;
    if (!confirm(`Delete node "${node.label}" and all its links?`)) return;
    const m = model();
    m.nodes.splice(m.nodes.indexOf(node), 1);
    m.links = m.links.filter((l) => l.source !== node.id && l.target !== node.id);
    selectedNodeId = null;
    onChange();
    onSelectNode?.(null);
  };

  // ---------- link editing ----------

  el('btn-add-link').onclick = () => {
    const source = linkSource.value;
    const target = linkTarget.value;
    if (!source || !target) return;
    if (source === target) {
      alert('Source and target must differ.');
      return;
    }
    const exists = model().links.some(
      (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source)
    );
    if (exists) {
      alert('This link already exists.');
      return;
    }
    model().links.push({ source, target, weight: Number(linkWeight.value) });
    onChange();
  };

  return { render, selectNode, getSelectedNodeId: () => selectedNodeId };
}
