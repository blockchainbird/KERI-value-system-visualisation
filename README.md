# KERI Value System Visualisation

An interactive, weighted force-directed graph (D3.js) of the KERI value system. The data comes
from a published
[Google Sheet (CSV)](https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXBjF4JsmIt3RDMBE50hvT_RDipotMcsELpQxE_GEY9ieCoFf5uz1bOUzKjE6vvs333QBdgDHjKeK/pub?output=csv)
that evolved out of
[keri-foundation/CONF26-subtitles#21](https://github.com/keri-foundation/CONF26-subtitles/issues/21).

The dataset is work in progress — the graph is built to be easy to update as terms are added
to the sheet.

## Quick start

```bash
npm install
npm run dev         # opens a dev server, usually http://localhost:5173
npm run fetch-data  # re-download the sheet CSV and regenerate the dataset
npm run build       # production build in dist/
```

## What you see

- **Nodes** are the tags from the sheet (SECUFIRST, SAFETY, RECOUPEERS, …), colour-coded by
  their Type column: KERISuite unique values, more common values, and common absent values.
- **Node size** reflects the node's weight. The fetch script derives it from the number of
  connections (3–9); it stays editable per node in the UI.
- **Link thickness** reflects the link's weight (1–3). Links come from the sheet's
  "Vertices / referenced tags" column (all weight 1 by default).
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

## Updating from the Google Sheet

`npm run fetch-data` downloads the published CSV and regenerates
`src/data/keri-values.json`. It parses each row's Tag, Description, referenced tags, and Type;
extracts `{conscientious}` / `{mature}` markers into the node's tag field; creates one link per
referenced tag (skipping unknown references with a warning); and derives node weights from
connectivity. New Type values in the sheet automatically become new groups with a fallback
colour. Manual weight tweaks made in the edit panel live in the saved JSON files, so re-running
the script overwrites only the bundled default dataset.

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

To add new terms, the preferred route is adding rows to the Google Sheet and running
`npm run fetch-data`. Alternatively, edit this file directly or use the edit panel and save the
result — a saved file can be re-loaded later or committed back as the new
`src/data/keri-values.json`. New groups can be added in `groups` (id, label, colour) and used
immediately by nodes.

## Project layout

| File | Purpose |
| --- | --- |
| `src/data/keri-values.json` | The dataset (nodes, links, groups, metadata) |
| `scripts/fetch-data.mjs` | Regenerates the dataset from the published sheet CSV |
| `src/graph.js` | D3 force simulation and rendering |
| `src/editor.js` | Edit panel (node/link CRUD) |
| `src/fileio.js` | HTML5 file save/load with validation |
| `src/main.js` | Wiring, legend, file buttons |
