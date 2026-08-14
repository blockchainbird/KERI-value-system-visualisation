import * as d3 from 'd3';

const nodeRadius = (d) => 5 + d.weight * 1.8;
const linkWidth = (d) => 0.8 + d.weight * 1.1;
const linkDistance = (d) => 130 - d.weight * 25;

/**
 * Creates the force-directed graph inside the given <svg> element.
 * Returns an API to re-render when data changes and to control selection/zoom.
 */
export function createGraph(svgEl, { onNodeClick } = {}) {
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

  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id((d) => d.id)
      .distance(linkDistance)
      .strength((d) => 0.3 + d.weight * 0.25))
    .force('charge', d3.forceManyBody().strength(-320))
    .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 6))
    .force('x', d3.forceX().strength(0.04))
    .force('y', d3.forceY().strength(0.04));

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

  function showTooltip(event, d) {
    const rect = container.getBoundingClientRect();
    tooltip.innerHTML = `
      <div class="tt-title">${d.label}</div>
      <div class="tt-meta">${data.groups[d.group]?.label ?? d.group}
        · weight ${d.weight}${d.tag ? ` · {${d.tag}}` : ''}</div>
      <div>${d.description ?? ''}</div>`;
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
      .classed('dimmed', (d) => !searchIds.has(d.source.id) || !searchIds.has(d.target.id));
  }

  function applyHighlight(hoverId) {
    if (hoverId == null) {
      applyBaseDim();
      return;
    }
    const ids = neighborIds(hoverId);
    nodeSel.classed('dimmed', (d) => !ids.has(d.id));
    linkSel
      .classed('highlight', (d) => d.source.id === hoverId || d.target.id === hoverId)
      .classed('dimmed', (d) => d.source.id !== hoverId && d.target.id !== hoverId);
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

    linkSel = linkLayer.selectAll('line')
      .data(data.links, (d) => {
        const s = typeof d.source === 'object' ? d.source.id : d.source;
        const t = typeof d.target === 'object' ? d.target.id : d.target;
        return `${s}→${t}`;
      })
      .join('line')
      .attr('class', 'link')
      .attr('stroke-width', linkWidth);

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
        showTooltip(event, d);
      })
      .on('mousemove', (event, d) => showTooltip(event, d))
      .on('mouseleave', () => {
        applyHighlight(null);
        hideTooltip();
      });

    setSelected(selectedId);

    simulation.nodes(data.nodes).on('tick', ticked);
    simulation.force('link').links(data.links);
    simulation.alpha(0.5).restart();

    applyBaseDim();
  }

  function ticked() {
    linkSel
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
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

  return { update, setSelected, setSearchHighlight, zoomFit };
}
