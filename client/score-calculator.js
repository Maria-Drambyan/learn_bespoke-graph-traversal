function makeAdjacency(graph) {
  const adj = new Map();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.blocked) {
      continue;
    }

    adj.get(edge.from)?.push({ to: edge.to, cost: edge.cost ?? 1 });
    adj.get(edge.to)?.push({ to: edge.from, cost: edge.cost ?? 1 });
  }

  return adj;
}

function edgeExists(graph, from, to) {
  return graph.edges.some((edge) => {
    if (edge.blocked) {
      return false;
    }

    return (
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from)
    );
  });
}

export function checkCorrectness(graph, path, startId, goalId) {
  if (!Array.isArray(path) || path.length < 2) {
    return false;
  }

  if (path[0] !== startId || path[path.length - 1] !== goalId) {
    return false;
  }

  for (let i = 1; i < path.length; i += 1) {
    if (!edgeExists(graph, path[i - 1], path[i])) {
      return false;
    }
  }

  return true;
}

export function computePathCost(graph, path) {
  if (!Array.isArray(path) || path.length < 2) {
    return Infinity;
  }

  let cost = 0;

  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    const edge = graph.edges.find((candidate) => {
      return (
        !candidate.blocked &&
        ((candidate.from === from && candidate.to === to) ||
          (candidate.from === to && candidate.to === from))
      );
    });

    if (!edge) {
      return Infinity;
    }

    cost += edge.cost ?? 1;
  }

  return cost;
}

export function findOptimalSolution(graph, startId, goalId) {
  const adj = makeAdjacency(graph);
  const dist = new Map();
  const prev = new Map();
  const visited = [];
  const unvisited = new Set(graph.nodes.map((node) => node.id));

  for (const nodeId of unvisited) {
    dist.set(nodeId, Infinity);
  }

  dist.set(startId, 0);

  while (unvisited.size > 0) {
    let current = null;
    let currentDist = Infinity;

    for (const nodeId of unvisited) {
      const nodeDist = dist.get(nodeId) ?? Infinity;
      if (nodeDist < currentDist) {
        currentDist = nodeDist;
        current = nodeId;
      }
    }

    if (current === null || currentDist === Infinity) {
      break;
    }

    unvisited.delete(current);
    visited.push(current);

    if (current === goalId) {
      break;
    }

    for (const next of adj.get(current) ?? []) {
      if (!unvisited.has(next.to)) {
        continue;
      }

      const altDist = currentDist + next.cost;
      if (altDist < (dist.get(next.to) ?? Infinity)) {
        dist.set(next.to, altDist);
        prev.set(next.to, current);
      }
    }
  }

  const path = [];
  let cursor = goalId;

  if ((dist.get(goalId) ?? Infinity) < Infinity) {
    while (cursor) {
      path.unshift(cursor);
      cursor = prev.get(cursor);
    }
  }

  return {
    path,
    visitedNodes: visited,
    cost: dist.get(goalId) ?? Infinity,
    stepsCount: visited.length
  };
}

export function calculateScore({ graph, studentSolution, optimalSolution, startId, goalId }) {
  const valid = checkCorrectness(graph, studentSolution.path, startId, goalId);
  const studentCost = computePathCost(graph, studentSolution.path);
  const optimalCost = optimalSolution.cost;

  const correctnessScore = valid ? 100 : 0;

  let optimalityScore = 0;
  if (valid && Number.isFinite(studentCost) && Number.isFinite(optimalCost)) {
    if (studentCost === optimalCost) {
      optimalityScore = 100;
    } else {
      optimalityScore = Math.max(50, Math.round((optimalCost / studentCost) * 100));
    }
  }

  const studentVisitedCount = Math.max(1, studentSolution.visitedNodes?.length ?? 0);
  const optimalVisitedCount = Math.max(1, optimalSolution.visitedNodes?.length ?? 0);
  const efficiencyScore = valid
    ? Math.max(0, Math.min(100, Math.round((optimalVisitedCount / studentVisitedCount) * 100)))
    : 0;

  const totalScore = Math.round(
    correctnessScore * 0.4 + optimalityScore * 0.3 + efficiencyScore * 0.3
  );

  return {
    valid,
    correctnessScore,
    optimalityScore,
    efficiencyScore,
    totalScore,
    studentCost,
    optimalCost
  };
}
