import { MapVisualizer } from './map-visualizer.js';
import { generateCityMap } from './test-cases.js';
import {
  calculateScore,
  computePathCost,
  findOptimalSolution
} from './score-calculator.js';

const KNOWN_ALGOS = ['bfs', 'dfs', 'dijkstra', 'astar', 'bellmanFord'];
const KNOWN_DIFFICULTIES = ['easy', 'medium', 'hard'];

function normalizeAlgorithm(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value) return null;

  const aliases = {
    bfs: 'bfs',
    dfs: 'dfs',
    dijkstra: 'dijkstra',
    dijisktra: 'dijkstra',
    djikstra: 'dijkstra',
    'a*': 'astar',
    astar: 'astar',
    bellmanford: 'bellmanFord',
    'bellman-ford': 'bellmanFord'
  };

  return aliases[value] || null;
}

function normalizeDifficulty(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return null;
}

async function runStudent(graph, startId, goalId, trafficCars = []) {
  const candidateBaseUrls = [
    './solution.js',
    '/solution.js',
    './student-solution.js',
    '/student-solution.js'
  ];
  const cacheBust = `v=${Date.now()}`;

  let rawSource = null;
  for (const baseUrl of candidateBaseUrls) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}${cacheBust}`;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      rawSource = await response.text();
      if (rawSource && rawSource.trim().length > 0) {
        break;
      }
    } catch (_) {
      // Try next URL.
    }
  }

  if (!rawSource) {
    throw new Error('Could not load student solution (expected /solution.js or /student-solution.js).');
  }
  const normalizedSource = rawSource
    .replace(/export\s+function\s+solvePath/g, 'function solvePath')
    .replace(/export\s+\{[^}]*\};?/g, '');

  const workerSource = `
${normalizedSource}
self.onmessage = function (event) {
  const graph = event.data.graph;
  const startId = event.data.startId;
  const goalId = event.data.goalId;
  const trafficCars = Array.isArray(event.data.trafficCars) ? event.data.trafficCars : [];

  try {
    if (typeof solvePath !== 'function') {
      throw new Error('solution.js must export solvePath(graph, startId, goalId).');
    }
    const result = solvePath(graph, startId, goalId, trafficCars);
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

      worker.onerror = (event) => {
        clearTimeout(timer);
        const message = event?.message || 'Student solution crashed while running.';
        const line = event?.lineno ? ` (line ${event.lineno})` : '';
        const col = event?.colno ? `, col ${event.colno}` : '';
        reject(new Error(`${message}${line}${col}`));
      };

      worker.postMessage({ graph, startId, goalId, trafficCars });
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

async function saveUserActionLog(entry) {
  try {
    await fetch('/user-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  } catch (_) {
    // Ignore log failures so simulation flow is never blocked.
  }
}

function edgeExists(graph, from, to) {
  return graph.edges.some((edge) => {
    if (edge.blocked) return false;
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

function pathHasLoop(path) {
  if (!Array.isArray(path)) return false;
  const seen = new Set();
  for (const nodeId of path) {
    if (seen.has(nodeId)) return true;
    seen.add(nodeId);
  }
  return false;
}

function sanitizeInput(correctAlgorithm, difficulty) {
  const normalizedAlgo = normalizeAlgorithm(correctAlgorithm);
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const validCorrect = KNOWN_ALGOS.includes(normalizedAlgo) ? normalizedAlgo : 'bfs';
  const validDifficulty = KNOWN_DIFFICULTIES.includes(normalizedDifficulty) ? normalizedDifficulty : 'medium';
  return { validCorrect, validDifficulty };
}

function getInputDefaultsFromEnv() {
  const params = new URLSearchParams(window.location.search);
  const queryAlgo = params.get('algo') || params.get('algorithm') || params.get('correct');
  const queryDifficulty = params.get('difficulty') || params.get('level');

  const globalConfig = window.__SIM_CONFIG__ || {};
  const configAlgo = globalConfig.correctAlgorithm || globalConfig.algorithm;
  const configDifficulty = globalConfig.difficulty || globalConfig.level;

  const envAlgo = import.meta.env.VITE_CORRECT_ALGO || 'bfs';
  const envDifficulty = import.meta.env.VITE_DIFFICULTY || 'medium';

  const correctAlgorithm = queryAlgo || configAlgo || envAlgo;
  const difficulty = queryDifficulty || configDifficulty || envDifficulty;
  return sanitizeInput(String(correctAlgorithm), String(difficulty));
}

function prettifyAlgo(name) {
  const labels = {
    bfs: 'BFS',
    dfs: 'DFS',
    dijkstra: 'Dijkstra',
    astar: 'A*',
    bellmanFord: 'Bellman-Ford'
  };
  return labels[name] || name;
}

function setupSolverChoices(containerEl, scene) {
  const target = scene.meta.correctAlgorithm;
  const distractor = scene.meta.distractorAlgorithm;
  const values = [distractor, target];

  containerEl.innerHTML = '';
  values.forEach((value, index) => {
    const label = document.createElement('label');
    label.className = 'input-radio input-radio-small';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'solver-choice';
    input.value = value;
    input.checked = index === 0;

    const circle = document.createElement('span');
    circle.className = 'input-radio-circle';
    const dot = document.createElement('span');
    dot.className = 'input-radio-dot';
    circle.appendChild(dot);

    const text = document.createElement('span');
    text.className = 'input-radio-label';
    text.textContent = prettifyAlgo(value);

    label.appendChild(input);
    label.appendChild(circle);
    label.appendChild(text);
    containerEl.appendChild(label);
  });
}

function getSelectedSolver(containerEl) {
  const selected = containerEl.querySelector('input[name="solver-choice"]:checked');
  return selected ? selected.value : '';
}

async function initializeSimulation() {
  const visualizer = new MapVisualizer('map-canvas');

  const runButton = document.getElementById('run-btn');
  const resetButton = document.getElementById('reset-btn');
  const solverOptions = document.getElementById('algorithm-options');

  const defaults = getInputDefaultsFromEnv();
  const scene = generateCityMap({
    correctAlgorithm: defaults.validCorrect,
    difficulty: defaults.validDifficulty
  });
  visualizer.setScene(scene);
  setupSolverChoices(solverOptions, scene);

  let running = false;

  const reset = () => {
    visualizer.stopAnimation();
    visualizer.setPlayerMood('neutral');
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
      status: 'Ready.',
      path: [],
      visited: []
    });

    setHud(0);
  };

  reset();

  runButton.addEventListener('click', async () => {
    if (running) return;

    running = true;
    runButton.disabled = true;
    resetButton.disabled = true;

    try {
      visualizer.setPlayerMood('neutral');
      await visualizer.waitForPlayerSprite(1500, 'neutral');
      const selected = getSelectedSolver(solverOptions) || 'algorithm';
      const studentSolution = await runStudent(
        scene.graph,
        scene.startId,
        scene.goalId,
        scene.trafficCars || []
      );

      const path = studentSolution.path ?? [];
      const visitedNodes = studentSolution.visitedNodes ?? [];
      const attempt = buildAnimationAttempt(scene.graph, path, scene.startId, scene.goalId);
      const traversedNodes = attempt.animPath ?? [];
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
        status: `Running student solution (${selected.toUpperCase()})...`,
        path,
        visited: traversedNodes
      });

      if (attempt.animPath.length < 2) {
        visualizer.setPlayerMood('neutral');
        visualizer.draw({
          visitedNodes: traversedNodes,
          path: attempt.animPath,
          carNodeId: scene.startId,
          carPoint: null,
          crashed: false
        });
        updateRunUI({
          status: `Incorrect: ${attempt.issue}`,
          path,
          visited: traversedNodes
        });
        return;
      }

      const animationResult = await visualizer.animatePath(attempt.animPath, traversedNodes, ({ seconds }) => {
        setHud(seconds);
      });

      const studentCost = computePathCost(scene.graph, path);
      if (animationResult.crashed) {
        visualizer.setPlayerMood('carcrash');
        await visualizer.waitForPlayerSprite(800, 'carcrash');
        updateScoreUI({ correctnessScore: 0, optimalityScore: 0, efficiencyScore: 0, totalScore: 0 });
      }

      let finalStatus = '';
      const hasLoop = pathHasLoop(path);
      if (animationResult.crashed) {
        finalStatus = `Crashed into traffic at ${animationResult.crashNodeId}. This run is incorrect.`;
      } else if (!attempt.reachedGoal || attempt.issue) {
        if (hasLoop) {
          visualizer.setPlayerMood('carcrash');
          await visualizer.waitForPlayerSprite(800, 'carcrash');
        } else {
          visualizer.setPlayerMood('neutral');
        }
        finalStatus = `Incorrect: ${attempt.issue}`;
      } else {
        visualizer.setPlayerMood('happy');
        await visualizer.waitForPlayerSprite(1200, 'happy');
        finalStatus = `Done. Cost ${studentCost}, optimal ${optimalSolution.cost}.`;
      }

      // Keep the crash frame untouched (offset stop point + fire effect).
      // For non-crash results, render final frame at endpoint with selected mood.
      if (!animationResult.crashed) {
        const endNodeId = attempt.animPath[attempt.animPath.length - 1] || scene.startId;
        visualizer.draw({
          visitedNodes: traversedNodes,
          path,
          carNodeId: endNodeId,
          carPoint: null,
          crashed: false
        });
      }

      updateRunUI({
        status: finalStatus,
        path,
        visited: traversedNodes
      });

      await saveUserActionLog({
        event: 'run_completed',
        selectedSolver: selected,
        runDetails: {
          status: finalStatus,
          path,
          visited: traversedNodes
        },
        score: {
          correctness: score.correctnessScore,
          optimality: score.optimalityScore,
          efficiency: score.efficiencyScore,
          total: score.totalScore,
          valid: score.valid,
          studentCost,
          optimalCost: optimalSolution.cost
        }
      });
    } catch (err) {
      const selected = getSelectedSolver(solverOptions) || 'algorithm';
      visualizer.setPlayerMood('carcrash');
      updateRunUI({
        status: `Run failed: ${err.message}`,
        path: [],
        visited: []
      });
      setHud(0);
      await saveUserActionLog({
        event: 'run_failed',
        selectedSolver: selected,
        runDetails: {
          status: `Run failed: ${err.message}`,
          path: [],
          visited: []
        },
        score: null
      });
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
