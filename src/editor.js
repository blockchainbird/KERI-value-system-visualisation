/**
 * Edit panel: CRUD for nodes and links.
 * Operates on the shared model (nodes with plain data, links with string
 * source/target ids) and calls onChange() after every mutation so the
 * graph re-renders.
 */
export function createEditor({ getModel, onChange, onSelectNode, onSearch, clips, getLevel } = {}) {
  const el = (id) => document.getElementById(id);

  const searchInput = el('search-input');
  const searchResults = el('search-results');
  const nodeSelect = el('node-select');
  const nodeForm = el('node-form');
  const nodeId = el('node-id');
  const nodeLabel = el('node-label');
  const nodeGroup = el('node-group');
  const nodeWeight = el('node-weight');
  const nodeWeightValue = el('node-weight-value');
  const nodeTag = el('node-tag');
  const nodeDescription = el('node-description');
  const nodeKiss = el('node-kiss');
  const linkSource = el('link-source');
  const linkTarget = el('link-target');
  const linkWeight = el('link-weight');
  const linkContext = el('link-context');
  const linkKiss = el('link-kiss');
  const linkPersonas = el('link-personas');
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
    nodeKiss.value = node.kiss ?? '';
  }

  function renderLinkList() {
    const links = selectedNodeId
      ? model().links.filter((l) => l.source === selectedNodeId || l.target === selectedNodeId)
      : model().links;

    linkList.innerHTML = '';
    for (const link of links) {
      const idx = model().links.indexOf(link);
      const li = document.createElement('li');
      li.dataset.source = link.source;
      li.dataset.target = link.target;

      const row = document.createElement('div');
      row.className = 'link-row';

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

      row.append(desc, weightSel, del);
      li.appendChild(row);

      const preview = getLevel?.() === 'beginner'
        ? ((link.kiss || '').trim() || link.context)
        : link.context;
      if (preview) {
        const ctx = document.createElement('div');
        ctx.className = 'link-context';
        ctx.textContent = preview;
        ctx.title = preview;
        li.appendChild(ctx);
      }
      if (link.personas) {
        const personas = document.createElement('div');
        personas.className = 'link-personas';
        personas.textContent = link.personas;
        personas.title = `Personas: ${link.personas}`;
        li.appendChild(personas);
      }

      li.onclick = (event) => {
        if (event.target.closest('button, select')) return;
        linkSource.value = link.source;
        linkTarget.value = link.target;
        linkWeight.value = String(link.weight);
        linkContext.value = link.context ?? '';
        linkKiss.value = link.kiss ?? '';
        linkPersonas.value = link.personas ?? '';
      };

      linkList.appendChild(li);
    }
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mmss = `${m}:${String(s).padStart(2, '0')}`;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : mmss;
  }

  function renderClips() {
    const clipList = el('clip-list');
    const clipsHint = el('clips-hint');
    const clipCount = el('clip-count');
    clipList.innerHTML = '';

    if (!clips || !clips.clips.length) {
      clipCount.textContent = '';
      clipsHint.textContent = 'No clips dataset loaded.';
      return;
    }
    if (!selectedNodeId) {
      clipCount.textContent = `(${clips.clips.length})`;
      clipsHint.textContent = 'Select a node to see video clips tagged with it.';
      return;
    }

    const nodeClips = clips.clips.filter((c) => c.tags.includes(selectedNodeId));
    clipCount.textContent = `(${nodeClips.length})`;
    clipsHint.textContent = nodeClips.length ? '' : 'No clips tagged with this node yet.';

    for (const clip of nodeClips) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `${clips.meta.galleryUrl}#${clip.videoId}&t=${clip.start}&e=${clip.end}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.title = `${clip.quote}\n\nOpens the video gallery at ${formatTime(clip.start)} (from issue #${clip.issue})`;

      const quote = document.createElement('span');
      quote.className = 'clip-quote';
      quote.textContent = clip.quote || clip.talk;

      const meta = document.createElement('span');
      meta.className = 'clip-meta';
      const time = document.createElement('span');
      time.className = 'clip-time';
      time.textContent = `▶ ${formatTime(clip.start)}–${formatTime(clip.end)}`;
      meta.append(time, document.createTextNode(` · ${clip.speaker} — ${clip.talk}`));

      a.append(quote, meta);
      li.appendChild(a);
      clipList.appendChild(li);
    }
  }

  function renderCounts() {
    el('node-count').textContent = `(${model().nodes.length})`;
    el('link-count').textContent = selectedNodeId
      ? `(${model().links.filter((l) => l.source === selectedNodeId || l.target === selectedNodeId).length} of ${model().links.length})`
      : `(${model().links.length})`;
  }

  // ---------- search ----------

  function searchMatches() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return null;
    return model().nodes.filter((n) =>
      n.id.toLowerCase().includes(q)
      || n.label.toLowerCase().includes(q)
      || (n.tag ?? '').toLowerCase().includes(q)
      || (n.description ?? '').toLowerCase().includes(q)
      || (n.kiss ?? '').toLowerCase().includes(q));
  }

  function renderSearch() {
    const matches = searchMatches();
    searchResults.innerHTML = '';
    searchResults.classList.toggle('hidden', matches === null);
    onSearch?.(matches === null ? null : new Set(matches.map((n) => n.id)));
    if (matches === null) return;

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'no-matches';
      li.textContent = 'No matches';
      searchResults.appendChild(li);
      return;
    }
    for (const n of matches) {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'result-group';
      swatch.style.background = model().groups[n.group]?.color ?? '#999';
      const label = document.createElement('span');
      label.textContent = n.label;
      li.append(swatch, label);
      li.title = (getLevel?.() === 'beginner' ? (n.kiss || n.description) : n.description) ?? '';
      li.onclick = () => selectNode(n.id);
      searchResults.appendChild(li);
    }
  }

  searchInput.oninput = renderSearch;
  searchInput.onkeydown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      searchInput.value = '';
      renderSearch();
    }
  };

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
    renderClips();
    renderSearch();
  }

  // ---------- node selection ----------

  function selectNode(id) {
    selectedNodeId = id;
    render();
    onSelectNode?.(id);
  }

  function selectLink(source, target) {
    selectedNodeId = source;
    render();
    onSelectNode?.(source);
    const item = [...linkList.children].find(
      (li) => li.dataset.source === source && li.dataset.target === target
    );
    if (!item) return;
    item.classList.add('selected');
    item.scrollIntoView({ block: 'nearest' });
    const link = model().links.find((l) => l.source === source && l.target === target);
    if (!link) return;
    linkSource.value = link.source;
    linkTarget.value = link.target;
    linkWeight.value = String(link.weight);
    linkContext.value = link.context ?? '';
    linkKiss.value = link.kiss ?? '';
    linkPersonas.value = link.personas ?? '';
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
  nodeKiss.oninput = () => updateSelected((n) => { n.kiss = nodeKiss.value; });
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
      kiss: '',
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
    const existing = model().links.find((l) => l.source === source && l.target === target);
    if (existing) {
      existing.weight = Number(linkWeight.value);
      existing.context = linkContext.value.trim();
      existing.kiss = linkKiss.value.trim();
      existing.personas = linkPersonas.value.trim();
      onChange();
      return;
    }
    model().links.push({
      source,
      target,
      weight: Number(linkWeight.value),
      context: linkContext.value.trim(),
      kiss: linkKiss.value.trim(),
      personas: linkPersonas.value.trim(),
    });
    onChange();
  };

  return { render, selectNode, selectLink, getSelectedNodeId: () => selectedNodeId };
}
