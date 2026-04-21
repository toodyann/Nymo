import * as THREE from 'three';

export function setupDriftMiniGameRuntime({
  app,
  miniGamesSection = null,
  currentMiniGameView = 'tapper',
  getCurrentMiniGameView = null,
  driftPanelEl = null,
  driftCanvasWrapEl = null,
  driftCanvasEl = null,
  driftStatusEl = null,
  driftScoreEl = null,
  driftMultiplierEl = null,
  driftSpeedEl = null,
  driftOrbsEl = null,
  driftBestEl = null,
  driftStartBtn = null,
  driftSteerLeftBtn = null,
  driftSteerRightBtn = null,
  driftGasBtn = null,
  driftBrakeBtn = null,
  gridHintEl = null,
  balanceEl = null,
  driftState = null,
  drift3d = null,
  getGridControlHintText = null,
  getDriftIdleStatusText = null,
  getDriftRunningStatusText = null,
  lockLandscapeForDrift = null,
  unlockOrientationIfAvailable = null,
  applyMiniGameContainerBackground = null,
  createDriftGltfLoader = null,
  driftBestKey = '',
  driftSpeedFactor = 0.32,
  driftShiftDelaySeconds = 0.5,
  smokeDefault = null
} = {}) {
  const DRIFT_BEST_KEY = String(driftBestKey || '').trim();
  const DRIFT_SPEED_FACTOR = Number(driftSpeedFactor) || 0.32;
  const DRIFT_SHIFT_DELAY_SECONDS = Number(driftShiftDelaySeconds) || 0.5;
  const ORION_DRIVE_SMOKE_DEFAULT = smokeDefault && typeof smokeDefault === 'object'
    ? smokeDefault
    : { wheelColorHex: 0xaeb7c4, exhaustColorHex: 0xc5ccd8, burnoutColorHex: 0xdee5f0 };
  const createOrionDriveGltfLoader = typeof createDriftGltfLoader === 'function'
    ? createDriftGltfLoader
    : () => null;
  const resolveCurrentMiniGameView = () => {
    if (typeof getCurrentMiniGameView === 'function') {
      return String(getCurrentMiniGameView() || '').trim();
    }
    return String(currentMiniGameView || '').trim();
  };

const saveDriftBest = () => {
  try {
    window.localStorage.setItem(DRIFT_BEST_KEY, String(driftState.best));
  } catch {
    // Ignore storage failures.
  }
};

const commitDriftReward = () => {
  if (driftState.rewardLogged || driftState.earnedCents <= 0) return;
  app.addCoinTransaction({
    amountCents: driftState.earnedCents,
    title: 'Гра: Nymo Drive',
    category: 'games'
  });
  driftState.rewardLogged = true;
};

const addDriftReward = (amountCents) => {
  const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.floor(amountCents)) : 0;
  if (!safeAmount) return;
  driftState.earnedCents += safeAmount;
  app.setTapBalanceCents(app.getTapBalanceCents() + safeAmount, {
    transactionMeta: {
      title: 'Гра: Nymo Drive',
      category: 'games',
      amountCents: safeAmount
    }
  });
  balanceEl.textContent = app.formatCoinBalance(app.getTapBalanceCents());
};

const updateDriftHud = () => {
  if (driftScoreEl) driftScoreEl.textContent = String(Math.max(0, Math.floor(driftState.score)));
  if (driftMultiplierEl) driftMultiplierEl.textContent = `x${driftState.multiplier.toFixed(1)}`;
  if (driftSpeedEl) {
    const speedKmh = Math.max(0, Math.round(Math.abs(driftState.speed) * DRIFT_SPEED_FACTOR));
    driftSpeedEl.textContent = String(speedKmh);
  }
  if (driftOrbsEl) driftOrbsEl.textContent = String(driftState.orbs);
  if (driftBestEl) driftBestEl.textContent = String(driftState.best);
};

const setDriftStatus = (message) => {
  if (!driftStatusEl) return;
  driftStatusEl.textContent = message;
};

const syncMiniGameControlHints = () => {
  if (gridHintEl) {
    gridHintEl.textContent = getGridControlHintText();
  }
  if (!driftState.isRunning) {
    setDriftStatus(getDriftIdleStatusText());
  }
};

const resolveDriftSteerInput = () => {
  if (driftState.steerDirection) return driftState.steerDirection;
  const keyDirection = (driftState.keyRight ? 1 : 0) - (driftState.keyLeft ? 1 : 0);
  if (keyDirection) return keyDirection;
  return driftState.touchSteerDirection;
};

const resolveDriftThrottleInput = () => {
  if (driftState.throttleDirection) return driftState.throttleDirection;
  const keyDirection = (driftState.keyGas ? 1 : 0) - (driftState.keyBrake ? 1 : 0);
  if (keyDirection) return keyDirection;
  return driftState.touchThrottleDirection;
};

const syncDriftControlButtons = () => {
  if (driftSteerLeftBtn) driftSteerLeftBtn.classList.toggle('active', resolveDriftSteerInput() < 0);
  if (driftSteerRightBtn) driftSteerRightBtn.classList.toggle('active', resolveDriftSteerInput() > 0);
  if (driftGasBtn) driftGasBtn.classList.toggle('active', resolveDriftThrottleInput() > 0);
  if (driftBrakeBtn) driftBrakeBtn.classList.toggle('active', resolveDriftThrottleInput() < 0);
};

const resolveDriftWorldSize = () => {
  if (!driftCanvasEl) return;
  const rect = driftCanvasEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const devicePixelRatio = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  driftState.worldWidth = Math.max(280, Math.round(rect.width));
  driftState.worldHeight = Math.max(240, Math.round(rect.height));
  const targetWidth = Math.max(1, Math.round(driftState.worldWidth * devicePixelRatio));
  const targetHeight = Math.max(1, Math.round(driftState.worldHeight * devicePixelRatio));
  if (driftCanvasEl.width !== targetWidth) driftCanvasEl.width = targetWidth;
  if (driftCanvasEl.height !== targetHeight) driftCanvasEl.height = targetHeight;
  if (drift3d.renderer && drift3d.camera) {
    drift3d.renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
    drift3d.renderer.setSize(driftState.worldWidth, driftState.worldHeight, false);
    drift3d.camera.aspect = driftState.worldWidth / Math.max(1, driftState.worldHeight);
    drift3d.camera.updateProjectionMatrix();
  }
  if (!driftState.isRunning) {
    driftState.carX = 0;
    driftState.carY = 0;
    driftState.carAngle = 0;
    driftState.bodyAngle = 0;
    driftState.cameraX = 0;
    driftState.cameraY = 0;
    driftState.prevCameraX = 0;
    driftState.prevCameraY = 0;
    driftState.cameraShakeX = 0;
    driftState.cameraShakeY = 0;
    driftState.cameraHeading = 0;
    driftState.cameraDriftYaw = 0;
  }
};

const addDriftParticles = (x, y, amount = 2, color = 'rgba(255, 138, 46, 0.72)') => {
  for (let i = 0; i < amount; i += 1) {
    driftState.particles.push({
      x: x + (Math.random() * 16 - 8),
      y: y + (Math.random() * 16 - 8),
      vx: (Math.random() * 2 - 1) * 48,
      vy: (Math.random() * 2 - 1) * 48,
      life: 0.24 + Math.random() * 0.34,
      size: 2 + Math.random() * 2.6,
      color
    });
  }
  if (driftState.particles.length > 180) {
    driftState.particles.splice(0, driftState.particles.length - 180);
  }
};

const addDriftTrackMark = (x, y, angle, intensity = 1, width = 2.2, length = 6.8) => {
  const trackLife = 7.2 + Math.random() * 2.6;
  driftState.trackIdSeed = (driftState.trackIdSeed + 1) % 1_000_000_000;
  driftState.tireTracks.push({
    id: driftState.trackIdSeed,
    x,
    y,
    angle,
    width: width * (0.9 + Math.random() * 0.16),
    length: length * (0.88 + Math.random() * 0.18),
    life: trackLife,
    maxLife: trackLife,
    intensity: Math.max(0.3, Math.min(1, intensity))
  });
  if (driftState.tireTracks.length > 900) {
    driftState.tireTracks.splice(0, driftState.tireTracks.length - 900);
  }
};

const addDriftExhaustPuff = (x, y, angle, strength = 0.2, speedAbs = 0) => {
  const smokeStyle = app.getOrionDriveSmokeDefinition(app.user?.equippedDriveSmokeColor || '');
  driftState.exhaustIdSeed = (driftState.exhaustIdSeed + 1) % 1_000_000_000;
  const backDrift = 0.24 + speedAbs * 0.016 + strength * 0.52;
  const spread = 0.26 + strength * 0.42;
  const forwardX = Math.sin(angle);
  const forwardY = -Math.cos(angle);
  const sideX = Math.cos(angle);
  const sideY = Math.sin(angle);
  driftState.exhaustPuffs.push({
    id: driftState.exhaustIdSeed,
    x: x + sideX * (Math.random() * 2 - 1) * 0.24,
    y: y + sideY * (Math.random() * 2 - 1) * 0.24,
    height: driftState.exhaustHeight + (Math.random() * 0.008 - 0.004),
    vx: -forwardX * backDrift + sideX * (Math.random() * 2 - 1) * spread,
    vy: -forwardY * backDrift + sideY * (Math.random() * 2 - 1) * spread,
    rise: 0.028 + Math.random() * 0.03 + strength * 0.02,
    size: 3.2 + Math.random() * 1.6 + strength * 1.8,
    opacity: 0.045 + strength * 0.07,
    colorHex: smokeStyle.exhaustColorHex,
    life: 0.72 + Math.random() * 0.42 + strength * 0.24,
    maxLife: 1
  });
  const lastPuff = driftState.exhaustPuffs[driftState.exhaustPuffs.length - 1];
  if (lastPuff) lastPuff.maxLife = lastPuff.life;
  if (driftState.exhaustPuffs.length > 180) {
    driftState.exhaustPuffs.splice(0, driftState.exhaustPuffs.length - 180);
  }
};

const addDriftWheelSmokePuff = (
  x,
  y,
  angle,
  strength = 0.45,
  speedAbs = 0,
  burnout = false,
  options = {}
) => {
  const smokeStyle = app.getOrionDriveSmokeDefinition(app.user?.equippedDriveSmokeColor || '');
  const {
    alongOffset = 0,
    sideOffset = 0,
    heightBoost = 0,
    spreadBoost = 0,
    sizeBoost = 0,
    opacityBoost = 0,
    lifeBoost = 0,
    riseBoost = 0,
    swirlBoost = 0
  } = options || {};
  driftState.wheelSmokeIdSeed = (driftState.wheelSmokeIdSeed + 1) % 1_000_000_000;
  const forwardX = Math.sin(angle);
  const forwardY = -Math.cos(angle);
  const sideX = Math.cos(angle);
  const sideY = Math.sin(angle);
  const backSpeed = 0.28 + speedAbs * 0.02 + strength * 0.7;
  const sideSpread = 0.24 + strength * 0.48 + (burnout ? 0.22 : 0) + spreadBoost;
  const jitter = (burnout ? 0.32 : 0.18) + Math.min(0.3, Math.abs(sideOffset) * 0.2);
  const activeWheelSmokeColor = Number.isFinite(smokeStyle.wheelColorHex)
    ? smokeStyle.wheelColorHex
    : ORION_DRIVE_SMOKE_DEFAULT.wheelColorHex;
  const emissionX = x
    - forwardX * alongOffset
    + sideX * sideOffset
    + sideX * (Math.random() * 2 - 1) * jitter;
  const emissionY = y
    - forwardY * alongOffset
    + sideY * sideOffset
    + sideY * (Math.random() * 2 - 1) * jitter;
  const swirl = 0.16 + strength * 0.28 + (burnout ? 0.14 : 0) + swirlBoost;
  driftState.wheelSmokePuffs.push({
    id: driftState.wheelSmokeIdSeed,
    x: emissionX,
    y: emissionY,
    height: 0.04 + Math.random() * 0.018 + heightBoost,
    vx: -forwardX * backSpeed + sideX * (Math.random() * 2 - 1) * sideSpread,
    vy: -forwardY * backSpeed + sideY * (Math.random() * 2 - 1) * sideSpread,
    rise: 0.1 + Math.random() * 0.08 + strength * 0.1 + (burnout ? 0.06 : 0) + riseBoost,
    size: 4.8 + Math.random() * 2.2 + strength * 2.8 + (burnout ? 2.1 : 0) + sizeBoost,
    opacity: 0.16 + strength * 0.18 + (burnout ? 0.08 : 0) + opacityBoost,
    colorHex: activeWheelSmokeColor,
    life: 0.5 + Math.random() * 0.28 + strength * 0.28 + (burnout ? 0.12 : 0) + lifeBoost,
    maxLife: 1,
    age: 0,
    swirl,
    noisePhase: Math.random() * Math.PI * 2,
    noiseSpeed: 3.2 + Math.random() * 2.4,
    drag: 2.2 + Math.random() * 1.2 + (burnout ? 0.5 : 0),
    spread: 0.16 + Math.random() * 0.22 + Math.max(0, spreadBoost) * 0.4,
    verticalStretch: 1 + Math.random() * 0.34,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() * 2 - 1) * 0.34
  });
  const lastPuff = driftState.wheelSmokePuffs[driftState.wheelSmokePuffs.length - 1];
  if (lastPuff) lastPuff.maxLife = lastPuff.life;
  if (driftState.wheelSmokePuffs.length > 460) {
    driftState.wheelSmokePuffs.splice(0, driftState.wheelSmokePuffs.length - 460);
  }
};

const addDriftWheelSmokeCluster = (
  wheelX,
  wheelY,
  angle,
  strength = 0.45,
  speedAbs = 0,
  burnout = false,
  wheelSide = 0
) => {
  addDriftWheelSmokePuff(wheelX, wheelY, angle, strength, speedAbs, burnout);
  const extraLayers = burnout ? 3 : strength > 0.82 ? 2 : 1;
  for (let i = 0; i < extraLayers; i += 1) {
    const layerFactor = i + 1;
    addDriftWheelSmokePuff(wheelX, wheelY, angle, strength, speedAbs, burnout, {
      alongOffset: 0.2 + layerFactor * (0.22 + Math.random() * 0.1),
      sideOffset: wheelSide * (0.14 + layerFactor * 0.08) + (Math.random() * 2 - 1) * (0.12 + strength * 0.22),
      heightBoost: 0.016 + layerFactor * 0.018,
      spreadBoost: 0.12 + strength * 0.15,
      sizeBoost: 0.8 + layerFactor * 0.58 + strength * 0.56,
      opacityBoost: 0.012 + layerFactor * 0.009,
      lifeBoost: 0.06 + layerFactor * 0.06,
      riseBoost: 0.04 + layerFactor * 0.035,
      swirlBoost: 0.08 + layerFactor * 0.06
    });
  }
};

const spawnDriftCoin = (minDistance = 200, maxDistance = 760) => {
  if (driftState.coins.length >= 24) return;
  const angle = Math.random() * Math.PI * 2;
  const distance = minDistance + Math.random() * (maxDistance - minDistance);
  driftState.coins.push({
    id: Math.floor(Math.random() * 1_000_000),
    x: driftState.carX + Math.cos(angle) * distance,
    y: driftState.carY + Math.sin(angle) * distance,
    size: Math.max(24, Math.round(driftState.worldHeight * 0.06)),
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 1.9 + Math.random() * 1.1,
    bobHeight: 0.1 + Math.random() * 0.08
  });
};

const spawnDriftObstacle = (minDistance = 240, maxDistance = 1250) => {
  if (driftState.obstacles.length >= 22) return;
  const angle = Math.random() * Math.PI * 2;
  const distance = minDistance + Math.random() * (maxDistance - minDistance);
  const type = Math.random() < 0.36 ? 'box' : 'cone';
  const size = type === 'box'
    ? Math.max(30, Math.round(driftState.worldHeight * (0.07 + Math.random() * 0.024)))
    : Math.max(28, Math.round(driftState.worldHeight * (0.062 + Math.random() * 0.02)));
  driftState.obstacles.push({
    id: Math.floor(Math.random() * 1_000_000),
    x: driftState.carX + Math.cos(angle) * distance,
    y: driftState.carY + Math.sin(angle) * distance,
    type,
    size,
    rotation: (Math.random() - 0.5) * (type === 'box' ? 0.58 : 0.18)
  });
};

const createDriftCoinObject = () => {
  if (drift3d.coinMaterial) {
    const spriteMaterial = drift3d.coinMaterial.clone();
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 2;
    return sprite;
  }
  const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf8b449,
    emissive: 0x265a8e,
    emissiveIntensity: 0.42,
    metalness: 0.45,
    roughness: 0.35
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.position.y = 0.92;
  return mesh;
};

const createDriftTrackObject = () => {
  if (!drift3d.trackGeometry) {
    drift3d.trackGeometry = new THREE.PlaneGeometry(1, 1);
  }
  if (!drift3d.trackMaterial) {
    drift3d.trackMaterial = new THREE.MeshBasicMaterial({
      color: 0x07090c,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
  }
  const material = drift3d.trackMaterial.clone();
  const mesh = new THREE.Mesh(drift3d.trackGeometry, material);
  mesh.renderOrder = 1;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.008;
  return mesh;
};

const createDriftExhaustObject = () => {
  if (!drift3d.exhaustTexture) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 96;
    textureCanvas.height = 96;
    const ctx = textureCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(48, 48, 6, 48, 48, 46);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
      gradient.addColorStop(0.44, 'rgba(255, 255, 255, 0.36)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 96, 96);
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    drift3d.exhaustTexture = texture;
  }
  if (!drift3d.exhaustMaterial) {
    drift3d.exhaustMaterial = new THREE.SpriteMaterial({
      map: drift3d.exhaustTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
  }
  const material = drift3d.exhaustMaterial.clone();
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 4;
  return sprite;
};

const createDriftWheelSmokeObject = () => {
  if (!drift3d.wheelSmokeTexture) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    const ctx = textureCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      const blobs = [
        { x: 50, y: 74, r: 42, alpha: 0.38 },
        { x: 84, y: 68, r: 36, alpha: 0.3 },
        { x: 70, y: 46, r: 34, alpha: 0.28 },
        { x: 44, y: 48, r: 30, alpha: 0.26 }
      ];
      blobs.forEach((blob) => {
        const gradient = ctx.createRadialGradient(blob.x, blob.y, blob.r * 0.18, blob.x, blob.y, blob.r);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${blob.alpha})`);
        gradient.addColorStop(0.56, `rgba(255, 255, 255, ${blob.alpha * 0.54})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
      });
      const haze = ctx.createRadialGradient(64, 66, 14, 64, 66, 60);
      haze.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      haze.addColorStop(0.72, 'rgba(255, 255, 255, 0.08)');
      haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    drift3d.wheelSmokeTexture = texture;
  }
  if (!drift3d.wheelSmokeMaterial) {
    drift3d.wheelSmokeMaterial = new THREE.SpriteMaterial({
      map: drift3d.wheelSmokeTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });
  }
  const material = drift3d.wheelSmokeMaterial.clone();
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 5;
  return sprite;
};

const createFallbackConeMesh = () => {
  const geometry = new THREE.ConeGeometry(0.34, 0.92, 18);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff8d3d,
    metalness: 0.08,
    roughness: 0.72
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.position.y = 0.46;
  return mesh;
};

const createFallbackBoxMesh = () => {
  const geometry = new THREE.BoxGeometry(0.72, 0.72, 0.72);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8f704b,
    metalness: 0.06,
    roughness: 0.82
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.position.y = 0.36;
  return mesh;
};

const alignDriftCarLights = (carBody = drift3d.carVisual || drift3d.carFallback) => {
  if (!drift3d.carRoot || !carBody) return;
  drift3d.carRoot.updateMatrixWorld(true);
  const worldBox = new THREE.Box3().setFromObject(carBody);
  if (worldBox.isEmpty()) return;

  const localMin = worldBox.min.clone();
  const localMax = worldBox.max.clone();
  drift3d.carRoot.worldToLocal(localMin);
  drift3d.carRoot.worldToLocal(localMax);

  const minX = Math.min(localMin.x, localMax.x);
  const maxX = Math.max(localMin.x, localMax.x);
  const minY = Math.min(localMin.y, localMax.y);
  const maxY = Math.max(localMin.y, localMax.y);
  const minZ = Math.min(localMin.z, localMax.z);
  const maxZ = Math.max(localMin.z, localMax.z);
  const width = Math.max(0.2, maxX - minX);
  const height = Math.max(0.2, maxY - minY);
  const length = Math.max(0.4, maxZ - minZ);
  const inverseWorldScale = 1 / Math.max(0.0001, drift3d.worldScale);

  const sideOffset = Math.max(0.14, Math.min(0.55, width * 0.23));
  const rearAxleOffset = Math.max(0.08, Math.min(length * 0.46, Math.abs(minZ + length * 0.26)));
  const frontY = minY + height * 0.38;
  const rearY = minY + height * 0.33;
  const frontZ = maxZ - Math.max(0.03, length * 0.02);
  const rearZ = minZ + Math.max(0.03, length * 0.03);
  const exhaustRearOffset = Math.max(0.06, length * 0.08);
  const exhaustSideOffset = Math.max(0.035, width * 0.12);
  const targetZ = frontZ + Math.max(8.5, length * 7.2);
  const targetY = minY + Math.max(0.02, height * 0.06);
  driftState.trackRearOffset = Math.max(8, rearAxleOffset * inverseWorldScale);
  driftState.trackWheelOffset = Math.max(3.8, sideOffset * inverseWorldScale * 0.94);
  driftState.trackMarkWidth = Math.max(1.1, Math.min(2.8, width * inverseWorldScale * 0.1));
  driftState.trackMarkLength = Math.max(3.6, Math.min(8.4, length * inverseWorldScale * 0.14));
  const exhaustRearWorld = Math.max(3.6, Math.min(7.8, exhaustRearOffset * inverseWorldScale));
  const exhaustSideWorld = Math.max(1.1, Math.min(2.6, exhaustSideOffset * inverseWorldScale));
  driftState.exhaustRearOffset = exhaustRearWorld;
  driftState.exhaustSideOffset = exhaustSideWorld;
  driftState.exhaustHeight = Math.max(0.008, minY + height * 0.03);

  drift3d.headlights.forEach((light, index) => {
    const side = index === 0 ? -1 : 1;
    const x = sideOffset * side;
    light.position.set(x, frontY, frontZ);
    const target = light.userData.targetNode;
    if (target) target.position.set(x * 0.7, targetY, targetZ);
  });
  drift3d.brakeLights.forEach((light, index) => {
    const side = index === 0 ? -1 : 1;
    light.position.set(sideOffset * side, rearY, rearZ);
  });
  drift3d.reverseLights.forEach((light, index) => {
    const side = index === 0 ? -1 : 1;
    light.position.set(sideOffset * side * 0.88, rearY, rearZ + 0.01);
  });
};

const ensureDriftThreeScene = () => {
  if (!driftCanvasEl || drift3d.failed) return false;
  if (drift3d.renderer && drift3d.scene && drift3d.camera && drift3d.carRoot) return true;

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: driftCanvasEl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
    renderer.setSize(driftState.worldWidth, driftState.worldHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      driftState.worldWidth / Math.max(1, driftState.worldHeight),
      0.1,
      420
    );
    camera.position.copy(drift3d.cameraPosition);

    const ambient = new THREE.AmbientLight(0xffffff, 0.34);
    const hemi = new THREE.HemisphereLight(0x8eb5ff, 0x1c2027, 0.48);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(18, 24, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 120;
    directional.shadow.camera.left = -28;
    directional.shadow.camera.right = 28;
    directional.shadow.camera.top = 28;
    directional.shadow.camera.bottom = -28;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(720, 720, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.95, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;

    const grid = new THREE.GridHelper(720, 120, 0x2f3a47, 0x2f3a47);
    grid.position.y = 0.01;
    grid.material.opacity = 0.28;
    grid.material.transparent = true;

    const carRoot = new THREE.Group();
    carRoot.position.set(0, 0.08, 0);

    const fallbackCar = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.46, 2.35),
      new THREE.MeshStandardMaterial({ color: 0xdd4040, metalness: 0.2, roughness: 0.55 })
    );
    fallbackCar.position.y = 0.38;
    fallbackCar.castShadow = true;
    fallbackCar.receiveShadow = false;
    carRoot.add(fallbackCar);

    const makeHeadlight = (offsetX) => {
      const light = new THREE.SpotLight(0xffd996, 3.2, 42, Math.PI / 4.6, 0.56, 0.85);
      light.position.set(offsetX, 0.5, 0.96);
      const target = new THREE.Object3D();
      target.position.set(offsetX * 0.7, 0.04, 10);
      carRoot.add(target);
      light.target = target;
      light.userData.targetNode = target;
      carRoot.add(light);
      return light;
    };
    const makeRearLight = (offsetX, color) => {
      const light = new THREE.PointLight(color, 0, 3.6, 2.1);
      light.position.set(offsetX, 0.34, -1.02);
      carRoot.add(light);
      return light;
    };

    drift3d.headlights = [makeHeadlight(-0.28), makeHeadlight(0.28)];
    drift3d.brakeLights = [makeRearLight(-0.26, 0xff4a4a), makeRearLight(0.26, 0xff4a4a)];
    drift3d.reverseLights = [makeRearLight(-0.23, 0xffffff), makeRearLight(0.23, 0xffffff)];

    scene.add(ground);
    scene.add(grid);
    scene.add(ambient);
    scene.add(hemi);
    scene.add(directional);
    scene.add(carRoot);

    drift3d.renderer = renderer;
    drift3d.scene = scene;
    drift3d.camera = camera;
    drift3d.ground = ground;
    drift3d.grid = grid;
    drift3d.carRoot = carRoot;
    drift3d.carFallback = fallbackCar;
    drift3d.themeKey = '';
    alignDriftCarLights(fallbackCar);
  } catch {
    drift3d.failed = true;
    setDriftStatus('3D рендер недоступний у цьому браузері. Спробуй інший браузер або пристрій.');
    return false;
  }

  return true;
};

const syncDriftThreeEntities = () => {
  if (!drift3d.scene) return;
  const isDarkTheme = document.documentElement.classList.contains('dark-theme');

  const trackIds = new Set(driftState.tireTracks.map((track) => track.id));
  drift3d.trackObjects.forEach((object3d, id) => {
    if (trackIds.has(id)) return;
    drift3d.scene.remove(object3d);
    if (object3d.material) object3d.material.dispose?.();
    drift3d.trackObjects.delete(id);
  });

  driftState.tireTracks.forEach((track) => {
    let trackObject = drift3d.trackObjects.get(track.id);
    if (!trackObject) {
      trackObject = createDriftTrackObject();
      drift3d.scene.add(trackObject);
      drift3d.trackObjects.set(track.id, trackObject);
    }
    const sceneX = track.x * drift3d.worldScale;
    const sceneZ = track.y * drift3d.worldScale;
    const fade = track.maxLife > 0 ? Math.max(0, track.life / track.maxLife) : 0;
    const trackOpacityBase = (0.3 + fade * 0.5) * track.intensity;
    trackObject.position.set(sceneX, 0.008 + (1 - fade) * 0.002, sceneZ);
    trackObject.rotation.y = -track.angle;
    const scaleX = Math.max(0.06, track.width * drift3d.worldScale);
    const scaleY = Math.max(0.2, track.length * drift3d.worldScale);
    trackObject.scale.set(scaleX, scaleY, 1);
    if (trackObject.material?.isMaterial) {
      trackObject.material.opacity = Math.max(0, Math.min(0.97, trackOpacityBase * (isDarkTheme ? 1 : 0.78)));
      trackObject.material.color.setHex(isDarkTheme ? 0x090c10 : 0x4e4332);
    }
  });

  const exhaustIds = new Set(driftState.exhaustPuffs.map((puff) => puff.id));
  drift3d.exhaustObjects.forEach((object3d, id) => {
    if (exhaustIds.has(id)) return;
    drift3d.scene.remove(object3d);
    if (object3d.material) object3d.material.dispose?.();
    drift3d.exhaustObjects.delete(id);
  });

  driftState.exhaustPuffs.forEach((puff) => {
    let exhaustObject = drift3d.exhaustObjects.get(puff.id);
    if (!exhaustObject) {
      exhaustObject = createDriftExhaustObject();
      drift3d.scene.add(exhaustObject);
      drift3d.exhaustObjects.set(puff.id, exhaustObject);
    }
    const sceneX = puff.x * drift3d.worldScale;
    const sceneZ = puff.y * drift3d.worldScale;
    const fade = puff.maxLife > 0 ? Math.max(0, puff.life / puff.maxLife) : 0;
    const scale = Math.max(0.07, puff.size * drift3d.worldScale * (1 + (1 - fade) * 1.7));
    exhaustObject.position.set(sceneX, puff.height, sceneZ);
    exhaustObject.scale.set(scale, scale, 1);
    if (exhaustObject.material?.isMaterial) {
      exhaustObject.material.color.setHex(
        Number.isFinite(puff.colorHex) ? puff.colorHex : ORION_DRIVE_SMOKE_DEFAULT.exhaustColorHex
      );
      exhaustObject.material.opacity = Math.max(
        0,
        Math.min(0.2, puff.opacity * fade * (isDarkTheme ? 1 : 0.75))
      );
    }
  });

  const wheelSmokeIds = new Set(driftState.wheelSmokePuffs.map((puff) => puff.id));
  drift3d.wheelSmokeObjects.forEach((object3d, id) => {
    if (wheelSmokeIds.has(id)) return;
    drift3d.scene.remove(object3d);
    if (object3d.material) object3d.material.dispose?.();
    drift3d.wheelSmokeObjects.delete(id);
  });

  driftState.wheelSmokePuffs.forEach((puff) => {
    let smokeObject = drift3d.wheelSmokeObjects.get(puff.id);
    if (!smokeObject) {
      smokeObject = createDriftWheelSmokeObject();
      drift3d.scene.add(smokeObject);
      drift3d.wheelSmokeObjects.set(puff.id, smokeObject);
    }
    const sceneX = puff.x * drift3d.worldScale;
    const sceneZ = puff.y * drift3d.worldScale;
    const fade = puff.maxLife > 0 ? Math.max(0, puff.life / puff.maxLife) : 0;
    const scaleBase = Math.max(0.11, puff.size * drift3d.worldScale * (1 + (1 - fade) * 1.68));
    const spread = Number.isFinite(puff.spread) ? puff.spread : 0.2;
    const verticalStretch = Number.isFinite(puff.verticalStretch) ? puff.verticalStretch : 1.1;
    const scaleX = scaleBase * (1 + spread * (1 - fade) * 0.55);
    const scaleY = scaleBase * (0.84 + verticalStretch * (1 - fade) * 0.34);
    smokeObject.position.set(sceneX, puff.height, sceneZ);
    smokeObject.scale.set(scaleX, scaleY, 1);
    if (smokeObject.material?.isMaterial) {
      smokeObject.material.color.setHex(
        Number.isFinite(puff.colorHex) ? puff.colorHex : ORION_DRIVE_SMOKE_DEFAULT.wheelColorHex
      );
      smokeObject.material.rotation = (Number.isFinite(puff.rotation) ? puff.rotation : 0) + (1 - fade) * (puff.spin || 0);
      smokeObject.material.opacity = Math.max(
        0,
        Math.min(0.4, puff.opacity * fade * (isDarkTheme ? 1 : 0.74))
      );
    }
  });

  const coinIds = new Set(driftState.coins.map((coin) => coin.id));
  drift3d.coinObjects.forEach((object3d, id) => {
    if (coinIds.has(id)) return;
    drift3d.scene.remove(object3d);
    if (object3d.geometry) object3d.geometry.dispose();
    if (object3d.material && object3d.material !== drift3d.coinMaterial) object3d.material.dispose();
    drift3d.coinObjects.delete(id);
  });

  driftState.coins.forEach((coin) => {
    let coinObject = drift3d.coinObjects.get(coin.id);
    if (!coinObject) {
      coinObject = createDriftCoinObject();
      drift3d.scene.add(coinObject);
      drift3d.coinObjects.set(coin.id, coinObject);
    }
    const sceneX = coin.x * drift3d.worldScale;
    const sceneZ = coin.y * drift3d.worldScale;
    const bob = Math.sin(driftState.runTime * coin.bobSpeed + coin.bobPhase) * coin.bobHeight;
    coinObject.position.set(sceneX, 0.94 + bob, sceneZ);
    if (coinObject.isSprite) {
      const coinScale = Math.max(1.8, coin.size * drift3d.worldScale * 0.86);
      coinObject.scale.set(coinScale, coinScale, 1);
      coinObject.material.rotation = 0;
    }
  });

  const obstacleIds = new Set(driftState.obstacles.map((obstacle) => obstacle.id));
  drift3d.obstacleObjects.forEach((object3d, id) => {
    if (obstacleIds.has(id)) return;
    drift3d.scene.remove(object3d);
    drift3d.obstacleObjects.delete(id);
  });

  driftState.obstacles.forEach((obstacle) => {
    let obstacleObject = drift3d.obstacleObjects.get(obstacle.id);
    if (!obstacleObject) {
      const obstacleType = obstacle.type === 'box' ? 'box' : 'cone';
      if (obstacleType === 'box') {
        if (drift3d.boxPrototype) {
          obstacleObject = drift3d.boxPrototype.clone(true);
        } else {
          obstacleObject = createFallbackBoxMesh();
        }
      } else if (drift3d.conePrototype) {
        obstacleObject = drift3d.conePrototype.clone(true);
      } else {
        obstacleObject = createFallbackConeMesh();
      }
      obstacleObject.userData.baseScale = obstacleObject.scale.clone();
      drift3d.scene.add(obstacleObject);
      drift3d.obstacleObjects.set(obstacle.id, obstacleObject);
    }
    const sceneX = obstacle.x * drift3d.worldScale;
    const sceneZ = obstacle.y * drift3d.worldScale;
    const obstacleType = obstacle.type === 'box' ? 'box' : 'cone';
    const baseSize = obstacleType === 'box' ? 42 : 36;
    const scaleMultiplier = Math.max(0.68, obstacle.size / baseSize);
    if (obstacleObject.userData.baseScale) {
      obstacleObject.scale.copy(obstacleObject.userData.baseScale).multiplyScalar(scaleMultiplier);
    } else {
      obstacleObject.scale.setScalar(scaleMultiplier);
    }
    obstacleObject.position.x = sceneX;
    obstacleObject.position.z = sceneZ;
    obstacleObject.rotation.y = -obstacle.rotation;
  });
};

const renderOrionDriftFrame = () => {
  if (!driftCanvasEl) return;
  if (!ensureDriftThreeScene()) return;
  resolveDriftWorldSize();
  syncDriftThreeEntities();

  const isDarkTheme = document.documentElement.classList.contains('dark-theme');
  const themeKey = isDarkTheme ? 'dark' : 'light';
  if (drift3d.themeKey !== themeKey) {
    drift3d.themeKey = themeKey;
    const clearColor = isDarkTheme ? 0x111318 : 0xf0e6d4;
    const groundColor = isDarkTheme ? 0x1a1d22 : 0xe7dac3;
    const gridColor = isDarkTheme ? 0x2e3642 : 0x9f8e72;
    drift3d.renderer.setClearColor(clearColor, 1);
    drift3d.scene.fog = new THREE.Fog(clearColor, 30, 130);
    if (drift3d.ground?.material) drift3d.ground.material.color.setHex(groundColor);
    if (drift3d.grid) {
      drift3d.grid.material.color.setHex(gridColor);
      drift3d.grid.material.opacity = isDarkTheme ? 0.28 : 0.34;
    }
  }

  const carX = driftState.carX * drift3d.worldScale;
  const carZ = driftState.carY * drift3d.worldScale;
  const visualCarAngle = Number.isFinite(driftState.bodyAngle) ? driftState.bodyAngle : driftState.carAngle;
  const forwardX = Math.sin(visualCarAngle);
  const forwardZ = -Math.cos(visualCarAngle);
  const sideX = Math.cos(visualCarAngle);
  const sideZ = Math.sin(visualCarAngle);
  const speedAbs = Math.abs(driftState.speed);
  const speedRatio = Math.max(0, Math.min(1, speedAbs / 620));
  const yaw = Math.atan2(forwardX, forwardZ);

  drift3d.carRoot.position.set(carX, 0.08, carZ);
  drift3d.carRoot.rotation.y = yaw;
  const visualSteerTarget = Math.max(-0.62, Math.min(0.62, driftState.steerAngle * 1.1));
  drift3d.steerVisual += (visualSteerTarget - drift3d.steerVisual) * 0.22;
  const wheelTurnAngle = Math.max(-0.48, Math.min(0.48, drift3d.steerVisual));
  drift3d.frontWheels.forEach((wheel) => {
    wheel.node.rotation.y = wheel.baseY - wheelTurnAngle;
  });

  const beamAlpha = (driftState.isRunning ? 0.9 : 0.5) * (0.55 + Math.min(0.45, speedAbs / 640));
  drift3d.headlights.forEach((light) => {
    light.intensity = (isDarkTheme ? 4.4 : 3.2) * beamAlpha;
    light.distance = 22 + Math.min(24, speedAbs * 0.07);
  });

  const brakeInput = driftState.isRunning ? Math.max(0, -resolveDriftThrottleInput()) : 0;
  const brakeStrength = Math.min(1, brakeInput * (speedAbs > 10 ? 1 : 0.7));
  drift3d.brakeLights.forEach((light) => {
    light.intensity = 0.18 + brakeStrength * 2.2;
  });
  const isReversePreparing = driftState.isRunning
    && driftState.shiftTargetDirection < 0
    && driftState.shiftDelayTimer > 0
    && Math.abs(driftState.speed) < 1.5;
  const isReverseEngaged = driftState.isRunning && driftState.gearDirection < 0;
  const reverseStrength = isReversePreparing ? 0.35 : isReverseEngaged ? 0.22 : 0;
  drift3d.reverseLights.forEach((light) => {
    light.intensity = reverseStrength;
  });

  const steerBlend = Math.min(1, 0.035 + speedRatio * 0.06);
  driftState.cameraSteer += (driftState.lastSteerInput - driftState.cameraSteer) * steerBlend;
  const lateralShift = driftState.cameraSteer * (0.08 + speedRatio * 0.24);
  const lookAhead = 5.6 + speedRatio * 9.4;
  const followDistance = 6.8 + speedRatio * 1.6;
  const cameraHeight = 3.9 + speedRatio * 1.0;
  const reverseBlend = (1 - driftState.cameraDriveDirection) * 0.5;
  const baseCameraHeading = Number.isFinite(driftState.cameraHeading)
    ? driftState.cameraHeading
    : visualCarAngle;
  const cameraHeading = baseCameraHeading + driftState.cameraDriftYaw * 0.72 + reverseBlend * Math.PI;
  const cameraForwardX = Math.sin(cameraHeading);
  const cameraForwardZ = -Math.cos(cameraHeading);
  const cameraSideX = Math.cos(cameraHeading);
  const cameraSideZ = Math.sin(cameraHeading);
  const desiredCamera = new THREE.Vector3(
    carX - cameraForwardX * followDistance + cameraSideX * lateralShift + driftState.cameraShakeX * 0.012,
    cameraHeight,
    carZ - cameraForwardZ * followDistance + cameraSideZ * lateralShift + driftState.cameraShakeY * 0.012
  );
  const desiredLookAt = new THREE.Vector3(
    carX + cameraForwardX * lookAhead + cameraSideX * lateralShift * 0.34,
    0.82,
    carZ + cameraForwardZ * lookAhead + cameraSideZ * lateralShift * 0.34
  );
  const cameraLerp = Math.min(1, 0.045 + speedRatio * 0.09);
  drift3d.cameraPosition.lerp(desiredCamera, cameraLerp);
  drift3d.cameraLookAt.lerp(desiredLookAt, Math.min(1, cameraLerp * 1.15));
  const targetFov = 60 + speedRatio * 12;
  if (Math.abs(drift3d.camera.fov - targetFov) > 0.05) {
    drift3d.camera.fov += (targetFov - drift3d.camera.fov) * Math.min(1, cameraLerp * 0.9);
    drift3d.camera.updateProjectionMatrix();
  }
  drift3d.camera.position.copy(drift3d.cameraPosition);
  drift3d.camera.lookAt(drift3d.cameraLookAt);

  drift3d.renderer.render(drift3d.scene, drift3d.camera);
};

const ensureDriftAssets = () => {
  if (!driftCanvasEl) return;
  if (!ensureDriftThreeScene()) return;
  const carSrc = driftCanvasEl.dataset.carSrc || '';
  const coneSrc = driftCanvasEl.dataset.coneSrc || '';
  const boxSrc = driftCanvasEl.dataset.boxSrc || '';
  const orbSrc = driftCanvasEl.dataset.orbSrc || '';
  if (!boxSrc) driftState.boxReady = true;

  if (
    driftState.assetsLoading
    || (driftState.carReady && driftState.coneReady && driftState.boxReady && driftState.orbReady)
  ) return;
  driftState.assetsLoading = true;
  const tasks = [];

  const normalizeLoadedModel = (object3d, targetSize) => {
    object3d.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = false;
      if (node.material) {
        node.material.metalness = Math.min(0.65, node.material.metalness ?? 0.12);
        node.material.roughness = Math.max(0.28, node.material.roughness ?? 0.62);
      }
    });
    const box = new THREE.Box3().setFromObject(object3d);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    const scaleFactor = targetSize / maxDimension;
    object3d.scale.multiplyScalar(scaleFactor);
    box.setFromObject(object3d);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object3d.position.sub(center);
    box.setFromObject(object3d);
    object3d.position.y -= box.min.y;
  };

  const finish = () => {
    driftState.assetsLoading = false;
    renderOrionDriftFrame();
  };

  if (!driftState.carReady && carSrc) {
    tasks.push(new Promise((resolve) => {
      drift3d.loader.load(carSrc, (gltf) => {
        const carScene = gltf.scene || gltf.scenes?.[0];
        if (carScene && drift3d.carRoot) {
          normalizeLoadedModel(carScene, 2.7);
          if (drift3d.carVisual) drift3d.carRoot.remove(drift3d.carVisual);
          if (drift3d.carFallback) drift3d.carRoot.remove(drift3d.carFallback);
          drift3d.carVisual = carScene;
          drift3d.carRoot.add(carScene);
          drift3d.frontWheels = [];
          drift3d.steerVisual = 0;
          carScene.traverse((node) => {
            const nodeName = String(node.name || '').toLowerCase();
            if (!nodeName.includes('wheel') || !nodeName.includes('front')) return;
            drift3d.frontWheels.push({
              node,
              baseY: node.rotation.y
            });
          });
          alignDriftCarLights(carScene);
        }
        driftState.carReady = true;
        resolve();
      }, undefined, () => {
        driftState.carReady = true;
        resolve();
      });
    }));
  }

  if (!driftState.coneReady && coneSrc) {
    tasks.push(new Promise((resolve) => {
      drift3d.loader.load(coneSrc, (gltf) => {
        const coneScene = gltf.scene || gltf.scenes?.[0];
        if (coneScene) {
          normalizeLoadedModel(coneScene, 1.05);
          drift3d.conePrototype = coneScene;
        }
        driftState.coneReady = true;
        resolve();
      }, undefined, () => {
        driftState.coneReady = true;
        resolve();
      });
    }));
  }

  if (!driftState.boxReady && boxSrc) {
    tasks.push(new Promise((resolve) => {
      drift3d.loader.load(boxSrc, (gltf) => {
        const boxScene = gltf.scene || gltf.scenes?.[0];
        if (boxScene) {
          normalizeLoadedModel(boxScene, 1.18);
          drift3d.boxPrototype = boxScene;
        }
        driftState.boxReady = true;
        resolve();
      }, undefined, () => {
        driftState.boxReady = true;
        resolve();
      });
    }));
  }

  if (!driftState.orbReady && orbSrc) {
    tasks.push(new Promise((resolve) => {
      drift3d.textureLoader.load(orbSrc, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, drift3d.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
        texture.needsUpdate = true;
        drift3d.coinTexture = texture;
        drift3d.coinMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false
        });
        driftState.orbReady = true;
        resolve();
      }, undefined, () => {
        driftState.orbReady = true;
        resolve();
      });
    }));
  }

  if (!tasks.length) {
    finish();
    return;
  }
  Promise.all(tasks).finally(finish);
};

const resetOrionDriftRound = () => {
  driftState.score = 0;
  driftState.scoreRaw = 0;
  driftState.multiplier = 1;
  driftState.orbs = 0;
  driftState.earnedCents = 0;
  driftState.rewardLogged = false;
  driftState.runTime = 0;
  driftState.speed = 0;
  driftState.carX = 0;
  driftState.carY = 0;
  driftState.carAngle = 0;
  driftState.bodyAngle = 0;
  driftState.steerAngle = 0;
  driftState.yawRate = 0;
  driftState.driftSlipVelocity = 0;
  driftState.cameraX = 0;
  driftState.cameraY = 0;
  driftState.prevCameraX = 0;
  driftState.prevCameraY = 0;
  driftState.cameraShakeX = 0;
  driftState.cameraShakeY = 0;
  driftState.backgroundScroll = 0;
  driftState.backgroundFlowSpeed = 0;
  driftState.driftCharge = 0;
  driftState.driftTime = 0;
  driftState.coins = [];
  driftState.obstacles = [];
  driftState.particles = [];
  driftState.tireTracks = [];
  driftState.trackSpawnCarry = 0;
  driftState.trackIdSeed = 0;
  driftState.exhaustPuffs = [];
  driftState.exhaustSpawnTimer = 0;
  driftState.exhaustIdSeed = 0;
  driftState.wheelSmokePuffs = [];
  driftState.wheelSmokeSpawnCarry = 0;
  driftState.wheelSmokeIdSeed = 0;
  driftState.coinSpawnTimer = 0.5;
  driftState.obstacleSpawnTimer = 0.9;
  driftState.hitCooldown = 0;
  driftState.lastTimestamp = performance.now();
  driftState.steerDirection = 0;
  driftState.throttleDirection = 0;
  driftState.touchSteerDirection = 0;
  driftState.touchThrottleDirection = 0;
  driftState.keyLeft = false;
  driftState.keyRight = false;
  driftState.keyGas = false;
  driftState.keyBrake = false;
  driftState.keyHandbrake = false;
  driftState.lastSteerInput = 0;
  driftState.cameraSteer = 0;
  driftState.cameraDriveDirection = 1;
  driftState.cameraHeading = 0;
  driftState.cameraDriftYaw = 0;
  driftState.gearDirection = 1;
  driftState.shiftTargetDirection = 0;
  driftState.shiftDelayTimer = 0;
  for (let i = 0; i < 10; i += 1) spawnDriftCoin(140, 900);
  for (let i = 0; i < 8; i += 1) spawnDriftObstacle(190, 1200);
  syncDriftControlButtons();
  updateDriftHud();
  renderOrionDriftFrame();
};

const stopOrionDrift = (reason = 'finished') => {
  const hasProgress = driftState.score > 0 || driftState.orbs > 0 || driftState.earnedCents > 0;
  const shouldHandle = driftState.isRunning || ((reason === 'switch' || reason === 'restart') && hasProgress);
  if (!shouldHandle) return;

  driftState.isRunning = false;
  if (driftState.rafId) {
    window.cancelAnimationFrame(driftState.rafId);
    driftState.rafId = null;
  }
  if (app.orionDriftAnimationFrame) {
    window.cancelAnimationFrame(app.orionDriftAnimationFrame);
    app.orionDriftAnimationFrame = null;
  }

  commitDriftReward();
  if (driftState.score > driftState.best) {
    driftState.best = driftState.score;
    saveDriftBest();
  }

  if (driftPanelEl) driftPanelEl.classList.remove('is-running');
  if (driftStartBtn) driftStartBtn.textContent = 'Старт';

  if (reason === 'switch') {
    setDriftStatus('Режим призупинено. Повернись в Nymo Drive, щоб продовжити поїздку.');
  } else if (reason !== 'restart') {
    setDriftStatus(`Сесію завершено. Очки: ${Math.floor(driftState.score)}. Орби: ${driftState.orbs}. Зароблено: ${app.formatCoinBalance(driftState.earnedCents)}.`);
  }

  syncDriftControlButtons();
  updateDriftHud();
  renderOrionDriftFrame();
};

const stepOrionDrift = (timestamp) => {
  if (!driftState.isRunning) return;
  if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || resolveCurrentMiniGameView() !== 'drift') {
    stopOrionDrift('switch');
    return;
  }

  const elapsedSeconds = Math.min(1 / 30, Math.max(0, (timestamp - driftState.lastTimestamp) / 1000));
  driftState.lastTimestamp = timestamp;
  driftState.runTime += elapsedSeconds;
  driftState.hitCooldown = Math.max(0, driftState.hitCooldown - elapsedSeconds);
  if (!Number.isFinite(driftState.bodyAngle)) driftState.bodyAngle = driftState.carAngle;
  if (!Number.isFinite(driftState.cameraHeading)) driftState.cameraHeading = driftState.bodyAngle;
  if (!Number.isFinite(driftState.cameraDriftYaw)) driftState.cameraDriftYaw = 0;

  const steerInput = resolveDriftSteerInput();
  const throttleInput = resolveDriftThrottleInput();
  const handbrakeRequested = driftState.keyHandbrake;
  const carPhysics = app.getOrionDriveCarPhysics(app.user?.equippedDriveCar || '');
  driftState.lastSteerInput = Math.max(-1, Math.min(1, steerInput));
  syncDriftControlButtons();

  const desiredDirection = throttleInput > 0 ? 1 : throttleInput < 0 ? -1 : 0;
  const isShiftRequested = desiredDirection !== 0 && desiredDirection !== driftState.gearDirection;
  const isNearlyStopped = Math.abs(driftState.speed) < 8;

  if (isShiftRequested) {
    driftState.shiftTargetDirection = desiredDirection;
    if (!isNearlyStopped) {
      driftState.shiftDelayTimer = DRIFT_SHIFT_DELAY_SECONDS;
      const shiftBrakeForce = carPhysics.shiftBrakeForce;
      if (driftState.speed > 0) {
        driftState.speed = Math.max(0, driftState.speed - shiftBrakeForce * elapsedSeconds);
      } else {
        driftState.speed = Math.min(0, driftState.speed + shiftBrakeForce * elapsedSeconds);
      }
    } else {
      driftState.speed = 0;
      if (driftState.shiftDelayTimer <= 0) {
        driftState.shiftDelayTimer = DRIFT_SHIFT_DELAY_SECONDS;
      }
      driftState.shiftDelayTimer = Math.max(0, driftState.shiftDelayTimer - elapsedSeconds);
      if (driftState.shiftDelayTimer <= 0) {
        driftState.gearDirection = desiredDirection;
        driftState.shiftTargetDirection = 0;
      }
    }
  } else {
    if (driftState.shiftTargetDirection !== 0) {
      driftState.shiftTargetDirection = 0;
      driftState.shiftDelayTimer = 0;
    }

    if (desiredDirection === 0) {
      const coastingDrag = handbrakeRequested ? 1.95 : 0.22;
      driftState.speed *= Math.exp(-coastingDrag * elapsedSeconds);
      if (Math.abs(driftState.speed) < 0.35) driftState.speed = 0;
    } else if (desiredDirection > 0) {
      if (driftState.speed < 0) driftState.speed += carPhysics.transitionBrake * elapsedSeconds;
      driftState.speed += handbrakeRequested ? 130 * elapsedSeconds : carPhysics.forwardAccel * elapsedSeconds;
    } else {
      if (driftState.speed > 0) driftState.speed -= carPhysics.transitionBrake * elapsedSeconds;
      driftState.speed -= carPhysics.reverseAccel * elapsedSeconds;
    }
  }

  const maxForward = carPhysics.maxForward;
  const maxReverse = carPhysics.maxReverse;
  driftState.speed = Math.max(-maxReverse, Math.min(maxForward, driftState.speed));

  let speedAbs = Math.abs(driftState.speed);
  const handbrakeActive = handbrakeRequested && driftState.gearDirection >= 0 && speedAbs > 5;
  if (handbrakeActive) {
    const handbrakeDrag = 1.35 + Math.min(1.45, speedAbs / 300);
    driftState.speed *= Math.exp(-handbrakeDrag * elapsedSeconds);
    speedAbs = Math.abs(driftState.speed);
  }
  const speedRatio = Math.max(0, Math.min(1, speedAbs / Math.max(560, maxForward)));
  const throttleActive = Math.abs(throttleInput) > 0.08;
  const idleExhaust = !throttleActive && speedAbs < 5;
  const coastExhaust = !throttleActive && speedAbs >= 5;
  driftState.exhaustSpawnTimer = Math.max(0, driftState.exhaustSpawnTimer - elapsedSeconds);
  if (!throttleActive && (idleExhaust || coastExhaust)) {
    if (driftState.exhaustSpawnTimer <= 0) {
      const exhaustForwardX = Math.sin(driftState.bodyAngle);
      const exhaustForwardY = -Math.cos(driftState.bodyAngle);
      const exhaustSideX = Math.cos(driftState.bodyAngle);
      const exhaustSideY = Math.sin(driftState.bodyAngle);
      const puffStrength = idleExhaust ? 0.16 : 0.07;
      const emitterOffsets = [-driftState.exhaustSideOffset, driftState.exhaustSideOffset];
      emitterOffsets.forEach((offset) => {
        const exhaustX = driftState.carX
          - exhaustForwardX * driftState.exhaustRearOffset
          + exhaustSideX * offset;
        const exhaustY = driftState.carY
          - exhaustForwardY * driftState.exhaustRearOffset
          + exhaustSideY * offset;
        addDriftExhaustPuff(exhaustX, exhaustY, driftState.bodyAngle, puffStrength, speedAbs);
      });
      driftState.exhaustSpawnTimer = idleExhaust
        ? 0.11 + Math.random() * 0.06
        : 0.2 + Math.random() * 0.1;
    }
  } else {
    driftState.exhaustSpawnTimer = 0;
  }
  const cameraDirectionTarget = driftState.speed <= -8
    ? -1
    : driftState.speed >= 8
      ? 1
      : driftState.cameraDriveDirection;
  driftState.cameraDriveDirection += (cameraDirectionTarget - driftState.cameraDriveDirection)
    * Math.min(1, elapsedSeconds * 6.2);
  const targetBackgroundSpeed = speedAbs * 0.42;
  const backgroundLerp = Math.min(1, elapsedSeconds * (throttleInput === 0 ? 2.4 : 4));
  driftState.backgroundFlowSpeed += (targetBackgroundSpeed - driftState.backgroundFlowSpeed) * backgroundLerp;
  driftState.backgroundScroll = (driftState.backgroundScroll + driftState.backgroundFlowSpeed * elapsedSeconds) % 20000;
  const steerSpeedPenalty = Math.max(0, Math.min(1, speedAbs / Math.max(560, maxForward)));
  const maxSteerAngle = (36 - steerSpeedPenalty * 14) * (Math.PI / 180);
  const targetSteerAngle = steerInput * maxSteerAngle;
  const steerResponse = 10.2 - steerSpeedPenalty * 2.1;
  driftState.steerAngle += (targetSteerAngle - driftState.steerAngle) * Math.min(1, elapsedSeconds * steerResponse);

  const wheelBase = Math.max(56, Math.round(driftState.worldHeight * 0.11));
  const baseGripFactor = 1 - Math.max(0, Math.min(0.52, (speedAbs - 170) / 620));
  const handbrakeGripPenalty = handbrakeActive ? Math.min(0.42, 0.18 + speedAbs / 760) : 0;
  const gripFactor = Math.max(0.16, baseGripFactor - handbrakeGripPenalty);
  const steerAuthority = 2.35 - steerSpeedPenalty * 0.3;
  const targetYawRate = (driftState.speed / wheelBase) * Math.tan(driftState.steerAngle) * gripFactor * steerAuthority;
  const yawResponse = 10.8 - steerSpeedPenalty * 1.6;
  driftState.yawRate += (targetYawRate - driftState.yawRate) * Math.min(1, elapsedSeconds * yawResponse);

  const steerNormalized = maxSteerAngle > 0.001 ? Math.abs(driftState.steerAngle) / maxSteerAngle : 0;
  const steerAbs = Math.abs(steerInput);
  const driftSpeedFactor = Math.max(0, Math.min(1, (speedAbs - 102) / 260));
  const driftSteerFactor = Math.max(0, Math.min(1, (steerAbs - 0.24) / 0.5));
  const driftThrottleFactor = throttleInput > 0 ? 1 : 0.68;
  let driftIntentStrength = desiredDirection >= 0
    ? driftSpeedFactor * driftSteerFactor * driftThrottleFactor
    : 0;
  if (handbrakeActive) {
    const handbrakeBoost = (0.22 + Math.min(0.46, speedAbs / 300)) * Math.max(0.28, steerAbs);
    driftIntentStrength += handbrakeBoost;
  }
  driftIntentStrength = Math.max(0, Math.min(1.45, driftIntentStrength));
  const driftIntent = driftIntentStrength > 0.04;
  const steadyCornerSlip = Math.sign(steerInput) * speedAbs * steerNormalized * 0.02;
  const handbrakeSlipBoost = handbrakeActive ? 0.16 : 0;
  const driftSlipTarget = Math.sign(steerInput) * speedAbs * (0.055 + driftIntentStrength * 0.23 + handbrakeSlipBoost);
  const slipTarget = driftIntent ? driftSlipTarget : steadyCornerSlip;
  const slipBuild = 2.5 + driftIntentStrength * 5.6 + steerSpeedPenalty * 0.9;
  driftState.driftSlipVelocity += (slipTarget - driftState.driftSlipVelocity) * Math.min(1, elapsedSeconds * slipBuild);
  const counterSteer = steerAbs > 0.08 && Math.sign(steerInput) !== Math.sign(driftState.driftSlipVelocity);
  if (!driftIntent || steerAbs < 0.08) {
    const slipDamping = counterSteer ? (9.4 + steerSpeedPenalty * 2.4) : (6.2 + steerSpeedPenalty * 1.8);
    driftState.driftSlipVelocity *= Math.exp(-elapsedSeconds * slipDamping);
  }

  const slipRatio = speedAbs > 1
    ? Math.min(1.2, Math.abs(driftState.driftSlipVelocity) / Math.max(42, speedAbs * 0.62))
    : 0;
  const yawSlipAssist = (driftState.driftSlipVelocity / Math.max(108, speedAbs * 0.9))
    * (1.5 + driftIntentStrength * 4.8 + (handbrakeActive ? 2 : 0));
  driftState.yawRate += yawSlipAssist * elapsedSeconds;
  driftState.yawRate *= Math.exp(-elapsedSeconds * (0.52 + (1 - driftIntentStrength) * 0.24 + steerSpeedPenalty * 0.16));
  driftState.carAngle += driftState.yawRate * elapsedSeconds;
  const slipVisualStrength = Math.min(1, Math.abs(driftState.driftSlipVelocity) / Math.max(120, speedAbs * 0.85));
  const maxBodySlipAngle = (8 + speedRatio * 12 + driftIntentStrength * 24) * (Math.PI / 180);
  const slipVisualAngle = Math.max(
    -maxBodySlipAngle,
    Math.min(
      maxBodySlipAngle,
      (driftState.driftSlipVelocity / Math.max(128, speedAbs * 0.88)) * (0.38 + slipVisualStrength * 1.02)
    )
  );
  const bodyTargetAngle = driftState.carAngle + slipVisualAngle;
  const bodyAngleDelta = Math.atan2(
    Math.sin(bodyTargetAngle - driftState.bodyAngle),
    Math.cos(bodyTargetAngle - driftState.bodyAngle)
  );
  const bodyFollowSpeed = Math.min(1, elapsedSeconds * (5.2 + speedRatio * 4.6 + driftIntentStrength * 3.8));
  driftState.bodyAngle += bodyAngleDelta * bodyFollowSpeed;
  const cameraDriftYawTargetRaw = Math.max(
    -0.34,
    Math.min(
      0.34,
      (driftState.driftSlipVelocity / Math.max(170, speedAbs * 1.08)) * (0.16 + driftIntentStrength * 0.34)
    )
  );
  const cameraDriftYawTarget = Math.abs(cameraDriftYawTargetRaw) < 0.008 ? 0 : cameraDriftYawTargetRaw;
  const cameraDriftYawLerp = Math.min(1, elapsedSeconds * (2.1 + driftIntentStrength * 3.2));
  driftState.cameraDriftYaw += (cameraDriftYawTarget - driftState.cameraDriftYaw) * cameraDriftYawLerp;
  const cameraHeadingDelta = Math.atan2(
    Math.sin(driftState.bodyAngle - driftState.cameraHeading),
    Math.cos(driftState.bodyAngle - driftState.cameraHeading)
  );
  const cameraHeadingFollow = Math.min(1, elapsedSeconds * (1.5 + speedRatio * 1.2));
  driftState.cameraHeading += cameraHeadingDelta * cameraHeadingFollow;

  const isDrifting = speedAbs > 102 && driftIntentStrength > 0.2 && slipRatio > 0.14;
  if (isDrifting) {
    driftState.driftTime += elapsedSeconds;
    driftState.driftCharge = Math.min(1, driftState.driftCharge + elapsedSeconds * 0.72);
  } else {
    driftState.driftTime = Math.max(0, driftState.driftTime - elapsedSeconds * 2.4);
    driftState.driftCharge = Math.max(0, driftState.driftCharge - elapsedSeconds * 0.52);
  }

  const targetMultiplier = isDrifting ? Math.min(5, 1 + driftState.driftCharge * 2.6) : 1;
  driftState.multiplier += (targetMultiplier - driftState.multiplier) * Math.min(1, elapsedSeconds * 8);

  const forwardX = Math.sin(driftState.carAngle);
  const forwardY = -Math.cos(driftState.carAngle);
  const sideX = Math.cos(driftState.carAngle);
  const sideY = Math.sin(driftState.carAngle);
  driftState.carX += forwardX * driftState.speed * elapsedSeconds;
  driftState.carY += forwardY * driftState.speed * elapsedSeconds;
  const sideSlip = driftState.driftSlipVelocity * (0.2 + driftState.driftCharge * 0.46);
  driftState.carX += sideX * sideSlip * elapsedSeconds;
  driftState.carY += sideY * sideSlip * elapsedSeconds;
  if (isDrifting || driftIntentStrength > 0.16) {
    addDriftParticles(
      driftState.carX - sideX * 26,
      driftState.carY - sideY * 26,
      isDrifting ? 4 : 2
    );
  }

  const carHitRadius = Math.max(22, Math.round(driftState.worldHeight * 0.045));
  for (let i = driftState.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = driftState.obstacles[i];
    const dx = driftState.carX - obstacle.x;
    const dy = driftState.carY - obstacle.y;
    const obstacleRadius = obstacle.size * (obstacle.type === 'box' ? 0.38 : 0.32);
    const hitDistance = carHitRadius + obstacleRadius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > hitDistance * hitDistance) continue;

    const distance = Math.max(0.001, Math.sqrt(distanceSquared));
    const normalX = dx / distance;
    const normalY = dy / distance;
    const overlap = hitDistance - distance;
    driftState.carX += normalX * overlap;
    driftState.carY += normalY * overlap;
    driftState.speed *= -0.16;
    driftState.driftSlipVelocity *= -0.24;
    if (Math.abs(driftState.speed) < 18) driftState.speed = 0;
    driftState.yawRate += (Math.random() - 0.5) * 1.2;
    driftState.scoreRaw = Math.max(0, driftState.scoreRaw - 18);
    addDriftParticles(obstacle.x, obstacle.y, 12, 'rgba(255, 148, 96, 0.86)');
    driftState.cameraShakeX += normalX * 2.1;
    driftState.cameraShakeY += normalY * 2.1;
    if (driftState.hitCooldown <= 0) {
      setDriftStatus('Удар об перешкоду! Обережніше на швидкості.');
      driftState.hitCooldown = 1.05;
    }
    driftState.obstacles.splice(i, 1);
    driftState.obstacleSpawnTimer = Math.min(driftState.obstacleSpawnTimer, 0.35);
  }

  const visualForwardX = Math.sin(driftState.bodyAngle);
  const visualForwardY = -Math.cos(driftState.bodyAngle);
  const visualSideX = Math.cos(driftState.bodyAngle);
  const visualSideY = Math.sin(driftState.bodyAngle);
  const rearOffset = driftState.trackRearOffset;
  const wheelOffset = driftState.trackWheelOffset;
  const trackWidth = driftState.trackMarkWidth;
  const trackLength = driftState.trackMarkLength;
  const rearX = driftState.carX - visualForwardX * rearOffset;
  const rearY = driftState.carY - visualForwardY * rearOffset;
  const leftWheelX = rearX - visualSideX * wheelOffset;
  const leftWheelY = rearY - visualSideY * wheelOffset;
  const rightWheelX = rearX + visualSideX * wheelOffset;
  const rightWheelY = rearY + visualSideY * wheelOffset;
  const burnoutActive = handbrakeRequested && throttleInput > 0.24 && speedAbs < 96;
  const wheelSlipLevel = Math.min(
    1.35,
    slipRatio
      + driftIntentStrength * 0.86
      + (handbrakeActive ? 0.34 : 0)
      + (burnoutActive ? 0.42 : 0)
  );
  const shouldLeaveTracks = speedAbs > 42
    && (isDrifting || handbrakeActive || driftIntentStrength > 0.12 || throttleInput < 0 || (Math.abs(steerInput) > 0.26 && speedAbs > 88));
  if (shouldLeaveTracks) {
    const driftTrackBoost = Math.min(0.7, driftIntentStrength * 1.1);
    const intensity = isDrifting
      ? 1
      : Math.min(1, 0.62 + driftTrackBoost + Math.min(0.26, speedAbs / 680));
    const trackSpawnRate = isDrifting ? 74 : (30 + driftIntentStrength * 26);
    driftState.trackSpawnCarry += elapsedSeconds * trackSpawnRate * Math.min(2.4, speedAbs / 180);
    while (driftState.trackSpawnCarry >= 1) {
      driftState.trackSpawnCarry -= 1;
      addDriftTrackMark(leftWheelX, leftWheelY, driftState.bodyAngle, intensity, trackWidth, trackLength);
      addDriftTrackMark(rightWheelX, rightWheelY, driftState.bodyAngle, intensity, trackWidth, trackLength);
    }
  } else {
    driftState.trackSpawnCarry = Math.max(0, driftState.trackSpawnCarry - elapsedSeconds * 5);
  }

  const shouldEmitWheelSmoke = wheelSlipLevel > 0.1 && (speedAbs > 28 || burnoutActive);
  if (shouldEmitWheelSmoke) {
    const smokeRate = (isDrifting ? 46 : burnoutActive ? 36 : 24) * (0.58 + wheelSlipLevel * 0.82);
    driftState.wheelSmokeSpawnCarry += elapsedSeconds * smokeRate;
    while (driftState.wheelSmokeSpawnCarry >= 1) {
      driftState.wheelSmokeSpawnCarry -= 1;
      const smokeStrength = Math.min(
        1.25,
        0.24
          + wheelSlipLevel * 0.58
          + (isDrifting ? 0.22 : 0)
          + (burnoutActive ? 0.3 : 0)
      );
      addDriftWheelSmokeCluster(
        leftWheelX,
        leftWheelY,
        driftState.bodyAngle,
        smokeStrength,
        speedAbs,
        burnoutActive,
        -1
      );
      addDriftWheelSmokeCluster(
        rightWheelX,
        rightWheelY,
        driftState.bodyAngle,
        smokeStrength,
        speedAbs,
        burnoutActive,
        1
      );
      if (smokeStrength > 0.72 || burnoutActive) {
        addDriftWheelSmokePuff(rearX, rearY, driftState.bodyAngle, smokeStrength, speedAbs, burnoutActive, {
          alongOffset: 0.42 + Math.random() * 0.3,
          sideOffset: (Math.random() * 2 - 1) * (wheelOffset * 0.42),
          heightBoost: 0.06 + Math.random() * 0.03,
          spreadBoost: 0.22 + smokeStrength * 0.16,
          sizeBoost: 1.4 + smokeStrength * 0.88,
          opacityBoost: 0.03,
          lifeBoost: 0.16,
          riseBoost: 0.08,
          swirlBoost: 0.16
        });
      }
    }
  } else {
    driftState.wheelSmokeSpawnCarry = Math.max(0, driftState.wheelSmokeSpawnCarry - elapsedSeconds * 6);
  }

  const previousCameraX = driftState.cameraX;
  const previousCameraY = driftState.cameraY;
  const cameraLookAhead = Math.min(160, speedAbs * 0.22);
  const movementSign = driftState.speed >= 0 ? 1 : -1;
  const cameraTargetHeading = driftState.cameraHeading + driftState.cameraDriftYaw * 0.35;
  const cameraForwardX = Math.sin(cameraTargetHeading);
  const cameraForwardY = -Math.cos(cameraTargetHeading);
  const cameraTargetX = driftState.carX + cameraForwardX * cameraLookAhead * movementSign;
  const cameraTargetY = driftState.carY + cameraForwardY * cameraLookAhead * movementSign;
  const camLerp = Math.min(1, elapsedSeconds * (5.2 + speedAbs / 240));
  driftState.cameraX += (cameraTargetX - driftState.cameraX) * camLerp;
  driftState.cameraY += (cameraTargetY - driftState.cameraY) * camLerp;
  driftState.prevCameraX = previousCameraX;
  driftState.prevCameraY = previousCameraY;
  const shakeIntensity = Math.max(0, Math.min(1, (speedAbs - 190) / 280));
  if (shakeIntensity > 0.001) {
    const shakeAmplitude = 2.8 * shakeIntensity;
    const phaseBase = driftState.runTime * (22 + speedAbs * 0.03);
    const targetShakeX = (
      Math.sin(phaseBase * 1.09)
      + Math.sin(phaseBase * 2.03 + 1.2) * 0.36
    ) * shakeAmplitude * 0.62;
    const targetShakeY = (
      Math.cos(phaseBase * 0.98 + 0.8)
      + Math.sin(phaseBase * 1.74) * 0.34
    ) * shakeAmplitude * 0.84;
    const shakeLerp = Math.min(1, elapsedSeconds * 14);
    driftState.cameraShakeX += (targetShakeX - driftState.cameraShakeX) * shakeLerp;
    driftState.cameraShakeY += (targetShakeY - driftState.cameraShakeY) * shakeLerp;
  } else {
    const settleLerp = Math.min(1, elapsedSeconds * 12);
    driftState.cameraShakeX += (0 - driftState.cameraShakeX) * settleLerp;
    driftState.cameraShakeY += (0 - driftState.cameraShakeY) * settleLerp;
  }

  driftState.coinSpawnTimer -= elapsedSeconds;
  driftState.obstacleSpawnTimer -= elapsedSeconds;
  if (driftState.coinSpawnTimer <= 0) {
    spawnDriftCoin();
    driftState.coinSpawnTimer = 0.7 + Math.random() * 1.4;
  }
  if (driftState.obstacleSpawnTimer <= 0) {
    spawnDriftObstacle(230, 1200);
    driftState.obstacleSpawnTimer = 0.9 + Math.random() * 1.8;
  }

  const pickupReward = Math.max(2, Math.ceil(app.getTapLevelStats().rewardPerTapCents * 0.6));
  for (let i = driftState.coins.length - 1; i >= 0; i -= 1) {
    const coin = driftState.coins[i];
    const dx = driftState.carX - coin.x;
    const dy = driftState.carY - coin.y;
    const pickupDistance = Math.max(48, coin.size * 0.85);
    if (dx * dx + dy * dy <= pickupDistance * pickupDistance) {
      driftState.coins.splice(i, 1);
      driftState.orbs += 1;
      addDriftReward(pickupReward);
      addDriftParticles(coin.x, coin.y, 9, 'rgba(64, 191, 255, 0.8)');
      driftState.coinSpawnTimer = Math.min(driftState.coinSpawnTimer, 0.25);
      continue;
    }
    if (dx * dx + dy * dy > 3_400_000) {
      driftState.coins.splice(i, 1);
    }
  }

  for (let i = driftState.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = driftState.obstacles[i];
    const dx = driftState.carX - obstacle.x;
    const dy = driftState.carY - obstacle.y;
    if (dx * dx + dy * dy > 8_600_000) {
      driftState.obstacles.splice(i, 1);
    }
  }

  driftState.particles.forEach((particle) => {
    particle.x += particle.vx * elapsedSeconds;
    particle.y += particle.vy * elapsedSeconds;
    particle.life -= elapsedSeconds;
  });
  driftState.particles = driftState.particles.filter((particle) => particle.life > 0);
  driftState.exhaustPuffs.forEach((puff) => {
    puff.x += puff.vx * elapsedSeconds;
    puff.y += puff.vy * elapsedSeconds;
    puff.height += puff.rise * elapsedSeconds;
    puff.vx *= Math.exp(-elapsedSeconds * 2.4);
    puff.vy *= Math.exp(-elapsedSeconds * 2.4);
    puff.life -= elapsedSeconds;
  });
  driftState.exhaustPuffs = driftState.exhaustPuffs.filter((puff) => puff.life > 0);
  driftState.wheelSmokePuffs.forEach((puff) => {
    puff.age = (puff.age || 0) + elapsedSeconds;
    const lifeProgress = puff.maxLife > 0 ? Math.max(0, 1 - (puff.life / puff.maxLife)) : 0;
    const swirl = Number.isFinite(puff.swirl) ? puff.swirl : 0.18;
    const noiseSpeed = Number.isFinite(puff.noiseSpeed) ? puff.noiseSpeed : 4;
    const noisePhase = (Number.isFinite(puff.noisePhase) ? puff.noisePhase : 0)
      + puff.age * noiseSpeed;
    const turbulence = swirl * (0.72 + lifeProgress * 0.94);
    puff.vx += Math.cos(noisePhase) * turbulence * elapsedSeconds;
    puff.vy += Math.sin(noisePhase * 0.92 + 0.7) * turbulence * elapsedSeconds;
    puff.x += puff.vx * elapsedSeconds;
    puff.y += puff.vy * elapsedSeconds;
    puff.height += puff.rise * elapsedSeconds;
    const drag = Number.isFinite(puff.drag) ? puff.drag : 3.1;
    const velocityDamping = Math.exp(-elapsedSeconds * drag);
    puff.vx *= velocityDamping;
    puff.vy *= velocityDamping;
    puff.life -= elapsedSeconds;
  });
  driftState.wheelSmokePuffs = driftState.wheelSmokePuffs.filter((puff) => puff.life > 0);
  driftState.tireTracks.forEach((track) => {
    track.life -= elapsedSeconds;
  });
  driftState.tireTracks = driftState.tireTracks.filter((track) => track.life > 0);

  driftState.scoreRaw += speedAbs * 0.055 * (isDrifting ? driftState.multiplier : 1) * elapsedSeconds;
  driftState.score = Math.max(0, Math.floor(driftState.scoreRaw));
  if (driftState.score > driftState.best) {
    driftState.best = driftState.score;
  }

  updateDriftHud();
  renderOrionDriftFrame();
  driftState.rafId = window.requestAnimationFrame(stepOrionDrift);
  app.orionDriftAnimationFrame = driftState.rafId;
};

const startOrionDrift = () => {
  if (!driftCanvasEl) return;
  resolveDriftWorldSize();
  ensureDriftAssets();
  stopOrionDrift('restart');
  resetOrionDriftRound();
  driftState.isRunning = true;
  driftState.lastTimestamp = performance.now();
  if (driftPanelEl) driftPanelEl.classList.add('is-running');
  if (driftStartBtn) driftStartBtn.textContent = 'Рестарт';
  setDriftStatus(getDriftRunningStatusText());
  driftState.rafId = window.requestAnimationFrame(stepOrionDrift);
  app.orionDriftAnimationFrame = driftState.rafId;
};



  return {
    updateDriftHud,
    setDriftStatus,
    syncMiniGameControlHints,
    syncDriftControlButtons,
    resolveDriftWorldSize,
    ensureDriftAssets,
    renderOrionDriftFrame,
    startOrionDrift,
    stopOrionDrift
  };
}
