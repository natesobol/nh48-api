#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_MERMAID = path.join(ROOT, 'data', 'wiki', 'forest-health-flowchart.mmd');
const OUTPUT_BASE64 = path.join(ROOT, 'data', 'wiki', 'forest-health-flowchart.base64.txt');
const OUTPUT_PNG = path.join(ROOT, 'data', 'wiki', 'forest-health-flowchart.png');

function parseMermaidFlowchart(source) {
  const lines = String(source)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('flowchart'));

  const nodeLabels = new Map();
  const edges = [];

  const parseNodeToken = (token) => {
    const bracketMatch = token.match(/^([A-Za-z0-9_]+)\[(.*)\]$/);
    if (bracketMatch) {
      return { id: bracketMatch[1], label: bracketMatch[2].trim() };
    }
    return { id: token.trim(), label: null };
  };

  for (const line of lines) {
    const edgeMatch = line.match(/^(.+?)\s*-->\s*(.+)$/);
    if (!edgeMatch) continue;
    const left = parseNodeToken(edgeMatch[1].trim());
    const right = parseNodeToken(edgeMatch[2].trim());
    if (!left.id || !right.id) continue;
    if (left.label) nodeLabels.set(left.id, left.label);
    if (right.label) nodeLabels.set(right.id, right.label);
    if (!nodeLabels.has(left.id)) nodeLabels.set(left.id, left.id);
    if (!nodeLabels.has(right.id)) nodeLabels.set(right.id, right.id);
    edges.push({ from: left.id, to: right.id });
  }

  return { nodeLabels, edges };
}

function computeDepths(nodeIds, edges) {
  const incoming = new Map(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map(nodeIds.map((id) => [id, []]));
  edges.forEach(({ from, to }) => {
    incoming.set(to, (incoming.get(to) || 0) + 1);
    outgoing.get(from).push(to);
  });

  const queue = [];
  const depth = new Map();
  nodeIds.forEach((id) => {
    if ((incoming.get(id) || 0) === 0) {
      depth.set(id, 0);
      queue.push(id);
    }
  });

  while (queue.length) {
    const current = queue.shift();
    const currentDepth = depth.get(current) || 0;
    (outgoing.get(current) || []).forEach((next) => {
      const nextDepth = Math.max(depth.get(next) || 0, currentDepth + 1);
      depth.set(next, nextDepth);
      incoming.set(next, (incoming.get(next) || 0) - 1);
      if ((incoming.get(next) || 0) <= 0) queue.push(next);
    });
  }

  nodeIds.forEach((id) => {
    if (!depth.has(id)) depth.set(id, 0);
  });
  return depth;
}

function buildLayout(nodeLabels, edges) {
  const nodeIds = Array.from(nodeLabels.keys());
  const depths = computeDepths(nodeIds, edges);
  const byDepth = new Map();
  nodeIds.forEach((id) => {
    const d = depths.get(id) || 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(id);
  });

  const depthLevels = Array.from(byDepth.keys()).sort((a, b) => a - b);
  const colWidth = 380;
  const rowHeight = 116;
  const nodeWidth = 320;
  const nodeHeight = 72;
  const xPad = 56;
  const yPad = 48;
  const gapPerDepth = 18;

  const positions = new Map();
  depthLevels.forEach((depthLevel, colIndex) => {
    const ids = byDepth.get(depthLevel);
    ids.sort((a, b) => (nodeLabels.get(a) || a).localeCompare(nodeLabels.get(b) || b));
    ids.forEach((id, rowIndex) => {
      const x = xPad + colIndex * (colWidth + gapPerDepth);
      const y = yPad + rowIndex * rowHeight;
      positions.set(id, { x, y, w: nodeWidth, h: nodeHeight });
    });
  });

  let maxRight = 0;
  let maxBottom = 0;
  positions.forEach((node) => {
    maxRight = Math.max(maxRight, node.x + node.w);
    maxBottom = Math.max(maxBottom, node.y + node.h);
  });

  return {
    positions,
    width: maxRight + xPad,
    height: maxBottom + yPad
  };
}

function wrapText(label, maxChars = 38) {
  const words = String(label).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createSvg(nodeLabels, edges) {
  const { positions, width, height } = buildLayout(nodeLabels, edges);

  const edgePaths = edges
    .map(({ from, to }) => {
      const a = positions.get(from);
      const b = positions.get(to);
      if (!a || !b) return '';
      const startX = a.x + a.w;
      const startY = a.y + a.h / 2;
      const endX = b.x;
      const endY = b.y + b.h / 2;
      const bend = Math.max(24, (endX - startX) * 0.35);
      return `<path d="M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}" />`;
    })
    .join('\n');

  const nodeBlocks = Array.from(positions.entries())
    .map(([id, box]) => {
      const label = nodeLabels.get(id) || id;
      const lines = wrapText(label);
      const textYStart = box.y + box.h / 2 - ((lines.length - 1) * 12);
      const tspans = lines
        .map((line, i) => `<tspan x="${box.x + box.w / 2}" y="${textYStart + i * 24}">${esc(line)}</tspan>`)
        .join('');
      return `
        <g class="node">
          <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="13" ry="13"></rect>
          <text text-anchor="middle">${tspans}</text>
        </g>
      `;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#0b1327"/>
      <stop offset="100%" stop-color="#071022"/>
    </linearGradient>
    <linearGradient id="nodeFill" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#102241"/>
      <stop offset="100%" stop-color="#0b1832"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#22c55e" flood-opacity="0.35" />
    </filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 Z" fill="#22c55e"/>
    </marker>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"></rect>
  <g class="edges" fill="none" stroke="#22c55e" stroke-width="3.2" marker-end="url(#arrow)" filter="url(#glow)">
    ${edgePaths}
  </g>
  <g class="nodes">
    ${nodeBlocks}
  </g>
  <style>
    text {
      fill: #eef4ff;
      font-family: "Noto Sans", "Segoe UI", Arial, sans-serif;
      font-size: 17px;
      font-weight: 700;
      dominant-baseline: middle;
      letter-spacing: 0.01em;
    }
    .node rect {
      fill: url(#nodeFill);
      stroke: #6fb4ff;
      stroke-width: 1.6;
    }
  </style>
</svg>`;
}

async function renderSvgToPng(svg, outputPath) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (_) {
    ({ chromium } = require('@playwright/test'));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 2048, height: 1400 } });
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0;background:#05070f;display:flex;justify-content:center;align-items:center;min-height:100vh;">
        <img id="chart" src="${svgDataUrl}" style="max-width:95vw;height:auto;display:block;" />
      </body>
    </html>
  `);
  const chart = await page.$('#chart');
  if (!chart) {
    await browser.close();
    throw new Error('Failed to render flowchart image in browser.');
  }
  await chart.screenshot({ path: outputPath });
  await browser.close();
}

async function main() {
  if (!fs.existsSync(INPUT_MERMAID)) {
    throw new Error(`Missing Mermaid input: ${INPUT_MERMAID}`);
  }
  const mermaid = fs.readFileSync(INPUT_MERMAID, 'utf8');
  const { nodeLabels, edges } = parseMermaidFlowchart(mermaid);
  if (!edges.length || !nodeLabels.size) {
    throw new Error('No valid nodes/edges found in Mermaid source.');
  }

  const svg = createSvg(nodeLabels, edges);
  await renderSvgToPng(svg, OUTPUT_PNG);
  const base64 = fs.readFileSync(OUTPUT_PNG).toString('base64');
  fs.writeFileSync(OUTPUT_BASE64, `${base64}\n`, 'utf8');

  console.log(`Generated flowchart PNG: ${path.relative(ROOT, OUTPUT_PNG)}`);
  console.log(`Generated base64 output: ${path.relative(ROOT, OUTPUT_BASE64)}`);
  console.log(`Nodes: ${nodeLabels.size}, Edges: ${edges.length}`);
}

main().catch((error) => {
  console.error(`Failed to build forest health flowchart: ${error.message}`);
  process.exit(1);
});
