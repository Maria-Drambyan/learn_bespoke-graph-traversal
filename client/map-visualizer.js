function getToken(token, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function angleFromPoints(from, to) {
  if (!from || !to) {
    return 0;
  }
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function edgeHash(a, b) {
  const s = `${a}|${b}`;
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export class MapVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scene = null;
    this.nodeById = new Map();
    this.playerSprite = null;
    this.playerSpriteReady = false;
    this.playerSpriteFailed = false;

    this.animationSpeed = 0.02;
    this._animationFrame = null;

    this.loadPlayerSprite();
  }

  setScene(scene) {
    this.scene = scene;
    this.nodeById = new Map(scene.graph.nodes.map((node) => [node.id, node]));
    this.draw({
      visitedNodes: [],
      path: [],
      carNodeId: scene.startId,
      carPoint: null,
      crashed: false
    });
  }

  stopAnimation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  loadPlayerSprite() {
    const candidates = [
      '/neutral-cosmo-2.png',
      '/assets/neutral-cosmo-2.png',
      './assets/neutral-cosmo-2.png'
    ];

    const tryLoad = (index) => {
      if (index >= candidates.length) {
        this.playerSpriteFailed = true;
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.playerSprite = img;
        this.playerSpriteReady = true;
      };
      img.onerror = () => {
        tryLoad(index + 1);
      };
      img.src = `${candidates[index]}?v=1`;
    };

    tryLoad(0);
  }

  draw({
    visitedNodes = [],
    path = [],
    carNodeId = null,
    carPoint = null,
    carAngle = 0,
    crashed = false,
    crashEffect = null
  }) {
    if (!this.scene) {
      return;
    }

    const ctx = this.ctx;
    const { canvas } = this;

    const grass = getToken('--Colors-Base-Accent-Green-200', '#7AE2B4');
    const grassDark = getToken('--Colors-Base-Accent-Green-700', '#199E59');
    const road = getToken('--Colors-Base-Neutral-900', '#66718F');
    const roadStroke = getToken('--Colors-Base-Neutral-1000', '#515C7A');
    const lane = getToken('--Colors-Base-Neutral-00', '#FFFFFF');
    const houseWall = getToken('--Colors-Base-Neutral-100', '#EDEFF5');
    const roof = getToken('--Colors-Base-Accent-Orange-500', '#F9560E');
    const roofDark = getToken('--Colors-Base-Accent-Orange-700', '#E53600');
    const houseAccent = getToken('--Colors-Base-Neutral-200', '#E2E5EE');
    const houseDoor = getToken('--Colors-Base-Neutral-700', '#979FB4');
    const tree = getToken('--Colors-Base-Accent-Green-900', '#267345');
    const treeLight = getToken('--Colors-Base-Accent-Green-600', '#1BB267');
    const treeOutline = getToken('--Colors-Base-Accent-Green-1000', '#0E562B');
    const treeTrunk = getToken('--Colors-Base-Accent-Orange-1000', '#A72400');
    const pathColor = getToken('--Colors-Primary-Default', '#1062FB');
    const visitedColor = getToken('--Colors-Primary-Lightest', '#D2E2FF');
    const danger = getToken('--Colors-Alert-Error-Default', '#C6093A');
    const otherCar = getToken('--Colors-Base-Accent-Yellow-500', '#FFB600');
    const weightBg = getToken('--Colors-Base-Neutral-1300', '#1D2740');
    const weightStroke = getToken('--Colors-Base-Neutral-00', '#FFFFFF');
    const weightText = getToken('--Colors-Base-Neutral-00', '#FFFFFF');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const roadHalfWidth = 52;
    const roadSafePad = 18;
    const nodeXs = this.scene.graph.nodes.map((n) => n.x);
    const nodeYs = this.scene.graph.nodes.map((n) => n.y);
    const roadMinY = Math.max(0, Math.min(...nodeYs) - roadHalfWidth - roadSafePad);
    const roadMaxY = Math.min(canvas.height, Math.max(...nodeYs) + roadHalfWidth + roadSafePad);

    ctx.fillStyle = grassDark;
    const topMargin = 24;
    const bottomMargin = 18;
    const topHeight = Math.max(0, roadMinY - topMargin);
    const bottomTop = roadMaxY + 8;
    const bottomHeight = Math.max(0, canvas.height - bottomTop - bottomMargin);

    if (topHeight > 18) {
      ctx.fillRect(70, topMargin, canvas.width - 140, topHeight);
    }

    if (bottomHeight > 18) {
      ctx.fillRect(70, bottomTop, canvas.width - 140, bottomHeight);
    }

    for (const house of this.scene.houses) {
      ctx.save();
      ctx.shadowColor = getToken('--Colors-Base-Neutral-Alphas-1300-25', 'rgba(30, 41, 67, .25)');
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = getToken('--Colors-Base-Accent-Green-300', '#4DD99B');
      ctx.fillRect(house.x - 10, house.y - 10, house.w + 20, house.h + 20);
      ctx.restore();

      ctx.fillStyle = houseWall;
      ctx.fillRect(house.x, house.y, house.w, house.h);
      ctx.strokeStyle = getToken('--Colors-Stroke-Strong', '#C8CDDB');
      ctx.lineWidth = 2;
      ctx.strokeRect(house.x, house.y, house.w, house.h);

      ctx.fillStyle = roofDark;
      ctx.fillRect(house.x - 4, house.y + 6, house.w + 8, 42);
      ctx.fillStyle = roof;
      ctx.fillRect(house.x - 8, house.y - 2, house.w + 16, 42);

      ctx.fillStyle = houseAccent;
      const boxWidth = Math.floor((house.w - 92) / 3);
      for (let i = 0; i < 3; i += 1) {
        const wx = house.x + 24 + i * (boxWidth + 14);
        ctx.fillRect(wx, house.y + 66, boxWidth, 36);
        ctx.strokeStyle = getToken('--Colors-Stroke-Default', '#E2E5EE');
        ctx.strokeRect(wx, house.y + 66, boxWidth, 36);
      }

      const doorWidth = Math.max(22, Math.floor(house.w * 0.12));
      ctx.fillStyle = houseDoor;
      ctx.fillRect(
        house.x + Math.floor(house.w / 2) - Math.floor(doorWidth / 2),
        house.y + house.h - 44,
        doorWidth,
        44
      );
      ctx.fillStyle = lane;
      ctx.beginPath();
      ctx.arc(
        house.x + Math.floor(house.w / 2) + Math.floor(doorWidth / 2) - 6,
        house.y + house.h - 22,
        2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    for (const t of this.scene.trees) {
      ctx.save();
      ctx.shadowColor = getToken('--Colors-Base-Neutral-Alphas-1300-25', 'rgba(30, 41, 67, .25)');
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = treeTrunk;
      ctx.fillRect(t.x - 7, t.y + 16, 14, 38);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = getToken('--Colors-Base-Neutral-Alphas-1300-25', 'rgba(30, 41, 67, .25)');
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = tree;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = treeOutline;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = treeLight;
      ctx.beginPath();
      ctx.arc(t.x - 10, t.y - 6, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(t.x + 11, t.y - 4, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 96;
    ctx.strokeStyle = road;

    for (const edge of this.scene.graph.edges) {
      const from = this.nodeById.get(edge.from);
      const to = this.nodeById.get(edge.to);
      if (!from || !to) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = roadStroke;
    for (const edge of this.scene.graph.edges) {
      const from = this.nodeById.get(edge.from);
      const to = this.nodeById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.lineWidth = 8;
    ctx.strokeStyle = lane;
    ctx.setLineDash([24, 20]);
    for (const edge of this.scene.graph.edges) {
      const from = this.nodeById.get(edge.from);
      const to = this.nodeById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw edge weights directly on their segment with overlap handling.
    const occupiedWeightSpots = [];
    for (const edge of this.scene.graph.edges) {
      const from = this.nodeById.get(edge.from);
      const to = this.nodeById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      if (edge.from === this.scene.goalId || edge.to === this.scene.goalId) {
        continue;
      }
      const cost = edge.cost ?? 1;
      const anchorT = 0.5;
      const midX = lerp(from.x, to.x, anchorT);
      const midY = lerp(from.y, to.y, anchorT);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      if (length < 92) {
        continue;
      }
      const isHorizontal = Math.abs(dy) <= 2;
      const isVertical = Math.abs(dx) <= 2;
      const hashSign = edgeHash(edge.from, edge.to) % 2 === 0 ? 1 : -1;
      const nx = -dy / length;
      const ny = dx / length;
      const laneOffset = isHorizontal || isVertical ? 18 : 14;
      const text = String(cost);

      ctx.font = '700 18px "Work Sans", sans-serif';
      const textWidth = ctx.measureText(text).width;
      const padX = 12;
      const padY = 7;
      const boxW = textWidth + padX * 2;
      const boxH = 30;

      // Deterministic placement: try one side of the segment, then the opposite.
      let labelX = null;
      let labelY = null;
      const sideCandidates = [hashSign, -hashSign];
      for (const side of sideCandidates) {
        const candidateX = midX + nx * laneOffset * side;
        const candidateY = midY + ny * laneOffset * side;

        const alongT = ((candidateX - from.x) * dx + (candidateY - from.y) * dy) / (length * length);
        if (alongT < 0.24 || alongT > 0.76) {
          continue;
        }
        const perpDist = Math.abs((candidateX - from.x) * dy - (candidateY - from.y) * dx) / length;
        if (perpDist > 30) {
          continue;
        }
        const overlaps = occupiedWeightSpots.some((spot) => (
          Math.abs(candidateX - spot.x) < (boxW / 2 + spot.w / 2 + 8) &&
          Math.abs(candidateY - spot.y) < (boxH / 2 + spot.h / 2 + 8)
        ));
        if (overlaps) {
          continue;
        }

        const nearNode = this.scene.graph.nodes.some((node) => (
          Math.hypot(candidateX - node.x, candidateY - node.y) < 64
        ));
        if (nearNode) {
          continue;
        }

        labelX = candidateX;
        labelY = candidateY;
        break;
      }

      if (labelX == null || labelY == null) {
        continue;
      }

      occupiedWeightSpots.push({ x: labelX, y: labelY, w: boxW, h: boxH });

      ctx.save();
      ctx.shadowColor = getToken('--Colors-Base-Neutral-Alphas-1300-50', 'rgba(30, 41, 67, .5)');
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = weightBg;
      ctx.globalAlpha = 0.96;
      ctx.beginPath();
      ctx.roundRect(labelX - boxW / 2, labelY - boxH / 2, boxW, boxH, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.strokeStyle = weightStroke;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(labelX - boxW / 2, labelY - boxH / 2, boxW, boxH, 10);
      ctx.stroke();

      ctx.fillStyle = weightText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, labelX, labelY + 1);
    }

    for (const nodeId of visitedNodes) {
      const node = this.nodeById.get(nodeId);
      if (!node) {
        continue;
      }
      ctx.fillStyle = visitedColor;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (Array.isArray(path) && path.length > 1) {
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 12;
      ctx.beginPath();
      const first = this.nodeById.get(path[0]);
      if (first) {
        ctx.moveTo(first.x, first.y);
      }

      for (let i = 1; i < path.length; i += 1) {
        const node = this.nodeById.get(path[i]);
        if (node) {
          ctx.lineTo(node.x, node.y);
        }
      }
      ctx.stroke();
    }

    const startNode = this.nodeById.get(this.scene.startId);
    const goalNode = this.nodeById.get(this.scene.goalId);
    if (startNode) {
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.arc(startNode.x, startNode.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    if (goalNode) {
      this.drawFinishBand(goalNode);
    }

    for (const trafficNodeId of this.scene.trafficCars) {
      const n = this.nodeById.get(trafficNodeId);
      if (!n) {
        continue;
      }
      this.drawCar(n.x, n.y, otherCar, 0, 0);
    }

    for (const obstacleId of this.scene.obstacles) {
      const n = this.nodeById.get(obstacleId);
      if (!n) {
        continue;
      }
      this.drawWarning(n.x, n.y);
    }

    const player = carPoint ?? (carNodeId ? this.nodeById.get(carNodeId) : null);
    if (player) {
      if (this.playerSpriteReady && this.playerSprite) {
        this.drawPlayerSprite(player.x, player.y, 0, carAngle);
      } else {
        this.drawCar(player.x, player.y, danger, 0, carAngle);
      }
      if (crashed) {
        this.drawCrashEffect(crashEffect ?? { x: player.x, y: player.y - 28 });
      }
    }
  }

  drawPlayerSprite(x, y, shakeLevel, angle = 0) {
    const ctx = this.ctx;
    if (!this.playerSprite) {
      return;
    }

    const jitterX = shakeLevel > 0 ? (Math.random() - 0.5) * shakeLevel * 1.4 : 0;
    const jitterY = shakeLevel > 0 ? (Math.random() - 0.5) * shakeLevel * 1.4 : 0;

    // Draw exact sprite shape (no rotation, no stretching), scaled uniformly.
    const maxSize = 56;
    const srcW = this.playerSprite.naturalWidth || this.playerSprite.width || maxSize;
    const srcH = this.playerSprite.naturalHeight || this.playerSprite.height || maxSize;
    const scale = Math.min(maxSize / srcW, maxSize / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;

    ctx.save();
    ctx.translate(x + jitterX, y + jitterY);
    ctx.drawImage(this.playerSprite, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  drawCar(x, y, color, shakeLevel, angle = 0) {
    const ctx = this.ctx;
    const jitterX = shakeLevel > 0 ? (Math.random() - 0.5) * shakeLevel * 1.4 : 0;
    const jitterY = shakeLevel > 0 ? (Math.random() - 0.5) * shakeLevel * 1.4 : 0;

    ctx.save();
    ctx.translate(x + jitterX, y + jitterY);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.fillRect(-30, -18, 60, 36);

    ctx.fillStyle = getToken('--Colors-Base-Neutral-00', '#FFFFFF');
    ctx.beginPath();
    ctx.roundRect(-14, -11, 28, 22, 10);
    ctx.fill();

    ctx.fillStyle = getToken('--Colors-Base-Neutral-1300', '#1D2740');
    ctx.fillRect(-30, -20, 12, 6);
    ctx.fillRect(18, -20, 12, 6);
    ctx.fillRect(-30, 14, 12, 6);
    ctx.fillRect(18, 14, 12, 6);

    ctx.restore();
  }

  drawWarning(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = getToken('--Colors-Alert-Warning-Default', '#ED4A0A');
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x + 16, y + 16);
    ctx.lineTo(x - 16, y + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = getToken('--Colors-Base-Neutral-00', '#FFFFFF');
    ctx.fillRect(x - 1.5, y - 4, 3, 10);
    ctx.fillRect(x - 1.5, y + 9, 3, 3);
  }

  drawCrashEffect(effectCenter) {
    const x = effectCenter.x;
    const y = effectCenter.y;
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = getToken('--Colors-Alert-Error-Default', '#C6093A');
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.quadraticCurveTo(x + 16, y - 8, x + 8, y + 8);
    ctx.quadraticCurveTo(x + 2, y + 20, x, y + 24);
    ctx.quadraticCurveTo(x - 3, y + 20, x - 8, y + 8);
    ctx.quadraticCurveTo(x - 16, y - 8, x, y - 26);
    ctx.fill();

    ctx.fillStyle = getToken('--Colors-Alert-Warning-Default', '#ED4A0A');
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.quadraticCurveTo(x + 9, y - 6, x + 4, y + 5);
    ctx.quadraticCurveTo(x + 1, y + 13, x, y + 16);
    ctx.quadraticCurveTo(x - 2, y + 13, x - 4, y + 5);
    ctx.quadraticCurveTo(x - 9, y - 6, x, y - 18);
    ctx.fill();

    ctx.fillStyle = getToken('--Colors-Base-Accent-Yellow-300', '#FFD133');
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.quadraticCurveTo(x + 5, y - 3, x + 2, y + 4);
    ctx.quadraticCurveTo(x, y + 8, x, y + 10);
    ctx.quadraticCurveTo(x - 1, y + 8, x - 2, y + 4);
    ctx.quadraticCurveTo(x - 5, y - 3, x, y - 11);
    ctx.fill();
    ctx.restore();
  }

  drawFinishBand(goalNode) {
    const ctx = this.ctx;
    const lane = getToken('--Colors-Base-Neutral-00', '#FFFFFF');
    const dark = getToken('--Colors-Base-Neutral-1300', '#1D2740');

    const incomingEdge = this.scene.graph.edges.find((edge) => {
      if (edge.blocked) return false;
      return edge.from === this.scene.goalId || edge.to === this.scene.goalId;
    });

    const incomingNodeId = incomingEdge
      ? (incomingEdge.from === this.scene.goalId ? incomingEdge.to : incomingEdge.from)
      : null;
    const incomingNode = incomingNodeId ? this.nodeById.get(incomingNodeId) : null;
    const angle = incomingNode ? angleFromPoints(incomingNode, goalNode) : 0;

    const bandThickness = 26;
    const roadWidth = 100;
    const rows = 8;
    const cols = 2;
    const cellH = roadWidth / rows;
    const cellW = bandThickness / cols;

    ctx.save();
    ctx.translate(goalNode.x, goalNode.y);
    ctx.rotate(angle);

    ctx.fillStyle = lane;
    ctx.beginPath();
    ctx.roundRect(-bandThickness / 2 - 2, -roadWidth / 2 - 2, bandThickness + 4, roadWidth + 4, 4);
    ctx.fill();

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        ctx.fillStyle = (r + c) % 2 === 0 ? dark : lane;
        ctx.fillRect(
          -bandThickness / 2 + c * cellW,
          -roadWidth / 2 + r * cellH,
          cellW,
          cellH
        );
      }
    }

    ctx.restore();
  }

  animatePath(path, visitedNodes, onUpdate) {
    if (!Array.isArray(path) || path.length < 2) {
      return Promise.resolve({ seconds: 0, crashed: false, crashNodeId: null });
    }

    this.stopAnimation();

    const points = path.map((nodeId) => this.nodeById.get(nodeId)).filter(Boolean);
    if (points.length < 2) {
      return Promise.resolve({ seconds: 0, crashed: false, crashNodeId: null });
    }

    const trafficSet = new Set(this.scene.trafficCars);
    let segmentIndex = 0;
    let t = 0;
    let seconds = 0;

    return new Promise((resolve) => {
      let previousTs = null;

      const frame = (ts) => {
        if (previousTs == null) {
          previousTs = ts;
        }

        const dt = Math.min((ts - previousTs) / 1000, 0.05);
        previousTs = ts;
        seconds += dt;

        t += this.animationSpeed + dt * 0.24;

        while (t >= 1 && segmentIndex < points.length - 1) {
          t -= 1;
          segmentIndex += 1;

          const arrivedNodeId = path[segmentIndex];
          if (trafficSet.has(arrivedNodeId)) {
            const crashTarget = this.nodeById.get(arrivedNodeId);
            const previousNode = points[Math.max(0, segmentIndex - 1)];
            let crashPoint = crashTarget;
            const crashAngle = angleFromPoints(previousNode, crashTarget);

            if (previousNode && crashTarget) {
              const dx = crashTarget.x - previousNode.x;
              const dy = crashTarget.y - previousNode.y;
              const length = Math.hypot(dx, dy) || 1;
              const stopDistance = Math.min(72, length * 0.42);
              crashPoint = {
                x: crashTarget.x - (dx / length) * stopDistance,
                y: crashTarget.y - (dy / length) * stopDistance
              };
            }

            const effectPoint = crashTarget && crashPoint
              ? {
                  x: (crashTarget.x + crashPoint.x) / 2,
                  y: (crashTarget.y + crashPoint.y) / 2 - 18
                }
              : crashPoint;
            this.draw({
              visitedNodes,
              path,
              carNodeId: null,
              carPoint: crashPoint ?? points[Math.min(segmentIndex, points.length - 1)],
              carAngle: crashAngle,
              crashed: true,
              crashEffect: effectPoint
            });

            if (typeof onUpdate === 'function') {
              onUpdate({ seconds });
            }

            resolve({ seconds, crashed: true, crashNodeId: arrivedNodeId });
            return;
          }
        }

        const done = segmentIndex >= points.length - 1;
        const from = points[Math.min(segmentIndex, points.length - 1)];
        const to = points[Math.min(segmentIndex + 1, points.length - 1)];

        const carPoint = done
          ? { x: points[points.length - 1].x, y: points[points.length - 1].y }
          : {
              x: lerp(from.x, to.x, t),
              y: lerp(from.y, to.y, t)
            };
        const carAngle = done
          ? angleFromPoints(points[points.length - 2], points[points.length - 1])
          : angleFromPoints(from, to);

        this.draw({
          visitedNodes,
          path,
          carNodeId: null,
          carPoint,
          carAngle,
          crashed: false
        });

        if (typeof onUpdate === 'function') {
          onUpdate({ seconds });
        }

        if (done) {
          resolve({ seconds, crashed: false, crashNodeId: null });
          return;
        }

        this._animationFrame = requestAnimationFrame(frame);
      };

      this._animationFrame = requestAnimationFrame(frame);
    });
  }
}
