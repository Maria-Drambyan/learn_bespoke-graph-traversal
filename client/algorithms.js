function buildAdjacency(graph) {
  const nodeIds = graph.nodes.map((n) => n.id);
  const indexById = new Map(nodeIds.map((id, idx) => [id, idx]));
  const adj = new Array(nodeIds.length).fill(null).map(() => []);

  for (const edge of graph.edges) {
    if (edge.blocked) continue;
    const from = indexById.get(edge.from);
    const to = indexById.get(edge.to);
    if (from == null || to == null) continue;
    const cost = edge.cost ?? 1;
    adj[from].push({ to, cost });
    adj[to].push({ to: from, cost });
  }

  return { nodeIds, indexById, adj };
}

function rebuildPath(parent, startIndex, goalIndex) {
  if (goalIndex == null || startIndex == null) return [];
  if (startIndex === goalIndex) return [startIndex];
  if (parent[goalIndex] === -1) return [];

  const path = [];
  let cursor = goalIndex;
  while (cursor !== -1) {
    path.unshift(cursor);
    cursor = parent[cursor];
  }
  return path;
}

export function runBFS(graph, startId, goalId) {
  const { nodeIds, indexById, adj } = buildAdjacency(graph);
  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const visited = new Array(nodeIds.length).fill(false);
  const parent = new Array(nodeIds.length).fill(-1);
  const queue = [startIndex];
  const visitedNodes = [];
  visited[startIndex] = true;

  while (queue.length) {
    const current = queue.shift();
    visitedNodes.push(nodeIds[current]);
    if (current === goalIndex) break;

    for (const next of adj[current]) {
      if (!visited[next.to]) {
        visited[next.to] = true;
        parent[next.to] = current;
        queue.push(next.to);
      }
    }
  }

  const idxPath = visited[goalIndex] ? rebuildPath(parent, startIndex, goalIndex) : [];
  return {
    path: idxPath.length ? idxPath.map((idx) => nodeIds[idx]) : [startId],
    visitedNodes,
    stepsCount: visitedNodes.length
  };
}

export function runDFS(graph, startId, goalId) {
  const { nodeIds, indexById, adj } = buildAdjacency(graph);
  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const stack = [[startIndex]];
  const seen = new Set();
  const visitedNodes = [];

  while (stack.length > 0) {
    const path = stack.pop();
    const node = path[path.length - 1];
    if (seen.has(node)) continue;

    seen.add(node);
    visitedNodes.push(nodeIds[node]);

    if (node === goalIndex) {
      return {
        path: path.map((idx) => nodeIds[idx]),
        visitedNodes,
        stepsCount: visitedNodes.length
      };
    }

    for (const next of adj[node]) {
      if (!seen.has(next.to)) {
        stack.push([...path, next.to]);
      }
    }
  }

  return { path: [startId], visitedNodes, stepsCount: visitedNodes.length };
}

export function runDijkstra(graph, startId, goalId) {
  const { nodeIds, indexById, adj } = buildAdjacency(graph);
  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const dist = new Array(nodeIds.length).fill(Infinity);
  const parent = new Array(nodeIds.length).fill(-1);
  const closed = new Array(nodeIds.length).fill(false);
  const visitedNodes = [];

  dist[startIndex] = 0;

  while (true) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < nodeIds.length; i += 1) {
      if (!closed[i] && dist[i] < best) {
        best = dist[i];
        current = i;
      }
    }

    if (current === -1 || best === Infinity) break;
    closed[current] = true;
    visitedNodes.push(nodeIds[current]);
    if (current === goalIndex) break;

    for (const next of adj[current]) {
      const alt = dist[current] + next.cost;
      if (alt < dist[next.to]) {
        dist[next.to] = alt;
        parent[next.to] = current;
      }
    }
  }

  const idxPath = Number.isFinite(dist[goalIndex]) ? rebuildPath(parent, startIndex, goalIndex) : [];
  return {
    path: idxPath.length ? idxPath.map((idx) => nodeIds[idx]) : [startId],
    visitedNodes,
    stepsCount: visitedNodes.length
  };
}

export function runAStar(graph, startId, goalId) {
  const { nodeIds, indexById, adj } = buildAdjacency(graph);
  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const coords = graph.nodes.map((n) => ({ x: n.x, y: n.y }));
  const gScore = new Array(nodeIds.length).fill(Infinity);
  const fScore = new Array(nodeIds.length).fill(Infinity);
  const parent = new Array(nodeIds.length).fill(-1);
  const open = new Set([startIndex]);
  const visitedNodes = [];

  const heuristic = (a, b) => {
    const dx = coords[a].x - coords[b].x;
    const dy = coords[a].y - coords[b].y;
    return Math.hypot(dx, dy) / 120;
  };

  gScore[startIndex] = 0;
  fScore[startIndex] = heuristic(startIndex, goalIndex);

  while (open.size > 0) {
    let current = -1;
    let best = Infinity;
    for (const idx of open) {
      if (fScore[idx] < best) {
        best = fScore[idx];
        current = idx;
      }
    }

    if (current === -1) break;
    open.delete(current);
    visitedNodes.push(nodeIds[current]);
    if (current === goalIndex) break;

    for (const next of adj[current]) {
      const tentative = gScore[current] + next.cost;
      if (tentative < gScore[next.to]) {
        parent[next.to] = current;
        gScore[next.to] = tentative;
        fScore[next.to] = tentative + heuristic(next.to, goalIndex);
        open.add(next.to);
      }
    }
  }

  const idxPath = Number.isFinite(gScore[goalIndex]) ? rebuildPath(parent, startIndex, goalIndex) : [];
  return {
    path: idxPath.length ? idxPath.map((idx) => nodeIds[idx]) : [startId],
    visitedNodes,
    stepsCount: visitedNodes.length
  };
}

export function runBellmanFord(graph, startId, goalId) {
  const { nodeIds, indexById } = buildAdjacency(graph);
  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const directedEdges = [];
  for (const edge of graph.edges) {
    if (edge.blocked) continue;
    const from = indexById.get(edge.from);
    const to = indexById.get(edge.to);
    if (from == null || to == null) continue;
    const cost = edge.cost ?? 1;
    directedEdges.push({ from, to, cost });
    directedEdges.push({ from: to, to: from, cost });
  }

  const dist = new Array(nodeIds.length).fill(Infinity);
  const parent = new Array(nodeIds.length).fill(-1);
  const visitedNodes = [];
  dist[startIndex] = 0;

  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    let changed = false;
    for (const e of directedEdges) {
      if (!Number.isFinite(dist[e.from])) continue;
      const alt = dist[e.from] + e.cost;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        parent[e.to] = e.from;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (let i = 0; i < nodeIds.length; i += 1) {
    if (Number.isFinite(dist[i])) visitedNodes.push(nodeIds[i]);
  }

  const idxPath = Number.isFinite(dist[goalIndex]) ? rebuildPath(parent, startIndex, goalIndex) : [];
  return {
    path: idxPath.length ? idxPath.map((idx) => nodeIds[idx]) : [startId],
    visitedNodes,
    stepsCount: visitedNodes.length
  };
}

export const ALGORITHMS = {
  bfs: runBFS,
  dfs: runDFS,
  dijkstra: runDijkstra,
  astar: runAStar,
  bellmanFord: runBellmanFord
};

export function solveByAlgorithm(name, graph, startId, goalId) {
  const solver = ALGORITHMS[name];
  if (!solver) throw new Error(`Unknown algorithm: ${name}`);
  return solver(graph, startId, goalId);
}
