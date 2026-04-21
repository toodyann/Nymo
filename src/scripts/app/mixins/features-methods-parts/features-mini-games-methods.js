import * as THREE from 'three';
import {
  flappyCoinSoundUrl,
  flappyWingSoundUrl,
  flappyDieSoundUrl,
  TAP_PERSONS_AVATAR_POOL,
  TAP_AUTO_AWAY_START_TS_KEY,
  TAP_AUTO_PENDING_REWARD_CENTS_KEY,
  TAP_AUTO_PENDING_REWARD_SECONDS_KEY,
  ORION_DRIVE_SMOKE_DEFAULT,
  createOrionDriveGltfLoader
} from '../features-parts/index.js';
import { ChatAppFeaturesShopMethods } from './features-shop-methods.js';
import { setupTapperAutoMiningRuntime } from '../mini-games-parts/tapper-auto-mining-runtime.js';
import { setupFlappyMiniGameRuntime } from '../mini-games-parts/flappy-runtime.js';
import { setupDriftMiniGameRuntime } from '../mini-games-parts/drift-runtime.js';
import { setupGrid2048MiniGameRuntime } from '../mini-games-parts/grid2048-runtime.js';
import { loadOrCreateTapSendersConfig } from '../mini-games-parts/tapper-senders-config.js';
import { setupMiniGameViewController } from '../mini-games-parts/mini-games-view-controller.js';
import { setupDriftControlsRuntime } from '../mini-games-parts/drift-controls-runtime.js';

export class ChatAppFeaturesMiniGamesMethods extends ChatAppFeaturesShopMethods {
  initMiniGames(settingsContainer) {
    const miniGamesSection = settingsContainer.querySelector('#mini-games');
    const tapperContentEl = settingsContainer.querySelector('[data-mini-game-panel="tapper"]');
    const miniGamesListEl = settingsContainer.querySelector('.mini-games-list');
    const balanceEl = settingsContainer.querySelector('#coinTapBalance');
    const tapBtn = settingsContainer.querySelector('#coinTapBtn');
    const levelIslandEl = settingsContainer.querySelector('.coin-level-island');
    const rateEl = settingsContainer.querySelector('.coin-tapper-rate');
    const levelValueEl = settingsContainer.querySelector('#coinTapLevelValue');
    const rewardValueEl = settingsContainer.querySelector('#coinTapRewardValue');
    const autoMenuToggleBtn = settingsContainer.querySelector('#coinTapAutoMenuToggle');
    const autoMenuCloseBtn = settingsContainer.querySelector('#coinTapAutoMenuClose');
    const autoBackdropEl = settingsContainer.querySelector('#coinTapAutoBackdrop');
    const autoMiningContainerEl = settingsContainer.querySelector('#coinAutoMining');
    const autoMinersEl = settingsContainer.querySelector('#coinTapAutoMiners');
    const autoStatusTextEl = settingsContainer.querySelector('#coinTapAutoStatusText');
    const autoLastGainEl = settingsContainer.querySelector('#coinTapAutoLastGain');
    const autoPulseFillEl = settingsContainer.querySelector('#coinTapAutoPulseFill');
    const autoBuyBatchButtons = settingsContainer.querySelectorAll('[data-auto-buy-batch]');
    if (!miniGamesSection || !balanceEl || !tapBtn) return;

    const gameSelectButtons = settingsContainer.querySelectorAll('[data-mini-game-select]');
    const gamePanels = settingsContainer.querySelectorAll('[data-mini-game-panel]');

    if (miniGamesListEl && tapperContentEl && window.matchMedia('(max-width: 768px)').matches) {
      const miniGamesContentEl = tapperContentEl.parentElement;
      if (miniGamesContentEl && miniGamesListEl.parentElement === miniGamesContentEl) {
        miniGamesContentEl.insertBefore(miniGamesListEl, tapperContentEl.nextSibling);
      }
    }

    const MINI_GAME_VIEW_KEY = 'orionMiniGameView';
    const normalizeMiniGameView = (value) => {
      if (value === 'grid2048') return 'grid2048';
      if (value === 'flappy') return 'flappy';
      if (value === 'drift') return 'drift';
      return 'tapper';
    };
    const pendingMiniGameView = normalizeMiniGameView(this.pendingMiniGameView || 'tapper');
    let currentMiniGameView = pendingMiniGameView;
    if (!this.pendingMiniGameView) {
      try {
        currentMiniGameView = normalizeMiniGameView(window.localStorage.getItem(MINI_GAME_VIEW_KEY));
      } catch {
        currentMiniGameView = 'tapper';
      }
    }
    this.pendingMiniGameView = null;

    const gridPanelEl = settingsContainer.querySelector('[data-mini-game-panel="grid2048"]');
    const gridBoardEl = settingsContainer.querySelector('#grid2048Board');
    const gridCanvasEl = settingsContainer.querySelector('#grid2048Canvas');
    const gridScoreEl = settingsContainer.querySelector('#grid2048Score');
    const gridBestEl = settingsContainer.querySelector('#grid2048Best');
    const gridEarnedEl = settingsContainer.querySelector('#grid2048Earned');
    const gridReplayBtn = settingsContainer.querySelector('#grid2048Replay') || settingsContainer.querySelector('#grid2048Restart');
    const gridHintEl = gridPanelEl?.querySelector('.mini-game-hint');
    const flappyPanelEl = settingsContainer.querySelector('[data-mini-game-panel="flappy"]');
    const flappyCanvasWrapEl = settingsContainer.querySelector('#flappyOrionCanvasWrap');
    const flappyCanvasEl = settingsContainer.querySelector('#flappyOrionCanvas');
    const flappyBestEl = settingsContainer.querySelector('#flappyOrionBest');
    const flappyStartBtn = settingsContainer.querySelector('#flappyOrionStart');
    const driftPanelEl = settingsContainer.querySelector('[data-mini-game-panel="drift"]');
    const driftCanvasWrapEl = settingsContainer.querySelector('#orionDriftCanvasWrap');
    const driftCanvasEl = settingsContainer.querySelector('#orionDriftCanvas');
    const driftStatusEl = settingsContainer.querySelector('#orionDriftStatus');
    const driftScoreEl = settingsContainer.querySelector('#orionDriftScore');
    const driftMultiplierEl = settingsContainer.querySelector('#orionDriftMultiplier');
    const driftSpeedEl = settingsContainer.querySelector('#orionDriftSpeed');
    const driftOrbsEl = settingsContainer.querySelector('#orionDriftOrbs');
    const driftBestEl = settingsContainer.querySelector('#orionDriftBest');
    const driftStartBtn = settingsContainer.querySelector('#orionDriftStart');
    const driftSteerLeftBtn = settingsContainer.querySelector('#orionDriftSteerLeft');
    const driftSteerRightBtn = settingsContainer.querySelector('#orionDriftSteerRight');
    const driftGasBtn = settingsContainer.querySelector('#orionDriftGas');
    const driftBrakeBtn = settingsContainer.querySelector('#orionDriftBrake');
    if (driftCanvasEl) {
      if (!driftCanvasEl.dataset.defaultCarSrc) {
        driftCanvasEl.dataset.defaultCarSrc = driftCanvasEl.dataset.carSrc || '';
      }
      const equippedCarSrc = this.getOrionDriveCarAssetSrc(this.user?.equippedDriveCar || '');
      driftCanvasEl.dataset.carSrc = equippedCarSrc || driftCanvasEl.dataset.defaultCarSrc;
    }
    const GRID_2048_BEST_KEY = 'orionGrid2048Best';
    const FLAPPY_BEST_KEY = 'orionFlappyBest';
    const DRIFT_BEST_KEY = 'orionDriftBest';
    const FLAPPY_GRAVITY = 1120;
    const FLAPPY_FLAP_VELOCITY = -390;
    const FLAPPY_PIPE_SPEED = 240;
    const FLAPPY_PIPE_SPAWN_INTERVAL = 1.45;
    const FLAPPY_PIPE_WIDTH = 86;
    const FLAPPY_PIPE_GAP_BASE = 198;
    const FLAPPY_MAX_DT = 1 / 30;
    const DRIFT_SPEED_FACTOR = 0.32;
    const DRIFT_SHIFT_DELAY_SECONDS = 0.5;
    const AUTO_BUY_BATCH_KEY = 'orionTapAutoBuyBatch';
    const AUTO_MENU_OPEN_KEY = 'orionTapAutoMenuOpen';
    const AUTO_BUY_BATCH_VALUES = [1, 5, 10];
    const TAP_AUTO_SENDERS = loadOrCreateTapSendersConfig({
      avatarPool: TAP_PERSONS_AVATAR_POOL
    });
    const isMobileMiniGameViewport = () => window.matchMedia('(max-width: 768px)').matches;
    const getGridControlHintText = () => (
      isMobileMiniGameViewport()
        ? 'Керування: свайпи по полю.'
        : 'Керування: стрілки або W/A/S/D.'
    );
    const getDriftIdleStatusText = () => (
      isMobileMiniGameViewport()
        ? 'Натисни «Старт». Керування: кнопки ← →, Газ, Гальмо.'
        : 'Натисни «Старт». Керування: стрілки або W/A/S/D.'
    );
    const getDriftRunningStatusText = () => (
      isMobileMiniGameViewport()
        ? 'Відкритий режим: катайся вільно. Керування: кнопки ← →, Газ, Гальмо.'
        : 'Відкритий режим: катайся вільно. Керування: стрілки або W/A/S/D.'
    );
    const applyMiniGameContainerBackground = (view = currentMiniGameView) => {
      if (!settingsContainer) return;
      const isMobileViewport = isMobileMiniGameViewport();
      if (isMobileViewport) {
        settingsContainer.style.setProperty('background', 'transparent', 'important');
        settingsContainer.style.setProperty('background-color', 'transparent', 'important');
        return;
      }

      settingsContainer.style.setProperty('background', 'var(--bg-color)', 'important');
      settingsContainer.style.setProperty('background-color', 'var(--bg-color)', 'important');
    };
    const lockLandscapeForDrift = () => {
      if (!isMobileMiniGameViewport()) return;
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.lock !== 'function') return;
      orientationApi.lock('landscape').catch(() => {});
    };
    const lockPortraitForApp = () => {
      if (!isMobileMiniGameViewport()) return;
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.lock !== 'function') return;
      orientationApi.lock('portrait').catch(() => {});
    };
    const unlockOrientationIfAvailable = () => {
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.unlock !== 'function') return;
      try {
        orientationApi.unlock();
      } catch {
        // Ignore unsupported unlock errors.
      }
    };
    const flappyState = {
      isRunning: false,
      isDeathFalling: false,
      score: 0,
      coins: 0,
      best: 0,
      earnedCents: 0,
      rewardLogged: false,
      gameOver: false,
      worldWidth: 960,
      worldHeight: 540,
      birdY: 270,
      birdVelocity: 0,
      birdRotation: 0,
      pipes: [],
      pipeSpawnTimer: 0,
      groundOffset: 0,
      cloudOffset: 0,
      lastTimestamp: 0,
      rafId: null,
      spriteReady: false,
      coinReady: false,
      assetsLoading: false,
      spriteAtlas: null,
      spriteImage: null,
      coinImage: null,
      flapFrame: 0,
      flapFrameIndex: 0
    };
    const driftState = {
      isRunning: false,
      score: 0,
      scoreRaw: 0,
      multiplier: 1,
      orbs: 0,
      best: 0,
      earnedCents: 0,
      rewardLogged: false,
      worldWidth: 900,
      worldHeight: 540,
      cameraX: 0,
      cameraY: 0,
      prevCameraX: 0,
      prevCameraY: 0,
      cameraShakeX: 0,
      cameraShakeY: 0,
      backgroundScroll: 0,
      backgroundFlowSpeed: 0,
      runTime: 0,
      speed: 0,
      carX: 0,
      carY: 0,
      carAngle: 0,
      bodyAngle: 0,
      steerAngle: 0,
      yawRate: 0,
      driftSlipVelocity: 0,
      driftCharge: 0,
      driftTime: 0,
      coins: [],
      obstacles: [],
      particles: [],
      tireTracks: [],
      trackSpawnCarry: 0,
      trackIdSeed: 0,
      trackRearOffset: 18,
      trackWheelOffset: 8,
      trackMarkWidth: 2.2,
      trackMarkLength: 6.8,
      exhaustPuffs: [],
      exhaustSpawnTimer: 0,
      exhaustIdSeed: 0,
      wheelSmokePuffs: [],
      wheelSmokeSpawnCarry: 0,
      wheelSmokeIdSeed: 0,
      exhaustRearOffset: 16,
      exhaustSideOffset: 0,
      exhaustHeight: 0.16,
      coinSpawnTimer: 0,
      obstacleSpawnTimer: 0,
      hitCooldown: 0,
      lastTimestamp: 0,
      rafId: null,
      assetsLoading: false,
      carReady: false,
      coneReady: false,
      boxReady: false,
      orbReady: false,
      steerDirection: 0,
      throttleDirection: 0,
      touchSteerDirection: 0,
      touchThrottleDirection: 0,
      keyLeft: false,
      keyRight: false,
      keyGas: false,
      keyBrake: false,
      keyHandbrake: false,
      lastSteerInput: 0,
      cameraSteer: 0,
      cameraDriveDirection: 1,
      cameraHeading: 0,
      cameraDriftYaw: 0,
      gearDirection: 1,
      shiftTargetDirection: 0,
      shiftDelayTimer: 0,
      swipeStartX: 0,
      swipeStartY: 0
    };
    const drift3d = {
      scene: null,
      camera: null,
      renderer: null,
      ground: null,
      grid: null,
      carRoot: null,
      carVisual: null,
      carFallback: null,
      conePrototype: null,
      boxPrototype: null,
      coinTexture: null,
      coinMaterial: null,
      coinObjects: new Map(),
      trackGeometry: null,
      trackMaterial: null,
      trackObjects: new Map(),
      exhaustTexture: null,
      exhaustMaterial: null,
      exhaustObjects: new Map(),
      wheelSmokeTexture: null,
      wheelSmokeMaterial: null,
      wheelSmokeObjects: new Map(),
      obstacleObjects: new Map(),
      headlights: [],
      brakeLights: [],
      reverseLights: [],
      frontWheels: [],
      steerVisual: 0,
      cameraPosition: new THREE.Vector3(0, 10, 14),
      cameraLookAt: new THREE.Vector3(0, 0, 0),
      loader: createOrionDriveGltfLoader(),
      textureLoader: new THREE.TextureLoader(),
      themeKey: '',
      worldScale: 0.03,
      failed: false
    };
    const disposeDriftThreeContext = (context) => {
      if (!context) return;
      try {
        if (context.scene) {
          context.scene.traverse((node) => {
            if (node.isMesh || node.isSprite) {
              if (node.geometry) node.geometry.dispose();
              const materials = Array.isArray(node.material) ? node.material : [node.material];
              materials.forEach((material) => {
                if (!material || material === context.coinMaterial) return;
                Object.values(material).forEach((value) => {
                  if (value && value.isTexture) value.dispose();
                });
                material.dispose?.();
              });
            }
          });
        }
        context.coinMaterial?.dispose?.();
        context.coinTexture?.dispose?.();
        context.trackMaterial?.dispose?.();
        context.trackGeometry?.dispose?.();
        context.exhaustMaterial?.dispose?.();
        context.exhaustTexture?.dispose?.();
        context.wheelSmokeMaterial?.dispose?.();
        context.wheelSmokeTexture?.dispose?.();
        context.renderer?.dispose?.();
      } catch {
        // Ignore renderer dispose issues.
      }
    };

    if (this.flappyOrionAnimationFrame) {
      window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
      this.flappyOrionAnimationFrame = null;
    }
    if (this.orionDriftAnimationFrame) {
      window.cancelAnimationFrame(this.orionDriftAnimationFrame);
      this.orionDriftAnimationFrame = null;
    }
    if (this.orionDriftThreeContext) {
      disposeDriftThreeContext(this.orionDriftThreeContext);
      this.orionDriftThreeContext = null;
    }
    this.orionDriftThreeContext = drift3d;

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(FLAPPY_BEST_KEY) || '0', 10);
      flappyState.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      flappyState.best = 0;
    }

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(DRIFT_BEST_KEY) || '0', 10);
      driftState.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      driftState.best = 0;
    }

    const {
      startGrid2048,
      handleGridMove,
      commitGridReward
    } = setupGrid2048MiniGameRuntime({
      app: this,
      miniGamesSection,
      getCurrentMiniGameView: () => currentMiniGameView,
      gridPanelEl,
      gridBoardEl,
      gridCanvasEl,
      gridScoreEl,
      gridBestEl,
      gridEarnedEl,
      balanceEl,
      gridBestKey: GRID_2048_BEST_KEY
    });

    const {
      updateFlappyHud,
      resolveFlappyWorldSize,
      ensureFlappyAssets,
      renderFlappyFrame,
      startFlappyOrion,
      stopFlappyOrion,
      flappyJump
    } = setupFlappyMiniGameRuntime({
      app: this,
      miniGamesSection,
      currentMiniGameView,
      getCurrentMiniGameView: () => currentMiniGameView,
      flappyPanelEl,
      flappyCanvasEl,
      flappyBestEl,
      flappyStartBtn,
      balanceEl,
      flappyState,
      flappyBestKey: FLAPPY_BEST_KEY,
      flappyGravity: FLAPPY_GRAVITY,
      flappyFlapVelocity: FLAPPY_FLAP_VELOCITY,
      flappyPipeSpeed: FLAPPY_PIPE_SPEED,
      flappyPipeSpawnInterval: FLAPPY_PIPE_SPAWN_INTERVAL,
      flappyPipeWidth: FLAPPY_PIPE_WIDTH,
      flappyPipeGapBase: FLAPPY_PIPE_GAP_BASE,
      flappyMaxDt: FLAPPY_MAX_DT,
      flappyCoinSoundSrc: flappyCoinSoundUrl,
      flappyWingSoundSrc: flappyWingSoundUrl,
      flappyDieSoundSrc: flappyDieSoundUrl
    });

    const {
      updateDriftHud,
      setDriftStatus,
      syncMiniGameControlHints,
      syncDriftControlButtons,
      resolveDriftWorldSize,
      ensureDriftAssets,
      renderOrionDriftFrame,
      startOrionDrift,
      stopOrionDrift
    } = setupDriftMiniGameRuntime({
      app: this,
      miniGamesSection,
      currentMiniGameView,
      getCurrentMiniGameView: () => currentMiniGameView,
      driftPanelEl,
      driftCanvasWrapEl,
      driftCanvasEl,
      driftStatusEl,
      driftScoreEl,
      driftMultiplierEl,
      driftSpeedEl,
      driftOrbsEl,
      driftBestEl,
      driftStartBtn,
      driftSteerLeftBtn,
      driftSteerRightBtn,
      driftGasBtn,
      driftBrakeBtn,
      gridHintEl,
      balanceEl,
      driftState,
      drift3d,
      getGridControlHintText,
      getDriftIdleStatusText,
      getDriftRunningStatusText,
      lockLandscapeForDrift,
      unlockOrientationIfAvailable,
      applyMiniGameContainerBackground,
      createDriftGltfLoader: createOrionDriveGltfLoader,
      driftBestKey: DRIFT_BEST_KEY,
      driftSpeedFactor: DRIFT_SPEED_FACTOR,
      driftShiftDelaySeconds: DRIFT_SHIFT_DELAY_SECONDS,
      smokeDefault: ORION_DRIVE_SMOKE_DEFAULT
    });

    let handleTapperViewEnter = () => {};
    let handleTapperViewLeave = () => {};

    const {
      setMiniGameView,
      addMobileGameCenterBackButtons,
      bindGameSelectButtons
    } = setupMiniGameViewController({
      settingsContainer,
      miniGamesSection,
      gameSelectButtons,
      gamePanels,
      miniGameViewKey: MINI_GAME_VIEW_KEY,
      normalizeMiniGameView,
      getCurrentMiniGameView: () => currentMiniGameView,
      setCurrentMiniGameView: (nextView) => {
        currentMiniGameView = nextView;
      },
      getTapperViewHandlers: () => ({
        handleTapperViewEnter,
        handleTapperViewLeave
      }),
      onGridViewLeave: () => {
        commitGridReward();
      },
      onFlappyViewEnter: () => {
        resolveFlappyWorldSize();
        ensureFlappyAssets();
        renderFlappyFrame();
      },
      onFlappyViewLeave: () => {
        stopFlappyOrion('switch');
      },
      onDriftViewEnter: () => {
        resolveDriftWorldSize();
        ensureDriftAssets();
        renderOrionDriftFrame();
      },
      onDriftViewLeave: () => {
        stopOrionDrift('switch');
      },
      lockLandscapeForDrift,
      lockPortraitForApp,
      unlockOrientationIfAvailable,
      applyMiniGameContainerBackground
    });

    addMobileGameCenterBackButtons();
    bindGameSelectButtons();

    if (gridReplayBtn && gridReplayBtn.dataset.bound !== 'true') {
      gridReplayBtn.dataset.bound = 'true';
      gridReplayBtn.addEventListener('click', () => {
        setMiniGameView('grid2048');
        startGrid2048();
      });
    }

    if (flappyStartBtn && flappyStartBtn.dataset.bound !== 'true') {
      flappyStartBtn.dataset.bound = 'true';
      flappyStartBtn.addEventListener('click', () => {
        setMiniGameView('flappy');
        startFlappyOrion();
      });
    }

    if (flappyCanvasWrapEl && flappyCanvasWrapEl.dataset.bound !== 'true') {
      flappyCanvasWrapEl.dataset.bound = 'true';
      flappyCanvasWrapEl.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setMiniGameView('flappy');
        flappyJump();
      });
    }

    if (driftStartBtn && driftStartBtn.dataset.bound !== 'true') {
      driftStartBtn.dataset.bound = 'true';
      driftStartBtn.addEventListener('click', () => {
        lockLandscapeForDrift();
        setMiniGameView('drift');
        startOrionDrift();
      });
    }

    setupDriftControlsRuntime({
      driftSteerLeftBtn,
      driftSteerRightBtn,
      driftGasBtn,
      driftBrakeBtn,
      driftCanvasWrapEl,
      driftState,
      syncDriftControlButtons,
      setMiniGameView,
      getCurrentMiniGameView: () => currentMiniGameView
    });

    if (this.grid2048KeyHandler) {
      document.removeEventListener('keydown', this.grid2048KeyHandler);
      this.grid2048KeyHandler = null;
    }
    this.grid2048KeyHandler = (event) => {
      if (currentMiniGameView !== 'grid2048') return;
      if (event.defaultPrevented) return;
      const keyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        a: 'left',
        s: 'down',
        d: 'right'
      };
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      handleGridMove(direction);
    };
    document.addEventListener('keydown', this.grid2048KeyHandler);

    if (this.flappyOrionKeyHandler) {
      document.removeEventListener('keydown', this.flappyOrionKeyHandler);
      this.flappyOrionKeyHandler = null;
    }
    this.flappyOrionKeyHandler = (event) => {
      if (currentMiniGameView !== 'flappy') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      if (event.defaultPrevented) return;
      if (event.repeat && flappyState.isRunning) return;

      const isJumpKey = event.code === 'Space'
        || event.code === 'ArrowUp'
        || event.code === 'KeyW';
      if (!isJumpKey) return;

      event.preventDefault();
      flappyJump();
    };
    document.addEventListener('keydown', this.flappyOrionKeyHandler);

    if (this.orionDriftKeyDownHandler) {
      document.removeEventListener('keydown', this.orionDriftKeyDownHandler);
      this.orionDriftKeyDownHandler = null;
    }
    if (this.orionDriftKeyUpHandler) {
      document.removeEventListener('keyup', this.orionDriftKeyUpHandler);
      this.orionDriftKeyUpHandler = null;
    }
    this.orionDriftKeyDownHandler = (event) => {
      if (currentMiniGameView !== 'drift') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      if (event.defaultPrevented) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        driftState.keyLeft = true;
        event.preventDefault();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        driftState.keyRight = true;
        event.preventDefault();
      } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        driftState.keyGas = true;
        event.preventDefault();
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        driftState.keyBrake = true;
        event.preventDefault();
      } else if (event.code === 'Space') {
        driftState.keyHandbrake = true;
        event.preventDefault();
      }
      syncDriftControlButtons();
    };
    this.orionDriftKeyUpHandler = (event) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        driftState.keyLeft = false;
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        driftState.keyRight = false;
      } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        driftState.keyGas = false;
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        driftState.keyBrake = false;
      } else if (event.code === 'Space') {
        driftState.keyHandbrake = false;
        event.preventDefault();
      }
      syncDriftControlButtons();
    };
    document.addEventListener('keydown', this.orionDriftKeyDownHandler);
    document.addEventListener('keyup', this.orionDriftKeyUpHandler);

    let gridTouchStartX = 0;
    let gridTouchStartY = 0;

    if (gridCanvasEl && gridCanvasEl.dataset.bound !== 'true') {
      gridCanvasEl.dataset.bound = 'true';

      gridCanvasEl.addEventListener('touchstart', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        gridTouchStartX = point.clientX;
        gridTouchStartY = point.clientY;
      }, { passive: true });

      gridCanvasEl.addEventListener('touchend', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        const dx = point.clientX - gridTouchStartX;
        const dy = point.clientY - gridTouchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          handleGridMove(dx > 0 ? 'right' : 'left');
          return;
        }
        handleGridMove(dy > 0 ? 'down' : 'up');
      }, { passive: true });
    }

    updateFlappyHud();
    setDriftStatus(getDriftIdleStatusText());
    syncMiniGameControlHints();
    updateDriftHud();
    startGrid2048();
    setMiniGameView(currentMiniGameView);
    if (currentMiniGameView === 'flappy') {
      resolveFlappyWorldSize();
      ensureFlappyAssets();
      renderFlappyFrame();
    }
    if (currentMiniGameView === 'drift') {
      resolveDriftWorldSize();
      ensureDriftAssets();
      renderOrionDriftFrame();
    }

    if (this.flappyOrionResizeHandler) {
      window.removeEventListener('resize', this.flappyOrionResizeHandler);
      this.flappyOrionResizeHandler = null;
    }
    if (this.flappyOrionResizeRaf) {
      window.cancelAnimationFrame(this.flappyOrionResizeRaf);
      this.flappyOrionResizeRaf = null;
    }
    this.flappyOrionResizeHandler = () => {
      if (this.flappyOrionResizeRaf) {
        window.cancelAnimationFrame(this.flappyOrionResizeRaf);
      }
      this.flappyOrionResizeRaf = window.requestAnimationFrame(() => {
        this.flappyOrionResizeRaf = null;
        syncMiniGameControlHints();
        applyMiniGameContainerBackground(currentMiniGameView);

        if (currentMiniGameView === 'flappy') {
          resolveFlappyWorldSize();
          renderFlappyFrame();
          return;
        }
        if (currentMiniGameView === 'drift') {
          resolveDriftWorldSize();
          renderOrionDriftFrame();
        }
      });
    };
    window.addEventListener('resize', this.flappyOrionResizeHandler, { passive: true });

    if (window.innerWidth <= 768 && tapperContentEl && levelIslandEl) {
      if (rateEl && rateEl.parentElement === tapperContentEl) {
        tapperContentEl.insertBefore(levelIslandEl, rateEl);
      } else {
        tapperContentEl.appendChild(levelIslandEl);
      }
      levelIslandEl.style.setProperty('position', 'static', 'important');
      levelIslandEl.style.setProperty('top', 'auto', 'important');
      levelIslandEl.style.setProperty('right', 'auto', 'important');
      levelIslandEl.style.setProperty('left', 'auto', 'important');
      levelIslandEl.style.setProperty('transform', 'none', 'important');
      levelIslandEl.style.setProperty('margin-top', '8px', 'important');
      levelIslandEl.style.setProperty('align-self', 'center', 'important');
    }

    if (miniGamesSection && miniGamesSection.dataset.zoomLockBound !== 'true') {
      miniGamesSection.dataset.zoomLockBound = 'true';

      const preventMultiTouchZoom = (event) => {
        if (event.touches && event.touches.length > 1) {
          event.preventDefault();
        }
      };
      const preventGestureZoom = (event) => {
        event.preventDefault();
      };
      const preventCtrlWheelZoom = (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
        }
      };

      miniGamesSection.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });
      miniGamesSection.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
      miniGamesSection.addEventListener('gesturestart', preventGestureZoom);
      miniGamesSection.addEventListener('gesturechange', preventGestureZoom);
      miniGamesSection.addEventListener('gestureend', preventGestureZoom);
      miniGamesSection.addEventListener('wheel', preventCtrlWheelZoom, { passive: false });
    }

    const tapperRuntime = setupTapperAutoMiningRuntime({
      app: this,
      currentMiniGameView,
      tapperContentEl,
      tapBtn,
      balanceEl,
      levelIslandEl,
      levelValueEl,
      rewardValueEl,
      autoBuyBatchButtons,
      autoMenuToggleBtn,
      autoMenuCloseBtn,
      autoBackdropEl,
      autoMiningContainerEl,
      autoMinersEl,
      autoStatusTextEl,
      autoLastGainEl,
      autoPulseFillEl,
      tapAutoSenders: TAP_AUTO_SENDERS,
      autoBuyBatchKey: AUTO_BUY_BATCH_KEY,
      autoMenuOpenKey: AUTO_MENU_OPEN_KEY,
      autoBuyBatchValues: AUTO_BUY_BATCH_VALUES,
      autoAwayStartTsKey: TAP_AUTO_AWAY_START_TS_KEY,
      autoPendingRewardCentsKey: TAP_AUTO_PENDING_REWARD_CENTS_KEY,
      autoPendingRewardSecondsKey: TAP_AUTO_PENDING_REWARD_SECONDS_KEY
    });

    handleTapperViewEnter = tapperRuntime?.handleTapperViewEnter || handleTapperViewEnter;
    handleTapperViewLeave = tapperRuntime?.handleTapperViewLeave || handleTapperViewLeave;

  }

}
