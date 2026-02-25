export function solvePath(graph, startId, goalId) {
  // Intentionally bad "loop-ish" algorithm:
  // it keeps cycling in a C-H-G-D-C loop and never reaches the finish.
  // This is visualizable and clearly incorrect.
  const path = [startId, 'B', 'C'];
  const visitedNodes = [startId, 'B', 'C'];

  for (let i = 0; i < 4; i += 1) {
    path.push('H', 'G', 'D', 'C');
    visitedNodes.push('H', 'G', 'D', 'C');
  }

  // It stops without touching the goal on purpose.
  path.push('H', 'G');
  visitedNodes.push('H', 'G');

  return {
    path,
    visitedNodes,
    stepsCount: visitedNodes.length
  };
}
