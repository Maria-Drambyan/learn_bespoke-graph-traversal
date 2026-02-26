import { MapVisualizer } from './map-visualizer.js';
import { generateCityMap } from './test-cases.js';
import { solveByAlgorithm } from './algorithms.js';
import {
  calculateScore,
  computePathCost,
  findOptimalSolution
} from './score-calculator.js';

const KNOWN_ALGOS = ['bfs', 'dfs', 'dijkstra', 'astar', 'bellmanFord'];
const KNOWN_DIFFICULTIES = ['easy', 'medium', 'hard'];

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

function sanitizeInput(correctAlgorithm, difficulty) {
  const validCorrect = KNOWN_ALGOS.includes(correctAlgorithm) ? correctAlgorithm : 'bfs';
  const validDifficulty = KNOWN_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  return { validCorrect, validDifficulty };
}

function getInputDefaultsFromEnv() {
  const correctAlgorithm = import.meta.env.VITE_CORRECT_ALGO || 'bfs';
  const difficulty = import.meta.env.VITE_DIFFICULTY || 'medium';
  return sanitizeInput(String(correctAlgorithm), String(difficulty));
}

function updateScenarioChip(scene) {
  const chip = document.getElementById('scenario-chip');
  if (!chip || !scene?.meta) return;
  const m = scene.meta;
  chip.textContent = `Target: ${m.correctAlgorithm} | Distractor: ${m.distractorAlgorithm} | ${m.difficulty}`;
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

function setupSolverChoices(selectEl, scene) {
  const target = scene.meta.correctAlgorithm;
  const distractor = scene.meta.distractorAlgorithm;

  selectEl.innerHTML = '';
  const targetOption = document.createElement('option');
  targetOption.value = target;
  targetOption.textContent = `Correct Candidate (${prettifyAlgo(target)})`;

  const distractorOption = document.createElement('option');
  distractorOption.value = distractor;
  distractorOption.textContent = `Distractor Candidate (${prettifyAlgo(distractor)})`;

  selectEl.appendChild(targetOption);
  selectEl.appendChild(distractorOption);
}

async function initializeSimulation() {
  const visualizer = new MapVisualizer('map-canvas');

  const runButton = document.getElementById('run-btn');
  const resetButton = document.getElementById('reset-btn');
  const generateButton = document.getElementById('generate-btn');
  const solverSelect = document.getElementById('algorithm-select');
  const correctSelect = document.getElementById('correct-algo-select');
  const difficultySelect = document.getElementById('difficulty-select');

  const defaults = getInputDefaultsFromEnv();
  correctSelect.value = defaults.validCorrect;
  difficultySelect.value = defaults.validDifficulty;

  let scene = generateCityMap({
    correctAlgorithm: defaults.validCorrect,
    difficulty: defaults.validDifficulty
  });
  visualizer.setScene(scene);
  setupSolverChoices(solverSelect, scene);
  updateScenarioChip(scene);

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
      status: `Ready. Target is ${scene.meta.correctAlgorithm} on ${scene.meta.difficulty}.`,
      path: [],
      visited: []
    });

    setHud(0);
  };

  const regenerate = () => {
    const input = sanitizeInput(correctSelect.value, difficultySelect.value);
    scene = generateCityMap({
      correctAlgorithm: input.validCorrect,
      difficulty: input.validDifficulty
    });
    visualizer.setScene(scene);
    setupSolverChoices(solverSelect, scene);
    updateScenarioChip(scene);
    reset();
  };

  reset();

  runButton.addEventListener('click', async () => {
    if (running) return;

    running = true;
    runButton.disabled = true;
    resetButton.disabled = true;
    generateButton.disabled = true;

    try {
      const selected = solverSelect.value;
      let studentSolution;

      if (selected === 'student') {
        studentSolution = await runStudent(scene.graph, scene.startId, scene.goalId);
      } else {
        studentSolution = solveByAlgorithm(selected, scene.graph, scene.startId, scene.goalId);
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
        updateScoreUI({ correctnessScore: 0, optimalityScore: 0, efficiencyScore: 0, totalScore: 0 });
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
      generateButton.disabled = false;
    }
  });

  resetButton.addEventListener('click', reset);
  generateButton.addEventListener('click', regenerate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSimulation);
} else {
  initializeSimulation();
}
