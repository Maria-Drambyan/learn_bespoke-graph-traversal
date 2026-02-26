import { ALGORITHMS, solveByAlgorithm } from './algorithms.js';

const DIFFICULTY = {
  easy: {
    templates: ['cleanLane', 'cityGrid'],
    optionalCount: 0,
    trafficCount: 1,
    laneJitter: 6,
    maxDiagonals: 0,
    maxDiagonalPerNode: 0,
    maxNodeDegree: 4,
    mainMin: 1,
    mainMax: 3,
    altMin: 4,
    altMax: 6
  },
  medium: {
    templates: ['cleanLane', 'cityGrid', 'zigzagSpine'],
    optionalCount: 1,
    trafficCount: 2,
    laneJitter: 10,
    maxDiagonals: 1,
    maxDiagonalPerNode: 1,
    maxNodeDegree: 4,
    mainMin: 1,
    mainMax: 4,
    altMin: 5,
    altMax: 8
  },
  hard: {
    templates: ['cleanLane', 'cityGrid', 'zigzagSpine'],
    optionalCount: 2,
    trafficCount: 3,
    laneJitter: 14,
    maxDiagonals: 2,
    maxDiagonalPerNode: 1,
    maxNodeDegree: 4,
    mainMin: 2,
    mainMax: 5,
    altMin: 6,
    altMax: 10
  }
};

const TEMPLATES = {
  cleanLane: {
    name: 'cleanLane',
    nodes: [
      { id: 'A', x: 90, y: 400 },
      { id: 'B', x: 270, y: 400 },
      { id: 'C', x: 450, y: 400 },
      { id: 'D', x: 630, y: 400 },
      { id: 'E', x: 810, y: 400 },
      { id: 'F', x: 1020, y: 400 },
      { id: 'G', x: 270, y: 170 },
      { id: 'H', x: 450, y: 170 },
      { id: 'I', x: 630, y: 170 },
      { id: 'J', x: 450, y: 630 },
      { id: 'K', x: 630, y: 630 }
    ],
    edges: [
      ['A', 'B'], ['B', 'C'], ['D', 'E'], ['E', 'F'],
      ['B', 'G'], ['G', 'H'], ['H', 'C'],
      ['H', 'I'], ['I', 'D'],
      ['C', 'J'], ['J', 'K'], ['K', 'D']
    ],
    optional: [
      ['G', 'I'],
      ['B', 'J']
    ],
    startId: 'A',
    goalId: 'F',
    houses: [
      { x: 90, y: 95, w: 220, h: 105 },
      { x: 835, y: 95, w: 230, h: 105 },
      { x: 840, y: 595, w: 220, h: 115 }
    ],
    trees: [
      { x: 355, y: 95 },
      { x: 690, y: 95 },
      { x: 185, y: 650 },
      { x: 680, y: 650 }
    ]
  },
  cityGrid: {
    name: 'cityGrid',
    nodes: [
      { id: 'A', x: 90, y: 400 },
      { id: 'B', x: 300, y: 400 },
      { id: 'C', x: 510, y: 400 },
      { id: 'D', x: 720, y: 400 },
      { id: 'E', x: 930, y: 400 },
      { id: 'F', x: 1090, y: 400 },
      { id: 'G', x: 300, y: 170 },
      { id: 'H', x: 510, y: 170 },
      { id: 'I', x: 720, y: 170 },
      { id: 'J', x: 300, y: 630 },
      { id: 'K', x: 510, y: 630 },
      { id: 'L', x: 720, y: 630 }
    ],
    edges: [
      ['A', 'B'], ['B', 'C'], ['D', 'E'], ['E', 'F'],
      ['B', 'G'], ['G', 'H'], ['H', 'I'], ['I', 'D'],
      ['B', 'J'], ['J', 'K'], ['K', 'L'], ['L', 'D'],
      ['C', 'H'], ['C', 'K']
    ],
    optional: [
      ['H', 'D'],
      ['K', 'D']
    ],
    startId: 'A',
    goalId: 'F',
    houses: [
      { x: 70, y: 90, w: 230, h: 105 },
      { x: 920, y: 90, w: 210, h: 105 },
      { x: 920, y: 600, w: 210, h: 110 }
    ],
    trees: [
      { x: 360, y: 90 },
      { x: 760, y: 90 },
      { x: 560, y: 655 },
      { x: 150, y: 655 }
    ]
  },
  zigzagSpine: {
    name: 'zigzagSpine',
    nodes: [
      { id: 'A', x: 90, y: 420 },
      { id: 'B', x: 290, y: 420 },
      { id: 'C', x: 490, y: 420 },
      { id: 'D', x: 690, y: 420 },
      { id: 'E', x: 890, y: 420 },
      { id: 'F', x: 1080, y: 420 },
      { id: 'G', x: 290, y: 200 },
      { id: 'H', x: 490, y: 200 },
      { id: 'I', x: 690, y: 200 },
      { id: 'J', x: 490, y: 620 },
      { id: 'K', x: 690, y: 620 },
      { id: 'L', x: 890, y: 620 }
    ],
    edges: [
      ['A', 'B'], ['B', 'C'], ['D', 'E'], ['E', 'F'],
      ['B', 'G'], ['G', 'H'], ['H', 'C'],
      ['H', 'I'], ['I', 'D'],
      ['C', 'J'], ['J', 'K'], ['K', 'D'],
      ['D', 'L'], ['L', 'E']
    ],
    optional: [
      ['G', 'I'],
      ['B', 'J'],
      ['I', 'L']
    ],
    startId: 'A',
    goalId: 'F',
    houses: [
      { x: 90, y: 92, w: 220, h: 100 },
      { x: 870, y: 92, w: 220, h: 100 },
      { x: 875, y: 600, w: 215, h: 110 }
    ],
    trees: [
      { x: 360, y: 94 },
      { x: 730, y: 94 },
      { x: 195, y: 650 },
      { x: 620, y: 650 }
    ]
  }
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomDistractor(correctAlgorithm) {
  const options = Object.keys(ALGORITHMS).filter((name) => name !== correctAlgorithm);
  return pickRandom(options);
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildNodeMap(nodes) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function isDiagonalPair([from, to], nodeMap) {
  const a = nodeMap.get(from);
  const b = nodeMap.get(to);
  if (!a || !b) return false;
  return a.x !== b.x && a.y !== b.y;
}

function edgesCross(edgeA, edgeB, nodeMap) {
  const [a1, a2] = edgeA;
  const [b1, b2] = edgeB;
  if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) return false;

  const p1 = nodeMap.get(a1);
  const p2 = nodeMap.get(a2);
  const p3 = nodeMap.get(b1);
  const p4 = nodeMap.get(b2);
  if (!p1 || !p2 || !p3 || !p4) return false;

  const orient = (p, q, r) => ((q.y - p.y) * (r.x - q.x)) - ((q.x - p.x) * (r.y - q.y));
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function edgePairsPassLayoutRules(edgePairs, nodeMap, cfg) {
  let diagonalCount = 0;
  const diagonalPerNode = new Map();
  const degree = new Map([...nodeMap.keys()].map((id) => [id, 0]));

  for (const pair of edgePairs) {
    const [from, to] = pair;
    degree.set(from, (degree.get(from) || 0) + 1);
    degree.set(to, (degree.get(to) || 0) + 1);
    if ((degree.get(from) || 0) > cfg.maxNodeDegree || (degree.get(to) || 0) > cfg.maxNodeDegree) {
      return false;
    }

    if (isDiagonalPair(pair, nodeMap)) {
      diagonalCount += 1;
      diagonalPerNode.set(from, (diagonalPerNode.get(from) || 0) + 1);
      diagonalPerNode.set(to, (diagonalPerNode.get(to) || 0) + 1);
      if (diagonalCount > cfg.maxDiagonals) return false;
      if ((diagonalPerNode.get(from) || 0) > cfg.maxDiagonalPerNode) return false;
      if ((diagonalPerNode.get(to) || 0) > cfg.maxDiagonalPerNode) return false;
    }
  }

  for (let i = 0; i < edgePairs.length; i += 1) {
    for (let j = i + 1; j < edgePairs.length; j += 1) {
      if (edgesCross(edgePairs[i], edgePairs[j], nodeMap)) {
        return false;
      }
    }
  }

  return true;
}

function selectOptionalEdges(template, cfg) {
  const nodeMap = buildNodeMap(template.nodes);
  const selected = [];
  const shuffled = shuffle(template.optional);

  for (const candidate of shuffled) {
    const trial = [...template.edges, ...selected, candidate];
    if (!edgePairsPassLayoutRules(trial, nodeMap, cfg)) {
      continue;
    }
    selected.push(candidate);
    if (selected.length >= cfg.optionalCount) {
      break;
    }
  }

  return selected;
}

function applyLaneJitter(nodes, jitter) {
  const uniqueX = [...new Set(nodes.map((n) => n.x))].sort((a, b) => a - b);
  const uniqueY = [...new Set(nodes.map((n) => n.y))].sort((a, b) => a - b);
  const offsetSteps = [-1, 0, 1];

  const xShift = new Map(uniqueX.map((x) => {
    const step = pickRandom(offsetSteps);
    return [x, step * jitter];
  }));

  const yShift = new Map(uniqueY.map((y) => {
    const step = pickRandom(offsetSteps);
    return [y, step * jitter];
  }));

  return nodes.map((node) => ({
    ...node,
    x: clamp(node.x + (xShift.get(node.x) || 0), 70, 1130),
    y: clamp(node.y + (yShift.get(node.y) || 0), 140, 680)
  }));
}

function buildGraph(template, cfg) {
  const extraEdges = selectOptionalEdges(template, cfg);
  const edgePairs = [...template.edges, ...extraEdges].map((pair) => [...pair]);

  const graph = {
    nodes: applyLaneJitter(template.nodes, cfg.laneJitter),
    edges: edgePairs.map(([from, to], idx) => ({
      from,
      to,
      cost: 1,
      optional: idx >= template.edges.length
    }))
  };

  // Standardized weighting:
  // 1) find canonical backbone (BFS path over current topology)
  // 2) assign lower costs on backbone, higher costs on alternatives.
  const canonical = solveByAlgorithm('bfs', graph, template.startId, template.goalId).path || [];
  const backbone = new Set();
  for (let i = 1; i < canonical.length; i += 1) {
    backbone.add(edgeKey(canonical[i - 1], canonical[i]));
  }

  graph.edges = graph.edges.map((edge) => {
    const key = edgeKey(edge.from, edge.to);
    const isBackbone = backbone.has(key);
    const cost = isBackbone
      ? randomInt(cfg.mainMin, cfg.mainMax)
      : randomInt(cfg.altMin, cfg.altMax);
    return {
      from: edge.from,
      to: edge.to,
      cost
    };
  });

  return graph;
}

function buildAdjacency(graph) {
  const adj = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    if (edge.blocked) continue;
    adj.get(edge.from)?.push(edge.to);
    adj.get(edge.to)?.push(edge.from);
  }
  return adj;
}

function isConnectedGraph(graph, startId) {
  const adj = buildAdjacency(graph);
  const queue = [startId];
  const seen = new Set([startId]);

  while (queue.length) {
    const cur = queue.shift();
    for (const next of adj.get(cur) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return seen.size === graph.nodes.length;
}

function hasOnlyExpectedDeadEnds(graph, startId, goalId) {
  const adj = buildAdjacency(graph);
  for (const node of graph.nodes) {
    const degree = (adj.get(node.id) || []).length;
    if (node.id === goalId && degree !== 1) return false;
    if (node.id === startId && degree < 1) return false;
    if (node.id !== startId && node.id !== goalId && degree < 2) return false;
  }
  return true;
}

function hasReadableGeometry(graph, cfg) {
  const nodeMap = buildNodeMap(graph.nodes);
  const edgePairs = graph.edges.map((edge) => [edge.from, edge.to]);
  return edgePairsPassLayoutRules(edgePairs, nodeMap, cfg);
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function segmentIntersectsRect(ax, ay, bx, by, rect) {
  const minX = rect.x;
  const minY = rect.y;
  const maxX = rect.x + rect.w;
  const maxY = rect.y + rect.h;

  const inside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;
  if (inside(ax, ay) || inside(bx, by)) return true;

  const intersects = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const ccw = (xa, ya, xb, yb, xc, yc) => (yc - ya) * (xb - xa) > (yb - ya) * (xc - xa);
    return (
      ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
      ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
    );
  };

  return (
    intersects(ax, ay, bx, by, minX, minY, maxX, minY) ||
    intersects(ax, ay, bx, by, maxX, minY, maxX, maxY) ||
    intersects(ax, ay, bx, by, maxX, maxY, minX, maxY) ||
    intersects(ax, ay, bx, by, minX, maxY, minX, minY)
  );
}

function hasNoRoadSceneryCollision(graph, houses, trees) {
  const ROAD_HALF_WIDTH = 48;
  const HOUSE_MARGIN = 18;
  const TREE_CLEARANCE = 42 + ROAD_HALF_WIDTH;
  const nodeMap = buildNodeMap(graph.nodes);

  const expandedHouses = houses.map((h) => ({
    x: h.x - HOUSE_MARGIN,
    y: h.y - HOUSE_MARGIN,
    w: h.w + HOUSE_MARGIN * 2,
    h: h.h + HOUSE_MARGIN * 2
  }));

  for (const edge of graph.edges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) continue;

    for (const house of expandedHouses) {
      if (segmentIntersectsRect(from.x, from.y, to.x, to.y, house)) {
        return false;
      }
    }

    for (const tree of trees) {
      const d = distancePointToSegment(tree.x, tree.y, from.x, from.y, to.x, to.y);
      if (d < TREE_CLEARANCE) {
        return false;
      }
    }
  }

  return true;
}

function validResult(result, startId, goalId) {
  return (
    Array.isArray(result.path) &&
    result.path.length > 1 &&
    result.path[0] === startId &&
    result.path[result.path.length - 1] === goalId
  );
}

function pathDifferenceScore(pathA = [], pathB = []) {
  const maxLen = Math.max(pathA.length, pathB.length);
  if (maxLen === 0) return 0;
  let mismatches = Math.abs(pathA.length - pathB.length);
  const common = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < common; i += 1) {
    if (pathA[i] !== pathB[i]) mismatches += 1;
  }
  return mismatches;
}

function chooseBestDistractor(correctAlgorithm, graph, startId, goalId, targetResult) {
  const candidates = Object.keys(ALGORITHMS).filter((name) => name !== correctAlgorithm);
  let best = null;

  for (const algo of candidates) {
    const result = solveByAlgorithm(algo, graph, startId, goalId);
    if (!validResult(result, startId, goalId)) {
      continue;
    }

    const score = pathDifferenceScore(targetResult.path, result.path);
    if (!best || score > best.score) {
      best = { algorithm: algo, result, score };
    }
  }

  if (best) {
    return best;
  }

  const fallbackAlgo = randomDistractor(correctAlgorithm);
  return {
    algorithm: fallbackAlgo,
    result: solveByAlgorithm(fallbackAlgo, graph, startId, goalId),
    score: 0
  };
}

function pickTraffic(graph, startId, goalId, correctPath, distractorPath, count) {
  const correctSet = new Set(correctPath || []);
  const fromDistractor = (distractorPath || []).filter((id) => (
    id !== startId &&
    id !== goalId &&
    !correctSet.has(id) &&
    graph.nodes.some((node) => node.id === id)
  ));

  const fallback = graph.nodes
    .map((n) => n.id)
    .filter((id) => id !== startId && id !== goalId && !correctSet.has(id));

  const unique = [];
  for (const id of [...fromDistractor, ...shuffle(fallback)]) {
    if (!unique.includes(id)) unique.push(id);
    if (unique.length >= count) break;
  }

  return unique;
}

export function generateCityMap({ correctAlgorithm = 'bfs', difficulty = 'medium' } = {}) {
  const validCorrect = ALGORITHMS[correctAlgorithm] ? correctAlgorithm : 'bfs';
  const validDifficulty = DIFFICULTY[difficulty] ? difficulty : 'medium';
  const cfg = DIFFICULTY[validDifficulty];
  const template = TEMPLATES[pickRandom(cfg.templates)];

  let graph = null;
  let distractorAlgorithm = null;
  let targetResult = null;
  let distractorResult = null;
  let distractorScore = 0;

  const houses = template.houses.map((house) => ({ ...house }));
  const trees = template.trees.map((tree) => ({ ...tree }));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    graph = buildGraph(template, cfg);
    if (!isConnectedGraph(graph, template.startId)) continue;
    if (!hasReadableGeometry(graph, cfg)) continue;
    if (!hasOnlyExpectedDeadEnds(graph, template.startId, template.goalId)) continue;
    if (!hasNoRoadSceneryCollision(graph, houses, trees)) continue;

    targetResult = solveByAlgorithm(validCorrect, graph, template.startId, template.goalId);
    if (!validResult(targetResult, template.startId, template.goalId)) continue;

    const distractor = chooseBestDistractor(
      validCorrect,
      graph,
      template.startId,
      template.goalId,
      targetResult
    );
    distractorAlgorithm = distractor.algorithm;
    distractorResult = distractor.result;
    distractorScore = distractor.score;
    if (distractorScore < 1) continue;
    break;
  }

  if (!graph || !targetResult || !validResult(targetResult, template.startId, template.goalId)) {
    graph = {
      nodes: template.nodes.map((node) => ({ ...node })),
      edges: template.edges.map(([from, to]) => ({
        from,
        to,
        cost: randomInt(cfg.mainMin, cfg.altMax)
      }))
    };
    targetResult = solveByAlgorithm(validCorrect, graph, template.startId, template.goalId);
    const distractor = chooseBestDistractor(
      validCorrect,
      graph,
      template.startId,
      template.goalId,
      targetResult
    );
    distractorAlgorithm = distractor.algorithm;
    distractorResult = distractor.result;
    distractorScore = distractor.score;
  }

  const trafficCars = pickTraffic(
    graph,
    template.startId,
    template.goalId,
    targetResult.path,
    distractorResult.path,
    cfg.trafficCount
  );

  return {
    graph,
    startId: template.startId,
    goalId: template.goalId,
    obstacles: [],
    trafficCars,
    houses,
    trees,
    meta: {
      correctAlgorithm: validCorrect,
      distractorAlgorithm,
      difficulty: validDifficulty,
      template: template.name,
      distractorPathScore: distractorScore,
      generated: true
    }
  };
}
