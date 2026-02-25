export function generateCityMap() {
  const nodes = [
    { id: 'A', x: 120, y: 420 },
    { id: 'B', x: 320, y: 420 },
    { id: 'C', x: 610, y: 420 },
    { id: 'D', x: 900, y: 420 },
    { id: 'E', x: 1140, y: 420 },
    { id: 'F', x: 1140, y: 250 },
    { id: 'G', x: 900, y: 250 },
    { id: 'H', x: 610, y: 250 },
    { id: 'I', x: 610, y: 670 },
    { id: 'J', x: 320, y: 670 },
    { id: 'K', x: 820, y: 670 },
    { id: 'L', x: 1140, y: 250 }
  ];

  const edges = [
    { from: 'A', to: 'B', cost: 2 },
    { from: 'B', to: 'C', cost: 3 },
    { from: 'C', to: 'D', cost: 2 },
    { from: 'D', to: 'E', cost: 2 },
    { from: 'E', to: 'F', cost: 2 },
    { from: 'F', to: 'L', cost: 1 },
    { from: 'D', to: 'G', cost: 2 },
    { from: 'G', to: 'H', cost: 3 },
    { from: 'H', to: 'C', cost: 2 },
    { from: 'C', to: 'I', cost: 4 },
    { from: 'I', to: 'J', cost: 2 },
    { from: 'I', to: 'K', cost: 2 },
    { from: 'B', to: 'J', cost: 3 }
  ];

  return {
    graph: { nodes, edges },
    startId: 'A',
    goalId: 'L',
    obstacles: [],
    // Traffic is placed on the DFS-first branch (B -> J -> I -> K),
    // while the BFS shortest path (A -> B -> C -> D -> E -> F -> L) is clear.
    trafficCars: ['J', 'K'],
    trees: [
      { x: 520, y: 120 },
      { x: 1010, y: 125 },
      { x: 1040, y: 785 },
      { x: 1180, y: 770 }
    ],
    houses: [
      { x: 120, y: 110, w: 320, h: 160 },
      { x: 720, y: 742, w: 260, h: 118 },
      { x: 1080, y: 710, w: 190, h: 150 },
      { x: 120, y: 760, w: 320, h: 100 }
    ]
  };
}
