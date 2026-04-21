export function setupFlappyMiniGameRuntime({
  app,
  miniGamesSection = null,
  currentMiniGameView = 'tapper',
  getCurrentMiniGameView = null,
  flappyPanelEl = null,
  flappyCanvasEl = null,
  flappyBestEl = null,
  flappyStartBtn = null,
  balanceEl = null,
  flappyState = null,
  flappyBestKey = '',
  flappyGravity = 1120,
  flappyFlapVelocity = -390,
  flappyPipeSpeed = 240,
  flappyPipeSpawnInterval = 1.45,
  flappyPipeWidth = 86,
  flappyPipeGapBase = 198,
  flappyMaxDt = 1 / 30,
  flappyCoinSoundSrc = '',
  flappyWingSoundSrc = '',
  flappyDieSoundSrc = ''
} = {}) {
  const FLAPPY_BEST_KEY = String(flappyBestKey || '').trim();
  const FLAPPY_GRAVITY = Number(flappyGravity) || 1120;
  const FLAPPY_FLAP_VELOCITY = Number(flappyFlapVelocity) || -390;
  const FLAPPY_PIPE_SPEED = Number(flappyPipeSpeed) || 240;
  const FLAPPY_PIPE_SPAWN_INTERVAL = Number(flappyPipeSpawnInterval) || 1.45;
  const FLAPPY_PIPE_WIDTH = Number(flappyPipeWidth) || 86;
  const FLAPPY_PIPE_GAP_BASE = Number(flappyPipeGapBase) || 198;
  const FLAPPY_MAX_DT = Number(flappyMaxDt) || (1 / 30);
  const flappyCoinSoundUrl = String(flappyCoinSoundSrc || '').trim();
  const flappyWingSoundUrl = String(flappyWingSoundSrc || '').trim();
  const flappyDieSoundUrl = String(flappyDieSoundSrc || '').trim();
  const resolveCurrentMiniGameView = () => {
    if (typeof getCurrentMiniGameView === 'function') {
      return String(getCurrentMiniGameView() || '').trim();
    }
    return String(currentMiniGameView || '').trim();
  };

const commitFlappyReward = () => {
  if (flappyState.rewardLogged || flappyState.earnedCents <= 0) return;
  app.addCoinTransaction({
    amountCents: flappyState.earnedCents,
    title: 'Гра: Flappy Nymo',
    category: 'games'
  });
  flappyState.rewardLogged = true;
};

const saveFlappyBest = () => {
  try {
    window.localStorage.setItem(FLAPPY_BEST_KEY, String(flappyState.best));
  } catch {
    // Ignore storage failures.
  }
};

const updateFlappyHud = () => {
  if (flappyBestEl) flappyBestEl.textContent = String(flappyState.best);
};

const drawFlappyHudText = (ctx, text, x, y, options = {}) => {
  if (!ctx || !text) return;
  const fontSize = Number.isFinite(options.fontSize) ? options.fontSize : 26;
  ctx.save();
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = options.baseline || 'top';
  ctx.font = `400 ${fontSize}px "Press Start 2P", "Pixelify Sans", monospace`;
  ctx.fillStyle = options.stroke || 'rgba(7, 10, 16, 0.92)';
  const shadowStep = Math.max(1, Math.round(fontSize * 0.06));
  ctx.fillText(text, x - shadowStep, y);
  ctx.fillText(text, x + shadowStep, y);
  ctx.fillText(text, x, y - shadowStep);
  ctx.fillText(text, x, y + shadowStep);
  ctx.fillStyle = options.fill || '#f5f8ff';
  ctx.fillText(text, x, y);
  ctx.restore();
};

const resolveFlappyWorldSize = () => {
  if (!flappyCanvasEl) return;
  const rect = flappyCanvasEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  // Keep pixel-art rendering on whole-number DPR to avoid subpixel seams.
  const devicePixelRatio = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  flappyState.worldWidth = Math.max(280, Math.round(rect.width));
  flappyState.worldHeight = Math.max(240, Math.round(rect.height));
  const targetWidth = Math.max(1, Math.round(flappyState.worldWidth * devicePixelRatio));
  const targetHeight = Math.max(1, Math.round(flappyState.worldHeight * devicePixelRatio));
  if (flappyCanvasEl.width !== targetWidth) flappyCanvasEl.width = targetWidth;
  if (flappyCanvasEl.height !== targetHeight) flappyCanvasEl.height = targetHeight;
};

const getFlappyGroundHeight = () => Math.round(Math.max(62, flappyState.worldHeight * 0.125));
const getFlappyBirdX = () => Math.round(flappyState.worldWidth * 0.25);
const getFlappyBirdRadius = () => Math.max(14, Math.round(flappyState.worldHeight * 0.025));
const getFlappyPipeGap = () => {
  const playableHeight = Math.max(220, flappyState.worldHeight - getFlappyGroundHeight());
  return Math.round(Math.min(FLAPPY_PIPE_GAP_BASE, Math.max(132, playableHeight * 0.42)));
};

const addFlappyReward = (amountCents) => {
  const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.floor(amountCents)) : 0;
  if (!safeAmount) return;
  flappyState.earnedCents += safeAmount;
  app.setTapBalanceCents(app.getTapBalanceCents() + safeAmount, {
    transactionMeta: {
      title: 'Гра: Flappy Nymo',
      category: 'games',
      amountCents: safeAmount
    }
  });
  balanceEl.textContent = app.formatCoinBalance(app.getTapBalanceCents());
};

const playFlappyCoinSound = () => {
  if (app.settings?.soundNotifications === false) return;
  try {
    if (!app.flappyCoinAudio) {
      app.flappyCoinAudio = new Audio(flappyCoinSoundUrl);
      app.flappyCoinAudio.preload = 'auto';
      app.flappyCoinAudio.volume = 0.45;
    }
    const coinAudio = app.flappyCoinAudio.cloneNode(true);
    coinAudio.currentTime = 0;
    coinAudio.volume = app.flappyCoinAudio.volume;
    const playResult = coinAudio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  } catch {
    // Ignore audio playback issues.
  }
};

const playFlappyWingSound = () => {
  if (app.settings?.soundNotifications === false) return;
  try {
    if (!app.flappyWingAudio) {
      app.flappyWingAudio = new Audio(flappyWingSoundUrl);
      app.flappyWingAudio.preload = 'auto';
      app.flappyWingAudio.volume = 0.38;
    }
    const wingAudio = app.flappyWingAudio.cloneNode(true);
    wingAudio.currentTime = 0;
    wingAudio.volume = app.flappyWingAudio.volume;
    const playResult = wingAudio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  } catch {
    // Ignore audio playback issues.
  }
};

const playFlappyDieSound = () => {
  if (app.settings?.soundNotifications === false) return;
  try {
    if (!app.flappyDieAudio) {
      app.flappyDieAudio = new Audio(flappyDieSoundUrl);
      app.flappyDieAudio.preload = 'auto';
      app.flappyDieAudio.volume = 0.42;
    }
    const dieAudio = app.flappyDieAudio.cloneNode(true);
    dieAudio.currentTime = 0;
    dieAudio.volume = app.flappyDieAudio.volume;
    const playResult = dieAudio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  } catch {
    // Ignore audio playback issues.
  }
};

const prepareFlappySpriteAtlas = (sourceImage) => {
  return sourceImage;
};

const renderFlappyFrame = () => {
  if (!flappyCanvasEl) return;
  const ctx = flappyCanvasEl.getContext('2d');
  if (!ctx) return;

  const worldWidth = flappyState.worldWidth || 960;
  const worldHeight = flappyState.worldHeight || 540;
  const dpr = worldWidth > 0 ? flappyCanvasEl.width / worldWidth : 1;
  const groundHeight = getFlappyGroundHeight();
  const birdX = getFlappyBirdX();
  const birdRadius = getFlappyBirdRadius();

  const sprite = flappyState.spriteAtlas;
  const hasSprite = Boolean(flappyState.spriteReady && sprite);
  const spriteMap = {
    bird: [
      { x: 42, y: 42, w: 92, h: 76 },
      { x: 164, y: 37, w: 93, h: 92 },
      { x: 282, y: 38, w: 92, h: 86 },
      { x: 404, y: 42, w: 93, h: 82 },
      { x: 522, y: 42, w: 92, h: 81 },
      { x: 650, y: 62, w: 93, h: 75 },
      { x: 404, y: 148, w: 93, h: 87 },
      { x: 164, y: 147, w: 93, h: 88 }
    ],
    ground: { x: 31, y: 601, w: 445, h: 77 },
    clouds: [
      { x: 35, y: 473, w: 137, h: 93 },
      { x: 207, y: 473, w: 173, h: 93 },
      { x: 420, y: 479, w: 200, h: 82 },
      { x: 660, y: 484, w: 152, h: 77 },
      { x: 836, y: 489, w: 173, h: 66 },
      { x: 1029, y: 505, w: 77, h: 50 },
      { x: 1124, y: 484, w: 114, h: 77 }
    ]
  };

  const drawSprite = (part, dx, dy, dw, dh) => {
    if (!hasSprite || !part) return false;
    ctx.drawImage(sprite, part.x, part.y, part.w, part.h, dx, dy, dw, dh);
    return true;
  };

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, worldWidth, worldHeight);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, worldHeight - groundHeight);
  skyGradient.addColorStop(0, 'rgba(35, 46, 72, 0.98)');
  skyGradient.addColorStop(1, 'rgba(12, 16, 26, 0.98)');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, worldWidth, worldHeight - groundHeight);

  const cloudSpacing = Math.max(210, Math.round(worldWidth * 0.24));
  const cloudY = Math.round(worldHeight * 0.12);
  const cloudOffset = Math.max(0, flappyState.cloudOffset);
  const firstCloudSegment = Math.floor(cloudOffset / cloudSpacing) - 2;
  const visibleCloudSegments = Math.ceil(worldWidth / cloudSpacing) + 5;
  for (let i = 0; i < visibleCloudSegments; i += 1) {
    const segmentIndex = firstCloudSegment + i;
    const cloud = spriteMap.clouds[((segmentIndex % spriteMap.clouds.length) + spriteMap.clouds.length) % spriteMap.clouds.length];
    const x = Math.round(segmentIndex * cloudSpacing - cloudOffset);
    const y = cloudY + ((segmentIndex % 2) ? 10 : -8);
    const width = Math.round(cloud.w * 0.52);
    const height = Math.round(cloud.h * 0.52);
    if (!drawSprite(cloud, x, y, width, height)) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.ellipse(x + width * 0.55, y + height * 0.62, width * 0.5, height * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const groundPart = hasSprite
    ? { ...spriteMap.ground, x: spriteMap.ground.x + 2, w: Math.min(64, spriteMap.ground.w - 4) }
    : spriteMap.ground;
  const groundTileWidth = Math.max(1, Math.round(groundPart.w));
  const groundY = Math.round(worldHeight - groundHeight);
  const groundShift = ((Math.floor(flappyState.groundOffset) % groundTileWidth) + groundTileWidth) % groundTileWidth;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, groundY, worldWidth, groundHeight);
  ctx.clip();
  for (let x = -groundTileWidth; x < worldWidth + groundTileWidth; x += groundTileWidth) {
    const drawX = Math.round(x - groundShift);
    if (!drawSprite(groundPart, drawX, groundY, groundTileWidth, groundHeight)) {
      ctx.fillStyle = '#5d3f27';
      ctx.fillRect(drawX, groundY, groundTileWidth, groundHeight);
      ctx.fillStyle = '#6ea848';
      ctx.fillRect(drawX, groundY, groundTileWidth, 14);
    }
  }
  ctx.restore();

  flappyState.pipes.forEach((pipe) => {
    const gapHeight = pipe.gapHeight || getFlappyPipeGap();
    const topEnd = Math.round(pipe.gapCenter - gapHeight / 2);
    const bottomStart = Math.round(pipe.gapCenter + gapHeight / 2);
    const pipeX = Math.round(pipe.x);
    const capHeight = 18;
    const topBodyHeight = Math.max(0, topEnd);
    const bottomBodyHeight = Math.max(0, worldHeight - groundHeight - bottomStart);

    if (topBodyHeight > 0) {
      const topGrad = ctx.createLinearGradient(pipeX, 0, pipeX + FLAPPY_PIPE_WIDTH, 0);
      topGrad.addColorStop(0, '#6ea64a');
      topGrad.addColorStop(0.45, '#89c35c');
      topGrad.addColorStop(1, '#4f7f35');
      ctx.fillStyle = topGrad;
      ctx.fillRect(pipeX, 0, FLAPPY_PIPE_WIDTH, topBodyHeight);
      ctx.fillStyle = 'rgba(42, 64, 30, 0.55)';
      ctx.fillRect(pipeX + 10, 0, 6, topBodyHeight);
      ctx.fillRect(pipeX + FLAPPY_PIPE_WIDTH - 16, 0, 6, topBodyHeight);
      ctx.fillStyle = '#3d5d2a';
      ctx.fillRect(pipeX - 6, topEnd - capHeight, FLAPPY_PIPE_WIDTH + 12, capHeight);
      ctx.fillStyle = '#9ad36e';
      ctx.fillRect(pipeX - 2, topEnd - capHeight + 4, FLAPPY_PIPE_WIDTH + 4, 5);
    }

    if (bottomBodyHeight > 0) {
      const bottomGrad = ctx.createLinearGradient(pipeX, 0, pipeX + FLAPPY_PIPE_WIDTH, 0);
      bottomGrad.addColorStop(0, '#6ea64a');
      bottomGrad.addColorStop(0.45, '#89c35c');
      bottomGrad.addColorStop(1, '#4f7f35');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(pipeX, bottomStart, FLAPPY_PIPE_WIDTH, bottomBodyHeight);
      ctx.fillStyle = 'rgba(42, 64, 30, 0.55)';
      ctx.fillRect(pipeX + 10, bottomStart, 6, bottomBodyHeight);
      ctx.fillRect(pipeX + FLAPPY_PIPE_WIDTH - 16, bottomStart, 6, bottomBodyHeight);
      ctx.fillStyle = '#3d5d2a';
      ctx.fillRect(pipeX - 6, bottomStart, FLAPPY_PIPE_WIDTH + 12, capHeight);
      ctx.fillStyle = '#9ad36e';
      ctx.fillRect(pipeX - 2, bottomStart + 4, FLAPPY_PIPE_WIDTH + 4, 5);
    }

    if (pipe.coin && !pipe.coin.collected) {
      const coinSize = Math.max(26, Math.round(worldHeight * 0.064));
      const coinX = pipe.coin.x - coinSize / 2;
      const coinY = pipe.coin.y - coinSize / 2;
      if (flappyState.coinReady && flappyState.coinImage) {
        ctx.drawImage(flappyState.coinImage, coinX, coinY, coinSize, coinSize);
      } else {
        ctx.fillStyle = '#f3c94c';
        ctx.beginPath();
        ctx.arc(pipe.coin.x, pipe.coin.y, coinSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  ctx.save();
  ctx.translate(birdX, flappyState.birdY);
  ctx.rotate(flappyState.birdRotation);
  const birdSize = birdRadius * 3.6;
  const frameIndex = Math.floor(flappyState.flapFrameIndex) % spriteMap.bird.length;
  const currentFrame = spriteMap.bird[frameIndex] || spriteMap.bird[0];
  if (!drawSprite(currentFrame, -birdSize / 2, -birdSize / 2, birdSize, birdSize)) {
    ctx.fillStyle = '#f3c94c';
    ctx.beginPath();
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const hudPaddingX = Math.max(16, Math.round(worldWidth * 0.035));
  const hudPaddingY = Math.max(18, Math.round(worldHeight * 0.045));
  const hudFontSize = Math.max(9, Math.round(worldHeight * 0.022));
  const gameOverTitleSize = Math.max(28, Math.round(worldHeight * 0.1));
  const gameOverStatSize = Math.max(10, Math.round(worldHeight * 0.026));

  if (flappyState.isRunning) {
    drawFlappyHudText(ctx, `SCORE ${flappyState.score}`, hudPaddingX, hudPaddingY, {
      fontSize: hudFontSize,
      align: 'left',
      baseline: 'middle'
    });
    drawFlappyHudText(ctx, `COINS ${flappyState.coins}`, worldWidth - hudPaddingX, hudPaddingY, {
      fontSize: hudFontSize,
      align: 'right',
      baseline: 'middle'
    });
  }

  if (flappyState.gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 10, 0.42)';
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    ctx.restore();

    const centerX = worldWidth * 0.5;
    const overlayTop = Math.round(worldHeight * 0.36);
    const desiredStatsTop = overlayTop + Math.max(58, Math.round(gameOverTitleSize * 2.25));
    const statLineGap = Math.max(20, Math.round(gameOverStatSize * 2.05));
    const maxStatsTop = Math.max(
      overlayTop + Math.round(gameOverTitleSize * 1.9),
      worldHeight - groundHeight - statLineGap - Math.round(gameOverStatSize * 1.4) - 24
    );
    const statsTop = Math.min(desiredStatsTop, maxStatsTop);

    drawFlappyHudText(ctx, 'GAME OVER', centerX, overlayTop, {
      fontSize: gameOverTitleSize,
      align: 'center'
    });
    drawFlappyHudText(ctx, `SCORE ${flappyState.score}`, centerX, statsTop, {
      fontSize: gameOverStatSize,
      align: 'center'
    });
    drawFlappyHudText(ctx, `COINS ${flappyState.coins}`, centerX, statsTop + statLineGap, {
      fontSize: gameOverStatSize,
      align: 'center'
    });
  }
};

const ensureFlappyAssets = () => {
  if (!flappyCanvasEl) return;

  if (app.flappyOrionPreparedAtlas) {
    flappyState.spriteAtlas = app.flappyOrionPreparedAtlas;
    flappyState.spriteReady = true;
  }
  if (app.flappyOrionCoinImage?.complete) {
    flappyState.coinImage = app.flappyOrionCoinImage;
    flappyState.coinReady = true;
  }

  if (flappyState.assetsLoading || (flappyState.spriteReady && flappyState.coinReady)) return;
  flappyState.assetsLoading = true;

  const spriteSrc = flappyCanvasEl.dataset.spriteSrc || '';
  const coinSrc = flappyCanvasEl.dataset.coinSrc || '';

  const finishLoad = () => {
    flappyState.assetsLoading = false;
    renderFlappyFrame();
  };

  let pendingAssets = 0;
  const onAssetDone = () => {
    pendingAssets -= 1;
    if (pendingAssets <= 0) finishLoad();
  };

  if (!flappyState.spriteReady && spriteSrc) {
    pendingAssets += 1;
    const spriteImage = new Image();
    spriteImage.decoding = 'async';
    spriteImage.onload = () => {
      app.flappyOrionPreparedAtlas = prepareFlappySpriteAtlas(spriteImage);
      flappyState.spriteAtlas = app.flappyOrionPreparedAtlas;
      flappyState.spriteImage = spriteImage;
      flappyState.spriteReady = true;
      onAssetDone();
    };
    spriteImage.onerror = () => onAssetDone();
    spriteImage.src = spriteSrc;
  }

  if (!flappyState.coinReady && coinSrc) {
    pendingAssets += 1;
    const coinImage = new Image();
    coinImage.decoding = 'async';
    coinImage.onload = () => {
      app.flappyOrionCoinImage = coinImage;
      flappyState.coinImage = coinImage;
      flappyState.coinReady = true;
      onAssetDone();
    };
    coinImage.onerror = () => onAssetDone();
    coinImage.src = coinSrc;
  }

  if (!pendingAssets) finishLoad();
};

const spawnFlappyPipe = () => {
  const groundHeight = getFlappyGroundHeight();
  const gapHeight = getFlappyPipeGap();
  const playableHeight = flappyState.worldHeight - groundHeight;
  const minGapCenter = 58 + gapHeight / 2;
  const maxGapCenter = playableHeight - 58 - gapHeight / 2;
  const gapCenter = maxGapCenter > minGapCenter
    ? (minGapCenter + Math.random() * (maxGapCenter - minGapCenter))
    : (playableHeight * 0.5);
  const pipe = {
    x: flappyState.worldWidth + FLAPPY_PIPE_WIDTH + 20,
    width: FLAPPY_PIPE_WIDTH,
    gapCenter,
    gapHeight,
    passed: false,
    coin: null
  };

  if (Math.random() > 0.32) {
    const coinSpread = gapHeight * 0.42;
    pipe.coin = {
      x: pipe.x + FLAPPY_PIPE_WIDTH * 0.5,
      y: gapCenter + (Math.random() * 2 - 1) * coinSpread * 0.5,
      collected: false
    };
  }

  flappyState.pipes.push(pipe);
};

const buildFlappyPreviewPipes = () => {
  const groundHeight = getFlappyGroundHeight();
  const gapHeight = getFlappyPipeGap();
  const laneCenter = Math.round((flappyState.worldHeight - groundHeight) * 0.5);
  return [
    {
      x: Math.round(flappyState.worldWidth * 0.78),
      width: FLAPPY_PIPE_WIDTH,
      gapCenter: laneCenter - 34,
      gapHeight,
      passed: true,
      coin: {
        x: Math.round(flappyState.worldWidth * 0.78 + FLAPPY_PIPE_WIDTH * 0.5),
        y: laneCenter - 16,
        collected: false
      }
    },
    {
      x: Math.round(flappyState.worldWidth * 0.78 + 320),
      width: FLAPPY_PIPE_WIDTH,
      gapCenter: laneCenter + 24,
      gapHeight,
      passed: true,
      coin: null
    }
  ];
};

const resetFlappyRound = () => {
  const groundHeight = getFlappyGroundHeight();
  flappyState.score = 0;
  flappyState.coins = 0;
  flappyState.earnedCents = 0;
  flappyState.rewardLogged = false;
  flappyState.gameOver = false;
  flappyState.isDeathFalling = false;
  flappyState.birdY = Math.round((flappyState.worldHeight - groundHeight) * 0.42);
  flappyState.birdVelocity = 0;
  flappyState.birdRotation = 0;
  flappyState.pipes = buildFlappyPreviewPipes();
  flappyState.pipeSpawnTimer = 0.72;
  flappyState.lastTimestamp = performance.now();
  flappyState.flapFrame = 0;
  flappyState.flapFrameIndex = 0;
  if (flappyPanelEl) {
    flappyPanelEl.classList.remove('flappy-game-over');
  }
  updateFlappyHud();
  renderFlappyFrame();
};

const circleRectCollision = (cx, cy, radius, rx, ry, rw, rh) => {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
};

const stopFlappyOrion = (reason = 'finished') => {
  const hasProgress = flappyState.score > 0 || flappyState.coins > 0 || flappyState.earnedCents > 0;
  const shouldHandle =
    flappyState.isRunning ||
    flappyState.isDeathFalling ||
    ((reason === 'switch' || reason === 'restart') && hasProgress);
  if (!shouldHandle) return;

  flappyState.isRunning = false;
  flappyState.isDeathFalling = false;
  if (flappyState.rafId) {
    window.cancelAnimationFrame(flappyState.rafId);
    flappyState.rafId = null;
  }
  if (app.flappyOrionAnimationFrame) {
    window.cancelAnimationFrame(app.flappyOrionAnimationFrame);
    app.flappyOrionAnimationFrame = null;
  }

  commitFlappyReward();
  if (flappyState.score > flappyState.best) {
    flappyState.best = flappyState.score;
    saveFlappyBest();
  }

  if (reason === 'collision') {
    playFlappyDieSound();
  }

  if (reason !== 'restart') {
    flappyState.gameOver = reason !== 'switch';
  }

  if (flappyPanelEl) {
    flappyPanelEl.classList.remove('is-running');
    flappyPanelEl.classList.toggle('flappy-game-over', flappyState.gameOver);
  }
  if (flappyStartBtn) {
    flappyStartBtn.textContent = 'Старт';
  }

  updateFlappyHud();
  renderFlappyFrame();
};

const stepFlappyDeathFall = (timestamp) => {
  if (!flappyState.isDeathFalling) return;
  if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || resolveCurrentMiniGameView() !== 'flappy') {
    stopFlappyOrion('switch');
    return;
  }

  const elapsedSeconds = Math.min(FLAPPY_MAX_DT, Math.max(0, (timestamp - flappyState.lastTimestamp) / 1000));
  flappyState.lastTimestamp = timestamp;
  flappyState.groundOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.28;
  flappyState.cloudOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.08;
  flappyState.flapFrameIndex += elapsedSeconds * 4;
  flappyState.birdVelocity += FLAPPY_GRAVITY * elapsedSeconds * 1.12;
  flappyState.birdY += flappyState.birdVelocity * elapsedSeconds;
  flappyState.birdRotation = Math.min(1.45, flappyState.birdRotation + elapsedSeconds * 3.2);

  const groundHeight = getFlappyGroundHeight();
  const birdRadius = getFlappyBirdRadius();
  const landingY = flappyState.worldHeight - groundHeight - birdRadius * 0.82;
  if (flappyState.birdY >= landingY) {
    flappyState.birdY = landingY;
    flappyState.birdVelocity = 0;
    stopFlappyOrion('finished');
    return;
  }

  renderFlappyFrame();
  flappyState.rafId = window.requestAnimationFrame(stepFlappyDeathFall);
  app.flappyOrionAnimationFrame = flappyState.rafId;
};

const beginFlappyCollisionFall = () => {
  if (flappyState.isDeathFalling || flappyState.gameOver) return;

  if (flappyState.score > flappyState.best) {
    flappyState.best = flappyState.score;
    saveFlappyBest();
  }
  commitFlappyReward();
  playFlappyDieSound();

  flappyState.isRunning = false;
  flappyState.isDeathFalling = true;
  flappyState.gameOver = false;
  flappyState.birdVelocity = Math.max(flappyState.birdVelocity, 150);
  flappyState.birdRotation = Math.max(flappyState.birdRotation, 0.25);
  flappyState.lastTimestamp = performance.now();
  if (flappyPanelEl) {
    flappyPanelEl.classList.remove('flappy-game-over');
  }

  if (flappyState.rafId) {
    window.cancelAnimationFrame(flappyState.rafId);
  }
  if (app.flappyOrionAnimationFrame) {
    window.cancelAnimationFrame(app.flappyOrionAnimationFrame);
  }

  flappyState.rafId = window.requestAnimationFrame(stepFlappyDeathFall);
  app.flappyOrionAnimationFrame = flappyState.rafId;
};

const stepFlappyOrion = (timestamp) => {
  if (!flappyState.isRunning) return;
  if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || resolveCurrentMiniGameView() !== 'flappy') {
    stopFlappyOrion('switch');
    return;
  }
  const birdX = getFlappyBirdX();
  const birdRadius = getFlappyBirdRadius();
  const groundHeight = getFlappyGroundHeight();

  const elapsedSeconds = Math.min(FLAPPY_MAX_DT, Math.max(0, (timestamp - flappyState.lastTimestamp) / 1000));
  flappyState.lastTimestamp = timestamp;
  flappyState.pipeSpawnTimer -= elapsedSeconds;
  flappyState.groundOffset += FLAPPY_PIPE_SPEED * elapsedSeconds;
  flappyState.cloudOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.16;
  flappyState.flapFrameIndex += elapsedSeconds * 14;

  if (flappyState.pipeSpawnTimer <= 0) {
    spawnFlappyPipe();
    flappyState.pipeSpawnTimer = FLAPPY_PIPE_SPAWN_INTERVAL + Math.random() * 0.28;
  }

  flappyState.birdVelocity += FLAPPY_GRAVITY * elapsedSeconds;
  flappyState.birdY += flappyState.birdVelocity * elapsedSeconds;
  flappyState.birdRotation = Math.max(-0.52, Math.min(1.08, flappyState.birdVelocity / 560));

  const topLimit = birdRadius * 0.86;
  const bottomLimit = flappyState.worldHeight - groundHeight - birdRadius * 0.82;
  if (flappyState.birdY < topLimit || flappyState.birdY > bottomLimit) {
    flappyState.birdY = Math.min(bottomLimit, Math.max(topLimit, flappyState.birdY));
    beginFlappyCollisionFall();
    return;
  }

  const passReward = Math.max(1, Math.floor(app.getTapLevelStats().rewardPerTapCents / 2));
  const coinReward = Math.max(4, app.getTapLevelStats().rewardPerTapCents * 2);
  let hasPipeCollision = false;
  flappyState.pipes.forEach((pipe) => {
    if (hasPipeCollision) return;
    pipe.x -= FLAPPY_PIPE_SPEED * elapsedSeconds;
    if (pipe.coin) {
      pipe.coin.x = pipe.x + pipe.width * 0.5;
    }

    const gapHeight = pipe.gapHeight || getFlappyPipeGap();
    const topEnd = pipe.gapCenter - gapHeight / 2;
    const bottomStart = pipe.gapCenter + gapHeight / 2;
    const topCollision = circleRectCollision(
      birdX,
      flappyState.birdY,
      birdRadius,
      pipe.x,
      0,
      pipe.width,
      topEnd
    );
    const bottomCollision = circleRectCollision(
      birdX,
      flappyState.birdY,
      birdRadius,
      pipe.x,
      bottomStart,
      pipe.width,
      flappyState.worldHeight - groundHeight - bottomStart
    );
    if (topCollision || bottomCollision) {
      hasPipeCollision = true;
      return;
    }

    if (!pipe.passed && pipe.x + pipe.width < birdX - birdRadius * 0.35) {
      pipe.passed = true;
      flappyState.score += 1;
      addFlappyReward(passReward);
    }

    if (pipe.coin && !pipe.coin.collected) {
      const coinSize = Math.max(26, Math.round(flappyState.worldHeight * 0.064));
      const dx = birdX - pipe.coin.x;
      const dy = flappyState.birdY - pipe.coin.y;
      const collisionDistance = birdRadius + coinSize * 0.38;
      if (dx * dx + dy * dy <= collisionDistance * collisionDistance) {
        pipe.coin.collected = true;
        flappyState.coins += 1;
        addFlappyReward(coinReward);
        playFlappyCoinSound();
      }
    }
  });

  if (hasPipeCollision) {
    beginFlappyCollisionFall();
    return;
  }

  if (!flappyState.isRunning) return;

  flappyState.pipes = flappyState.pipes.filter((pipe) => pipe.x + pipe.width > -120);
  updateFlappyHud();
  renderFlappyFrame();
  flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
  app.flappyOrionAnimationFrame = flappyState.rafId;
};

const startFlappyOrion = () => {
  if (!flappyCanvasEl) return;
  resolveFlappyWorldSize();
  ensureFlappyAssets();
  stopFlappyOrion('restart');
  resetFlappyRound();
  flappyState.isRunning = true;
  flappyState.lastTimestamp = performance.now();
  if (flappyPanelEl) {
    flappyPanelEl.classList.remove('flappy-game-over');
    flappyPanelEl.classList.add('is-running');
  }
  if (flappyStartBtn) {
    flappyStartBtn.textContent = 'Перезапуск';
  }
  flappyState.pipes = [];
  flappyState.pipeSpawnTimer = 0.95;
  flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
  app.flappyOrionAnimationFrame = flappyState.rafId;
};

const flappyJump = () => {
  if (!flappyCanvasEl) return;
  if (flappyState.isDeathFalling) return;
  if (!flappyState.isRunning) {
    startFlappyOrion();
    if (!flappyState.isRunning) return;
  }
  flappyState.birdVelocity = FLAPPY_FLAP_VELOCITY;
  flappyState.birdRotation = -0.52;
  flappyState.flapFrameIndex += 2;
  playFlappyWingSound();
};



  return {
    updateFlappyHud,
    resolveFlappyWorldSize,
    ensureFlappyAssets,
    renderFlappyFrame,
    startFlappyOrion,
    stopFlappyOrion,
    flappyJump
  };
}
