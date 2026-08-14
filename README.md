# KERI Value System Visualisation

An interactive, weighted force-directed graph (D3.js) of the KERI value system, extracted from
[keri-foundation/CONF26-subtitles#21](https://github.com/keri-foundation/CONF26-subtitles/issues/21).

The dataset is work in progress — the graph is built to be easy to extend as new terms and
sub-issues are added.

## Quick start

```bash
npm install
npm run dev      # opens a dev server, usually http://localhost:5173
npm run build    # production build in dist/
```

## What you see

- **Nodes** are terms from the issue: human values (Trustworthiness, Sovereignty, …),
  engineering principles (Security First, Fault Tolerance, …), and the mnemonic value points
  (SECUFIRST, SAFETY, RECOUPEERS, …), colour-coded by group (see legend).
- **Node size** reflects the node's weight (importance, 1–10).
- **Link thickness** reflects the link's weight (strength of relation, 1–3). Links were derived
  from the `~` cross-references in the issue text, plus a curated mapping of engineering
  principles to human values and value points.
- Hover a node to see its description and highlight its neighbours. Drag nodes, pan and zoom
  freely, and use **Fit** to re-centre.

## Editing the graph

Use the edit panel on the left:

- **Nodes** — select a node (dropdown or click in the graph) to edit its id, label, group,
  weight, tag (`conscientious` / `mature`), and description. `+` adds a node, `−` deletes the
  selected node with its links.
- **Links** — the list shows the selected node's links (or all links when nothing is selected).
  Change a link's weight inline or delete it with `×`. Add new links via the source → target
  dropdowns.
- All edits update the graph live.

## Saving and loading (HTML5 file interface)

- **Save…** writes the current graph as JSON using the File System Access API
  (`showSaveFilePicker`); browsers without it (Firefox, Safari) fall back to a regular download.
- **Load…** opens a JSON file from disk (`showOpenFilePicker`, with an `<input type="file">`
  fallback) and validates it before rendering.
- **Reset** restores the bundled default dataset.

## Configuring the dataset

The default dataset lives in `src/data/keri-values.json` and is plain JSON:

```json
{
  "meta":   { "title": "...", "source": "...", "notes": "..." },
  "groups": { "human-value": { "label": "Human values", "color": "#f2c14e" }, ... },
  "nodes":  [ { "id": "SECUFIRST", "label": "SECUFIRST", "group": "unique-value",
                "weight": 5, "tag": "conscientious", "description": "..." }, ... ],
  "links":  [ { "source": "SAFETY", "target": "SECUFIRST", "weight": 1 }, ... ]
}
```

To add new terms (e.g. from the "SEGMENTS…" sub-issues), either edit this file directly, or use
the edit panel and save the result — a saved file can be re-loaded later or committed back as
the new `src/data/keri-values.json`. New groups can be added in `groups` (id, label, colour) and
used immediately by nodes.

## Project layout

| File | Purpose |
| --- | --- |
| `src/data/keri-values.json` | The dataset (nodes, links, groups, metadata) |
| `src/graph.js` | D3 force simulation and rendering |
| `src/editor.js` | Edit panel (node/link CRUD) |
| `src/fileio.js` | HTML5 file save/load with validation |
| `src/main.js` | Wiring, legend, file buttons |
