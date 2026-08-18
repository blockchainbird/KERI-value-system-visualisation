import * as d3 from 'd3';

const nodeRadius = (d) => 5 + d.weight * 1.8;
const linkWidth = (d) => 0.8 + d.weight * 1.1;
const linkDistance = (d) => 260 - d.weight * 25;
const arrowSize = (d) => 8 + (d.weight ?? 1) * 1.2;

/**
 * Creates the force-directed graph inside the given <svg> element.
 * Returns an API to re-render when data changes and to control selection/zoom.
 */
export function createGraph(svgEl, { onNodeClick, onLinkClick, getClipCount, getLevel } = {}) {
  const svg = d3.select(svgEl);
  const container = svgEl.parentElement;
  const tooltip = container.querySelector('#tooltip');

  const zoomLayer = svg.append('g');
  const linkLayer = zoomLayer.append('g');
  const nodeLayer = zoomLayer.append('g');

  const zoom = d3.zoom()
    .scaleExtent([0.15, 4])
    .on('zoom', (event) => zoomLayer.attr('transform', event.transform));
  svg.call(zoom).on('dblclick.zoom', null);

  const linkedIds = new Set();
  const isIsolated = (d) => !linkedIds.has(d.id);

  const BASE_CONNECTED_GRAVITY = 0.012;
  const BASE_ISOLATED_GRAVITY = 0.28;
  let gravityScale = 1;

  function gravityStrength(d) {
    if (isIsolated(d)) return Math.max(0.012, BASE_ISOLATED_GRAVITY * gravityScale);
    return BASE_CONNECTED_GRAVITY * gravityScale;
  }

  function chargeStrength(d) {
    const weakBoost = 1 + Math.max(0, 1 - gravityScale) * 0.9;
    return isIsolated(d) ? -12 : -620 * weakBoost;
  }

  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id((d) => d.id)
      .distance(linkDistance)
      .strength((d) => 0.25 + d.weight * 0.2))
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 10))
    .force('x', d3.forceX().strength(gravityStrength))
    .force('y', d3.forceY().strength(gravityStrength));

  let data = { nodes: [], links: [], groups: {} };
  let selectedId = null;
  let searchIds = null; // Set of node ids matching the current search, or null
  let nodeSel = d3.select(null);
  let linkSel = d3.select(null);

  function size() {
    const { width, height } = container.getBoundingClientRect();
    return { width, height };
  }

  function center() {
    const { width, height } = size();
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
  }
  center();
  window.addEventListener('resize', () => {
    center();
    simulation.alpha(0.3).restart();
  });

  const groupColor = (g) => data.groups[g]?.color ?? '#999';

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function linkEnds(d) {
    return {
      source: typeof d.source === 'object' ? d.source.id : d.source,
      target: typeof d.target === 'object' ? d.target.id : d.target,
    };
  }

  // Visible line stops at the node circles so the arrow sits on the rim, not under it.
  function visibleLinkEnds(d) {
    const x1 = d.source.x ?? 0;
    const y1 = d.source.y ?? 0;
    const x2 = d.target.x ?? 0;
    const y2 = d.target.y ?? 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const start = nodeRadius(d.source);
    const end = nodeRadius(d.target) + arrowSize(d) * 0.35;
    return {
      x1: x1 + (dx / dist) * start,
      y1: y1 + (dy / dist) * start,
      x2: x2 - (dx / dist) * end,
      y2: y2 - (dy / dist) * end,
    };
  }

  function arrowPath(d) {
    const { x1, y1, x2, y2 } = visibleLinkEnds(d);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const size = arrowSize(d);
    const baseX = x2 - ux * size;
    const baseY = y2 - uy * size;
    const px = -uy;
    const py = ux;
    const half = size * 0.42;
    return `M${x2},${y2} L${baseX + px * half},${baseY + py * half} L${baseX - px * half},${baseY - py * half} Z`;
  }

  function neighborIds(id) {
    const ids = new Set([id]);
    for (const l of data.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === id) ids.add(t);
      if (t === id) ids.add(s);
    }
    return ids;
  }

  function compactCopy(text) {
    return String(text ?? '').replace(/\n{2,}/g, '\n');
  }

  function nodeCopy(d) {
    const text = getLevel?.() === 'beginner'
      ? ((d.kiss || '').trim() || d.description || '')
      : (d.description || '');
    return compactCopy(text);
  }

  function linkCopy(d) {
    const text = getLevel?.() === 'beginner'
      ? ((d.kiss || '').trim() || d.context || '')
      : (d.context || '');
    return compactCopy(text);
  }

  function showNodeTooltip(event, d) {
    const rect = container.getBoundingClientRect();
    const clipCount = getClipCount?.(d.id) ?? 0;
    tooltip.innerHTML = `
      <div class="tt-title">${esc(d.label)}</div>
      <div class="tt-meta">${esc(data.groups[d.group]?.label ?? d.group)}
        · weight ${esc(d.weight)}${d.tag ? ` · {${esc(d.tag)}}` : ''}${clipCount ? ` · 🎬 ${clipCount} clips` : ''}</div>
      <div class="tt-body">${esc(nodeCopy(d))}</div>`;
    placeTooltip(event, rect);
  }

  function showLinkTooltip(event, d) {
    const rect = container.getBoundingClientRect();
    const { source, target } = linkEnds(d);
    const personas = d.personas ? `<div class="tt-meta">Personas · ${esc(d.personas)}</div>` : '';
    tooltip.innerHTML = `
      <div class="tt-title">${esc(source)} → ${esc(target)}</div>
      <div class="tt-meta">Vertex${d.weight ? ` · weight ${esc(d.weight)}` : ''}</div>
      ${personas}
      <div class="tt-body">${esc(linkCopy(d))}</div>`;
    placeTooltip(event, rect);
  }

  function placeTooltip(event, rect) {
    tooltip.classList.remove('hidden');
    const x = Math.min(event.clientX - rect.left + 14, rect.width - 340);
    const y = Math.min(event.clientY - rect.top + 14, rect.height - 140);
    tooltip.style.left = `${Math.max(x, 8)}px`;
    tooltip.style.top = `${Math.max(y, 8)}px`;
  }

  function hideTooltip() {
    tooltip.classList.add('hidden');
  }

  // Dim state when nothing is hovered: either no dimming, or dim non-search-matches.
  function applyBaseDim() {
    if (!searchIds) {
      nodeSel.classed('dimmed', false);
      linkSel.classed('dimmed', false).classed('highlight', false);
      return;
    }
    nodeSel.classed('dimmed', (d) => !searchIds.has(d.id));
    linkSel
      .classed('highlight', false)
      .classed('dimmed', (d) => {
        const { source, target } = linkEnds(d);
        return !searchIds.has(source) || !searchIds.has(target);
      });
  }

  function applyHighlight(hoverId) {
    if (hoverId == null) {
      applyBaseDim();
      return;
    }
    const ids = neighborIds(hoverId);
    nodeSel.classed('dimmed', (d) => !ids.has(d.id));
    linkSel
      .classed('highlight', (d) => {
        const { source, target } = linkEnds(d);
        return source === hoverId || target === hoverId;
      })
      .classed('dimmed', (d) => {
        const { source, target } = linkEnds(d);
        return source !== hoverId && target !== hoverId;
      });
  }

  function setSearchHighlight(ids) {
    searchIds = ids;
    applyBaseDim();
  }

  const drag = d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });

  function update(newData) {
    // Preserve positions of nodes that already exist so edits don't reshuffle the layout.
    const prev = new Map(data.nodes.map((d) => [d.id, d]));
    data = newData;
    for (const n of data.nodes) {
      const old = prev.get(n.id);
      if (old) {
        n.x = old.x;
        n.y = old.y;
        n.vx = old.vx;
        n.vy = old.vy;
      }
    }

    linkSel = linkLayer.selectAll('g.link')
      .data(data.links, (d) => {
        const { source, target } = linkEnds(d);
        return `${source}→${target}`;
      })
      .join((enter) => {
        const g = enter.append('g').attr('class', 'link');
        g.append('line').attr('class', 'link-hit');
        g.append('line').attr('class', 'link-line');
        g.append('path').attr('class', 'link-arrow');
        return g;
      });

    linkSel.select('.link-line').attr('stroke-width', linkWidth);

    linkSel
      .on('click', (event, d) => {
        event.stopPropagation();
        const { source, target } = linkEnds(d);
        onLinkClick?.(source, target);
      })
      .on('mouseenter', (event, d) => {
        const { source, target } = linkEnds(d);
        nodeSel.classed('dimmed', (n) => n.id !== source && n.id !== target);
        linkSel
          .classed('highlight', (l) => l === d)
          .classed('dimmed', (l) => l !== d);
        showLinkTooltip(event, d);
      })
      .on('mousemove', (event, d) => showLinkTooltip(event, d))
      .on('mouseleave', () => {
        applyHighlight(null);
        hideTooltip();
      });

    nodeSel = nodeLayer.selectAll('g.node')
      .data(data.nodes, (d) => d.id)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'node');
        g.append('circle');
        g.append('text').attr('text-anchor', 'middle');
        return g;
      });

    nodeSel.select('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d) => groupColor(d.group));

    nodeSel.select('text')
      .attr('dy', (d) => nodeRadius(d) + 12)
      .text((d) => d.label);

    nodeSel
      .call(drag)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d.id);
      })
      .on('mouseenter', (event, d) => {
        applyHighlight(d.id);
        showNodeTooltip(event, d);
      })
      .on('mousemove', (event, d) => showNodeTooltip(event, d))
      .on('mouseleave', () => {
        applyHighlight(null);
        hideTooltip();
      });

    setSelected(selectedId);

    linkedIds.clear();
    for (const l of data.links) {
      const { source, target } = linkEnds(l);
      linkedIds.add(source);
      linkedIds.add(target);
    }

    simulation.nodes(data.nodes).on('tick', ticked);
    simulation.force('link').links(data.links);
    simulation.alpha(0.5).restart();

    applyBaseDim();
  }

  function ticked() {
    linkSel.each(function (d) {
      const g = d3.select(this);
      g.select('.link-hit')
        .attr('x1', d.source.x)
        .attr('y1', d.source.y)
        .attr('x2', d.target.x)
        .attr('y2', d.target.y);
      const p = visibleLinkEnds(d);
      g.select('.link-line')
        .attr('x1', p.x1)
        .attr('y1', p.y1)
        .attr('x2', p.x2)
        .attr('y2', p.y2);
      g.select('.link-arrow').attr('d', arrowPath(d));
    });
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
  }

  function setSelected(id) {
    selectedId = id;
    nodeSel.classed('selected', (d) => d.id === selectedId);
  }

  function zoomFit() {
    if (!data.nodes.length) return;
    const xs = data.nodes.map((d) => d.x ?? 0);
    const ys = data.nodes.map((d) => d.y ?? 0);
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
    const { width, height } = size();
    const scale = Math.min(
      2,
      0.85 / Math.max((maxX - minX) / width, (maxY - minY) / height, 0.001)
    );
    const tx = width / 2 - scale * (minX + maxX) / 2;
    const ty = height / 2 - scale * (minY + maxY) / 2;
    svg.transition().duration(500)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function setGravityScale(scale) {
    gravityScale = Math.max(0, Number(scale) || 0);
    simulation.force('x').strength(gravityStrength);
    simulation.force('y').strength(gravityStrength);
    simulation.force('charge').strength(chargeStrength);
    simulation.alpha(0.55).restart();
  }

  return { update, setSelected, setSearchHighlight, zoomFit, setGravityScale };
}
