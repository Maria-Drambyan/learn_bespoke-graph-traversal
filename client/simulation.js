import { MapVisualizer } from './map-visualizer.js';
import { generateCityMap } from './test-cases.js';
import {
  calculateScore,
  checkCorrectness,
  computePathCost,
  findOptimalSolution
} from './score-calculator.js';

function makeAdjacency(graph) {
  const adj = new Map();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.blocked) {
      continue;
    }

    adj.get(edge.from)?.push(edge.to);
    adj.get(edge.to)?.push(edge.from);
  }

  return adj;
}

function runBFS(graph, startId, goalId) {
  const nodeIds = graph.nodes.map((node) => node.id);
  const indexById = new Map(nodeIds.map((id, index) => [id, index]));
  const adj = new Array(nodeIds.length).fill(null).map(() => []);

  for (const edge of graph.edges) {
    if (edge.blocked) {
      continue;
    }

    const fromIndex = indexById.get(edge.from);
    const toIndex = indexById.get(edge.to);
    if (fromIndex == null || toIndex == null) {
      continue;
    }

    // Undirected road graph.
    adj[fromIndex].push(toIndex);
    adj[toIndex].push(fromIndex);
  }

  const startIndex = indexById.get(startId);
  const goalIndex = indexById.get(goalId);
  if (startIndex == null || goalIndex == null) {
    return { path: [startId], visitedNodes: [], stepsCount: 0 };
  }

  const visited = new Array(nodeIds.length).fill(false);
  const parent = new Array(nodeIds.length).fill(-1);
  const queue = [];
  const visitedNodes = [];

  visited[startIndex] = true;
  queue.push(startIndex);

  while (queue.length !== 0) {
    const currentIndex = queue.shift();
    visitedNodes.push(nodeIds[currentIndex]);

    if (currentIndex === goalIndex) {
      break;
    }

    for (const nextIndex of adj[currentIndex]) {
      if (!visited[nextIndex]) {
        visited[nextIndex] = true;
        parent[nextIndex] = currentIndex;
        queue.push(nextIndex);
      }
    }
  }

  if (!visited[goalIndex]) {
    return { path: [startId], visitedNodes, stepsCount: visitedNodes.length };
  }

  const path = [];
  let cursor = goalIndex;
  while (cursor !== -1) {
    path.unshift(nodeIds[cursor]);
    cursor = parent[cursor];
  }

  return { path, visitedNodes, stepsCount: visitedNodes.length };
}

function runDFS(graph, startId, goalId) {
  const adj = makeAdjacency(graph);
  const stack = [[startId]];
  const seen = new Set();
  const visitedNodes = [];

  while (stack.length > 0) {
    const path = stack.pop();
    const node = path[path.length - 1];

    if (seen.has(node)) {
      continue;
    }

    seen.add(node);
    visitedNodes.push(node);

    if (node === goalId) {
      return { path, visitedNodes, stepsCount: visitedNodes.length };
    }

    // Keep insertion order so DFS dives into branch-heavy roads first on this map.
    // This makes BFS and DFS visibly different for teaching purposes.
    const neighbors = adj.get(node) ?? [];
    for (const next of neighbors) {
      if (!seen.has(next)) {
        stack.push([...path, next]);
      }
    }
  }

  return { path: [startId], visitedNodes, stepsCount: visitedNodes.length };
}

async function runStudent(graph, startId, goalId) {
  const response = await fetch('./student-solution.js');
  if (!response.ok) {
    throw new Error('Could not load student-solution.js');
  }

  const rawSource = await response.text();
  const normalizedSource = rawSource
    .replace(/export\s+function\s+solvePath/g, 'function solvePath')
    .replace(/export\s+\{[^}]*\};?/g, '');

  const workerSource = `
${normalizedSource}
self.onmessage = function (event) {
  const graph = event.data.graph;
  const startId = event.data.startId;
  const goalId = event.data.goalId;

  try {
    if (typeof solvePath !== 'function') {
      throw new Error('student-solution.js must export solvePath(graph, startId, goalId).');
    }
    const result = solvePath(graph, startId, goalId);
    self.postMessage({ ok: true, result: result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
};
`;

  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(workerUrl);

  try {
    const result = await new Promise((resolve, reject) => {
      const timeoutMs = 1200;
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error('Student solution timed out (possible infinite loop).'));
      }, timeoutMs);

      worker.onmessage = (event) => {
        clearTimeout(timer);
        if (!event.data || !event.data.ok) {
          reject(new Error(event.data?.error || 'Student solution failed.'));
          return;
        }
        resolve(event.data.result);
      };

      worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Student solution crashed while running.'));
      };

      worker.postMessage({ graph, startId, goalId });
    });

    if (!result || typeof result !== 'object') {
      throw new Error('solvePath() must return an object with path, visitedNodes, and stepsCount.');
    }

    return {
      path: Array.isArray(result.path) ? result.path : [],
      visitedNodes: Array.isArray(result.visitedNodes) ? result.visitedNodes : [],
      stepsCount:
        typeof result.stepsCount === 'number'
          ? result.stepsCount
          : Array.isArray(result.visitedNodes)
            ? result.visitedNodes.length
            : 0
    };
  } finally {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
}

function formatScore(value) {
  return Number.isFinite(value) ? `${value}%` : '-';
}

function updateScoreUI(score) {
  document.getElementById('score-correctness').textContent = formatScore(score.correctnessScore);
  document.getElementById('score-optimality').textContent = formatScore(score.optimalityScore);
  document.getElementById('score-efficiency').textContent = formatScore(score.efficiencyScore);
  document.getElementById('score-total').textContent = formatScore(score.totalScore);
}

function updateRunUI({ status, path, visited }) {
  document.getElementById('status-text').textContent = status;
  document.getElementById('path-text').textContent = `Path: ${path.length ? path.join(' -> ') : '-'}`;
  document.getElementById('visited-text').textContent = `Visited: ${visited.length ? visited.join(', ') : '-'}`;
}

function setHud(timeSec) {
  document.getElementById('time-chip').textContent = `Time: ${timeSec.toFixed(1)}s`;
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

function buildAnimationAttempt(graph, path, startId, goalId) {
  if (!Array.isArray(path) || path.length === 0) {
    return {
      animPath: [startId],
      reachedGoal: false,
      issue: 'Invalid path: return at least one node.'
    };
  }

  if (path[0] !== startId) {
    return {
      animPath: [startId],
      reachedGoal: false,
      issue: `Path must start at ${startId}.`
    };
  }

  const knownNodes = new Set(graph.nodes.map((node) => node.id));
  const animPath = [path[0]];
  let issue = '';

  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];

    if (!knownNodes.has(to)) {
      issue = `Node "${to}" does not exist in this map.`;
      break;
    }

    if (!edgeExists(graph, from, to)) {
      issue = `Invalid move: ${from} -> ${to} is not a road.`;
      break;
    }

    animPath.push(to);
  }

  const reachedGoal = animPath[animPath.length - 1] === goalId;
  if (!issue && !reachedGoal) {
    issue = `Car did not reach the finish (${goalId}).`;
  }

  return { animPath, reachedGoal, issue };
}

async function initializeSimulation() {
  const scene = generateCityMap();
  const visualizer = new MapVisualizer('map-canvas');
  visualizer.setScene(scene);

  const runButton = document.getElementById('run-btn');
  const resetButton = document.getElementById('reset-btn');
  const solverSelect = document.getElementById('algorithm-select');

  let running = false;

  const reset = () => {
    visualizer.stopAnimation();
    visualizer.draw({
      visitedNodes: [],
      path: [],
      carNodeId: scene.startId,
      carPoint: null,
      crashed: false
    });

    updateScoreUI({
      correctnessScore: NaN,
      optimalityScore: NaN,
      efficiencyScore: NaN,
      totalScore: NaN
    });

    updateRunUI({
      status: 'Ready. Choose a solver and run.',
      path: [],
      visited: []
    });

    setHud(0);
  };

  reset();

  runButton.addEventListener('click', async () => {
    if (running) {
      return;
    }

    running = true;
    runButton.disabled = true;
    resetButton.disabled = true;

    try {
      const selected = solverSelect.value;
      let studentSolution;

      if (selected === 'student') {
        studentSolution = await runStudent(scene.graph, scene.startId, scene.goalId);
      } else if (selected === 'bfs') {
        studentSolution = runBFS(scene.graph, scene.startId, scene.goalId);
      } else {
        studentSolution = runDFS(scene.graph, scene.startId, scene.goalId);
      }

      const path = studentSolution.path ?? [];
      const visitedNodes = studentSolution.visitedNodes ?? [];
      const attempt = buildAnimationAttempt(scene.graph, path, scene.startId, scene.goalId);

      const optimalSolution = findOptimalSolution(scene.graph, scene.startId, scene.goalId);

      const score = calculateScore({
        graph: scene.graph,
        studentSolution,
        optimalSolution,
        startId: scene.startId,
        goalId: scene.goalId
      });

      updateScoreUI(score);
      updateRunUI({
        status: `Running ${selected.toUpperCase()} animation...`,
        path,
        visited: visitedNodes
      });

      if (attempt.animPath.length < 2) {
        visualizer.draw({
          visitedNodes,
          path: attempt.animPath,
          carNodeId: scene.startId,
          carPoint: null,
          crashed: false
        });
        updateRunUI({
          status: `Incorrect: ${attempt.issue}`,
          path,
          visited: visitedNodes
        });
        return;
      }

      const animationResult = await visualizer.animatePath(attempt.animPath, visitedNodes, ({ seconds }) => {
        setHud(seconds);
      });

      const studentCost = computePathCost(scene.graph, path);
      if (animationResult.crashed) {
        updateScoreUI({
          correctnessScore: 0,
          optimalityScore: 0,
          efficiencyScore: 0,
          totalScore: 0
        });
      }

      let finalStatus = '';
      if (animationResult.crashed) {
        finalStatus = `Crashed into traffic at ${animationResult.crashNodeId}. This run is incorrect.`;
      } else if (!attempt.reachedGoal || attempt.issue) {
        finalStatus = `Incorrect: ${attempt.issue}`;
      } else {
        finalStatus = `Done. Cost ${studentCost}, optimal ${optimalSolution.cost}.`;
      }

      updateRunUI({
        status: finalStatus,
        path,
        visited: visitedNodes
      });
    } catch (err) {
      updateRunUI({
        status: `Run failed: ${err.message}`,
        path: [],
        visited: []
      });
      setHud(0);
    } finally {
      running = false;
      runButton.disabled = false;
      resetButton.disabled = false;
    }
  });

  resetButton.addEventListener('click', reset);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSimulation);
} else {
  initializeSimulation();
}
