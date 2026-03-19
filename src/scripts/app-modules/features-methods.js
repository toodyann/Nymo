import { setupSettingsSwipeBack } from '../swipe-handlers.js';
import { escapeHtml } from '../ui-helpers.js';

const flappyCoinSoundUrl = new URL('../../Sounds/coin-sound.mp3', import.meta.url).href;

export class ChatAppFeaturesMethods {
  initShop(settingsContainer) {
    const balanceEl = settingsContainer.querySelector('#shopBalanceValue');
    const islandBalanceEl = settingsContainer.querySelector('#shopIslandBalance');
    const shopHeaderEl = settingsContainer.querySelector('.shop-header');
    const balanceIslandEl = settingsContainer.querySelector('.shop-balance-island');
    const shopContentEl = settingsContainer.querySelector('.shop-content');
    const balanceCardEl = settingsContainer.querySelector('.shop-balance-card');
    const filterToggleEl = settingsContainer.querySelector('#shopFilterToggle');
    const filterSummaryEl = settingsContainer.querySelector('#shopFilterSummary');
    const filterPanelEl = settingsContainer.querySelector('#shopFilterPanel');
    const filterPanelScrollEl = settingsContainer.querySelector('.shop-filter-panel-scroll');
    const minPriceEl = settingsContainer.querySelector('#shopPriceMin');
    const maxPriceEl = settingsContainer.querySelector('#shopPriceMax');
    const minPriceValueEl = settingsContainer.querySelector('#shopPriceMinValue');
    const maxPriceValueEl = settingsContainer.querySelector('#shopPriceMaxValue');
    const filterResetEl = settingsContainer.querySelector('#shopFilterReset');
    const filterApplyEl = settingsContainer.querySelector('#shopFilterApply');
    const filterCloseEl = settingsContainer.querySelector('#shopFilterClose');
    const gridEl = settingsContainer.querySelector('#shopGrid');
    if (!balanceEl || !gridEl || !shopContentEl) return;

    const inventory = new Set(this.loadShopInventory());
    const catalog = this.getShopCatalog();
    const minCatalogPrice = Math.min(...catalog.map(item => item.price));
    const maxCatalogPrice = Math.max(...catalog.map(item => item.price));
    const filterState = {
      category: 'all',
      ownership: 'all',
      availability: 'all',
      sort: 'default',
      minPrice: minCatalogPrice,
      maxPrice: maxCatalogPrice
    };
    const presetCategory = ['all', 'frame', 'aura', 'motion', 'badge'].includes(this.pendingShopCategory)
      ? this.pendingShopCategory
      : null;
    if (presetCategory) {
      filterState.category = presetCategory;
      this.pendingShopCategory = null;
    }
    const shouldOpenByDefault = false;
    balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    if (islandBalanceEl) {
      islandBalanceEl.textContent = this.formatShopIslandBalance(this.getTapBalanceCents());
    }

    if (minPriceEl && maxPriceEl) {
      minPriceEl.min = String(minCatalogPrice);
      minPriceEl.max = String(maxCatalogPrice);
      minPriceEl.value = String(minCatalogPrice);
      maxPriceEl.min = String(minCatalogPrice);
      maxPriceEl.max = String(maxCatalogPrice);
      maxPriceEl.value = String(maxCatalogPrice);
    }

    const createPreview = (item) => {
      if (item.type === 'frame') {
        return `
          <div class="shop-item-preview-avatar" data-avatar-frame="${item.effect}">
            <span>${this.getInitials(this.user?.name || 'Користувач Orion')}</span>
          </div>
        `;
      }

      if (item.type === 'badge') {
        return `
          <div class="shop-item-preview-badges">
            <span class="shop-item-preview-name">${escapeHtml(this.user?.name || 'Orion')}</span>
            ${this.getProfileBadgeMarkup(item.effect, 'shop-item-preview-badge-chip')}
          </div>
        `;
      }

      return `
        <div class="shop-item-preview-card" ${item.type === 'motion' ? `data-profile-motion="${item.effect}"` : `data-profile-aura="${item.effect}"`}>
          <div class="shop-item-preview-card-line primary"></div>
          <div class="shop-item-preview-card-line"></div>
          <div class="shop-item-preview-card-line short"></div>
        </div>
      `;
    };

    const isEquipped = (item) => {
      if (item.type === 'frame') return this.user?.equippedAvatarFrame === item.effect;
      if (item.type === 'aura') return this.user?.equippedProfileAura === item.effect;
      if (item.type === 'motion') return this.user?.equippedProfileMotion === item.effect;
      if (item.type === 'badge') return this.user?.equippedProfileBadge === item.effect;
      return false;
    };

    const getFilterSummary = () => {
      const parts = [];
      if (filterState.category === 'frame') parts.push('Аватар');
      if (filterState.category === 'aura') parts.push('Профіль');
      if (filterState.category === 'motion') parts.push('Анімація');
      if (filterState.category === 'badge') parts.push('Значки');
      if (filterState.ownership === 'owned') parts.push('Куплені');
      if (filterState.ownership === 'unowned') parts.push('Не куплені');
      if (filterState.availability === 'equipped') parts.push('Встановлені');
      if (filterState.availability === 'can-buy') parts.push('Можна купити');
      if (filterState.minPrice > minCatalogPrice || filterState.maxPrice < maxCatalogPrice) {
        parts.push(`Ціна ${this.formatCoinBalance(filterState.minPrice, 1)}-${this.formatCoinBalance(filterState.maxPrice, 1)}`);
      }
      if (filterState.sort === 'price-asc') parts.push('Дешеві спочатку');
      if (filterState.sort === 'price-desc') parts.push('Дорогі спочатку');
      return parts.length ? parts.join(' • ') : 'Усі товари';
    };

    const syncFilterControls = () => {
      if (filterPanelEl) {
        filterPanelEl.querySelectorAll('[data-shop-filter-group]').forEach(btn => {
          const group = btn.dataset.shopFilterGroup;
          const value = btn.dataset.shopFilterValue;
          btn.classList.toggle('active', Boolean(group) && filterState[group] === value);
        });
      }
      if (minPriceEl) minPriceEl.value = String(filterState.minPrice);
      if (maxPriceEl) maxPriceEl.value = String(filterState.maxPrice);
      if (minPriceValueEl) minPriceValueEl.textContent = this.formatCoinBalance(filterState.minPrice, 1);
      if (maxPriceValueEl) maxPriceValueEl.textContent = this.formatCoinBalance(filterState.maxPrice, 1);
      if (filterSummaryEl) filterSummaryEl.textContent = getFilterSummary();
    };

    const setFilterPanelOpen = (isOpen) => {
      if (!filterPanelEl || !filterToggleEl) return;
      filterPanelEl.classList.toggle('is-open', isOpen);
      filterToggleEl.classList.toggle('is-open', isOpen);
      filterToggleEl.setAttribute('aria-expanded', String(isOpen));
      if (isOpen && filterPanelScrollEl) {
        filterPanelScrollEl.scrollTop = 0;
      }
    };

    const closeFilterPanel = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      setFilterPanelOpen(false);
    };

    const syncShopFloatingIslands = () => {
      const currentScrollTop = shopContentEl.scrollTop || 0;
      const balanceCardReached = balanceCardEl
        ? currentScrollTop >= Math.max(0, balanceCardEl.offsetTop - 18)
        : false;

      if (shopHeaderEl) {
        shopHeaderEl.classList.toggle('is-hidden', balanceCardReached);
      }

      if (balanceIslandEl && balanceCardEl) {
        const balanceCardPassed = currentScrollTop > (balanceCardEl.offsetTop + balanceCardEl.offsetHeight - 56);
        balanceIslandEl.classList.toggle('is-visible', balanceCardPassed);
      }
    };

    const renderShop = () => {
      const activeBalance = this.getTapBalanceCents();
      balanceEl.textContent = this.formatCoinBalance(activeBalance);
      if (islandBalanceEl) {
        islandBalanceEl.textContent = this.formatShopIslandBalance(activeBalance);
      }
      syncFilterControls();

      const visibleItems = catalog
        .filter(item => {
          const owned = inventory.has(item.id);
          const equipped = isEquipped(item);
          const canBuy = !owned && activeBalance >= item.price;

          if (filterState.category !== 'all' && item.type !== filterState.category) return false;
          if (filterState.ownership === 'owned' && !owned) return false;
          if (filterState.ownership === 'unowned' && owned) return false;
          if (filterState.availability === 'equipped' && !equipped) return false;
          if (filterState.availability === 'can-buy' && !canBuy) return false;
          if (item.price < filterState.minPrice || item.price > filterState.maxPrice) return false;
          return true;
        })
        .sort((a, b) => {
          if (filterState.sort === 'price-asc') return a.price - b.price;
          if (filterState.sort === 'price-desc') return b.price - a.price;
          return 0;
        });

      if (!visibleItems.length) {
        gridEl.innerHTML = `
          <div class="shop-empty-state">
            <strong>Нічого не знайдено</strong>
            <span>Спробуйте інший фільтр або заробіть більше монет у грі.</span>
          </div>
        `;
        return;
      }

      gridEl.innerHTML = visibleItems.map(item => {
        const owned = inventory.has(item.id);
        const equipped = isEquipped(item);
        const canAfford = activeBalance >= item.price;
        const stateLabel = owned
          ? (equipped ? 'Встановлено' : 'Встановити')
          : `Купити за ${this.formatCoinBalance(item.price, 1)}`;
        const stateClass = owned
          ? (equipped ? 'is-equipped' : 'is-owned')
          : (canAfford ? 'can-buy' : 'is-locked');

        return `
          <article class="shop-item-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-type">Предмет</span>
              <span class="shop-item-price">${this.formatCoinBalance(item.price, 1)}</span>
            </div>
            <div class="shop-item-preview">
              ${createPreview(item)}
            </div>
            <h3 class="shop-item-title">${item.title}</h3>
            <p class="shop-item-description">${item.description}</p>
            <button
              type="button"
              class="shop-item-action ${stateClass}"
              data-shop-item="${item.id}"
              ${!owned && !canAfford ? 'disabled' : ''}
            >${stateLabel}</button>
          </article>
        `;
      }).join('');
    };

    renderShop();
    setFilterPanelOpen(shouldOpenByDefault);
    syncShopFloatingIslands();

    if (shopContentEl.dataset.shopScrollBound !== 'true') {
      shopContentEl.dataset.shopScrollBound = 'true';
      shopContentEl.addEventListener('scroll', () => {
        syncShopFloatingIslands();
      }, { passive: true });
    }

    if (filterToggleEl && filterToggleEl.dataset.bound !== 'true') {
      filterToggleEl.dataset.bound = 'true';
      filterToggleEl.addEventListener('click', () => {
        const shouldOpen = !filterPanelEl?.classList.contains('is-open');
        setFilterPanelOpen(shouldOpen);
      });
    }

    if (filterPanelEl && filterPanelEl.dataset.bound !== 'true') {
      filterPanelEl.dataset.bound = 'true';
      filterPanelEl.addEventListener('click', (event) => {
        if (event.target.closest('#shopFilterClose')) {
          closeFilterPanel(event);
          return;
        }
        const filterBtn = event.target.closest('[data-shop-filter-group]');
        if (!filterBtn) return;
        const group = filterBtn.dataset.shopFilterGroup;
        const value = filterBtn.dataset.shopFilterValue;
        if (!group || !value) return;
        filterState[group] = value;
        syncFilterControls();
      });
    }

    if (minPriceEl && minPriceEl.dataset.bound !== 'true') {
      minPriceEl.dataset.bound = 'true';
      minPriceEl.addEventListener('input', () => {
        const nextValue = Number(minPriceEl.value);
        filterState.minPrice = Math.min(nextValue, filterState.maxPrice);
        if (filterState.minPrice > filterState.maxPrice) {
          filterState.maxPrice = filterState.minPrice;
        }
        syncFilterControls();
      });
    }

    if (maxPriceEl && maxPriceEl.dataset.bound !== 'true') {
      maxPriceEl.dataset.bound = 'true';
      maxPriceEl.addEventListener('input', () => {
        const nextValue = Number(maxPriceEl.value);
        filterState.maxPrice = Math.max(nextValue, filterState.minPrice);
        if (filterState.maxPrice < filterState.minPrice) {
          filterState.minPrice = filterState.maxPrice;
        }
        syncFilterControls();
      });
    }

    if (filterResetEl && filterResetEl.dataset.bound !== 'true') {
      filterResetEl.dataset.bound = 'true';
      filterResetEl.addEventListener('click', () => {
        filterState.category = 'all';
        filterState.ownership = 'all';
        filterState.availability = 'all';
        filterState.sort = 'default';
        filterState.minPrice = minCatalogPrice;
        filterState.maxPrice = maxCatalogPrice;
        syncFilterControls();
        renderShop();
      });
    }

    if (filterApplyEl && filterApplyEl.dataset.bound !== 'true') {
      filterApplyEl.dataset.bound = 'true';
      filterApplyEl.addEventListener('click', () => {
        renderShop();
        setFilterPanelOpen(false);
      });
    }

    if (filterCloseEl && filterCloseEl.dataset.bound !== 'true') {
      filterCloseEl.dataset.bound = 'true';
      filterCloseEl.addEventListener('click', closeFilterPanel);
      filterCloseEl.addEventListener('pointerup', closeFilterPanel);
      filterCloseEl.addEventListener('touchend', closeFilterPanel, { passive: false });
    }

    if (gridEl.dataset.bound === 'true') return;
    gridEl.dataset.bound = 'true';

    gridEl.addEventListener('click', async (event) => {
      const actionBtn = event.target.closest('[data-shop-item]');
      if (!actionBtn) return;

      const item = this.getShopItem(actionBtn.dataset.shopItem);
      if (!item) return;

      if (!inventory.has(item.id)) {
        const balance = this.getTapBalanceCents();
        if (balance < item.price) return;
        const spent = this.applyCoinTransaction(
          -item.price,
          `Купівля: ${item.title}`,
          { category: 'shop' }
        );
        if (!spent) return;
        inventory.add(item.id);
        this.saveShopInventory([...inventory]);
      }

      if (item.type === 'frame') {
        this.user.equippedAvatarFrame = this.user.equippedAvatarFrame === item.effect ? '' : item.effect;
      } else if (item.type === 'aura') {
        this.user.equippedProfileAura = this.user.equippedProfileAura === item.effect ? '' : item.effect;
      } else if (item.type === 'motion') {
        this.user.equippedProfileMotion = this.user.equippedProfileMotion === item.effect ? '' : item.effect;
      } else if (item.type === 'badge') {
        this.user.equippedProfileBadge = this.user.equippedProfileBadge === item.effect ? '' : item.effect;
      }

      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || ''
      });
      this.syncProfileCosmetics();
      renderShop();
    });
  }

  initMiniGames(settingsContainer) {
    const miniGamesSection = settingsContainer.querySelector('#mini-games');
    const tapperContentEl = settingsContainer.querySelector('[data-mini-game-panel="tapper"]');
    const balanceEl = settingsContainer.querySelector('#coinTapBalance');
    const tapBtn = settingsContainer.querySelector('#coinTapBtn');
    const levelIslandEl = settingsContainer.querySelector('.coin-level-island');
    const rateEl = settingsContainer.querySelector('.coin-tapper-rate');
    const levelValueEl = settingsContainer.querySelector('#coinTapLevelValue');
    const rewardValueEl = settingsContainer.querySelector('#coinTapRewardValue');
    if (!miniGamesSection || !balanceEl || !tapBtn) return;

    const gameSelectButtons = settingsContainer.querySelectorAll('[data-mini-game-select]');
    const gamePanels = settingsContainer.querySelectorAll('[data-mini-game-panel]');
    const MINI_GAME_VIEW_KEY = 'orionMiniGameView';
    const normalizeMiniGameView = (value) => {
      if (value === 'signal') return 'signal';
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

    const signalCanvasEl = settingsContainer.querySelector('#signalHuntCanvas');
    const signalTargetEl = settingsContainer.querySelector('#signalHuntTarget');
    const signalStatusEl = settingsContainer.querySelector('#signalHuntStatus');
    const signalScoreEl = settingsContainer.querySelector('#signalHuntScore');
    const signalTimeEl = settingsContainer.querySelector('#signalHuntTime');
    const signalBestEl = settingsContainer.querySelector('#signalHuntBest');
    const signalEarnedEl = settingsContainer.querySelector('#signalHuntEarned');
    const signalStartBtn = settingsContainer.querySelector('#signalHuntStart');
    const gridPanelEl = settingsContainer.querySelector('[data-mini-game-panel="grid2048"]');
    const gridBoardEl = settingsContainer.querySelector('#grid2048Board');
    const gridCanvasEl = settingsContainer.querySelector('#grid2048Canvas');
    const gridScoreEl = settingsContainer.querySelector('#grid2048Score');
    const gridBestEl = settingsContainer.querySelector('#grid2048Best');
    const gridEarnedEl = settingsContainer.querySelector('#grid2048Earned');
    const gridRestartBtn = settingsContainer.querySelector('#grid2048Restart');
    const flappyPanelEl = settingsContainer.querySelector('[data-mini-game-panel="flappy"]');
    const flappyCanvasWrapEl = settingsContainer.querySelector('#flappyOrionCanvasWrap');
    const flappyCanvasEl = settingsContainer.querySelector('#flappyOrionCanvas');
    const flappyStatusEl = settingsContainer.querySelector('#flappyOrionStatus');
    const flappyScoreEl = settingsContainer.querySelector('#flappyOrionScore');
    const flappyCoinsEl = settingsContainer.querySelector('#flappyOrionCoins');
    const flappyEarnedEl = settingsContainer.querySelector('#flappyOrionEarned');
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
    const driftBoostFillEl = settingsContainer.querySelector('#orionDriftBoostFill');
    const driftBestEl = settingsContainer.querySelector('#orionDriftBest');
    const driftStartBtn = settingsContainer.querySelector('#orionDriftStart');
    const driftSteerLeftBtn = settingsContainer.querySelector('#orionDriftSteerLeft');
    const driftSteerRightBtn = settingsContainer.querySelector('#orionDriftSteerRight');
    const driftGasBtn = settingsContainer.querySelector('#orionDriftGas');
    const driftBrakeBtn = settingsContainer.querySelector('#orionDriftBrake');
    const SIGNAL_HUNT_BEST_KEY = 'orionSignalHuntBest';
    const SIGNAL_HUNT_DURATION = 30;
    const SIGNAL_MOVE_INTERVAL_MS = 760;
    const signalState = {
      isRunning: false,
      score: 0,
      timeLeft: SIGNAL_HUNT_DURATION,
      best: 0,
      earnedCents: 0,
      rewardLogged: false
    };
    const GRID_2048_SIZE = 4;
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
    const DRIFT_SPEED_FACTOR = 0.56;
    const DRIFT_SHIFT_DELAY_SECONDS = 0.5;
    const grid2048State = {
      board: new Array(GRID_2048_SIZE * GRID_2048_SIZE).fill(0),
      score: 0,
      best: 0,
      isGameOver: false,
      earnedCents: 0,
      rewardLogged: false
    };
    const flappyState = {
      isRunning: false,
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
      runTime: 0,
      speed: 0,
      carX: 0,
      carY: 0,
      carAngle: 0,
      driftCharge: 0,
      driftTime: 0,
      boostValue: 0,
      zoneBonusActive: false,
      coins: [],
      zones: [],
      particles: [],
      tireTracks: [],
      trackSpawnCarry: 0,
      coinSpawnTimer: 0,
      zoneSpawnTimer: 0,
      lastTimestamp: 0,
      rafId: null,
      assetsLoading: false,
      carReady: false,
      orbReady: false,
      carImage: null,
      orbImage: null,
      steerDirection: 0,
      throttleDirection: 0,
      touchSteerDirection: 0,
      touchThrottleDirection: 0,
      keyLeft: false,
      keyRight: false,
      keyGas: false,
      keyBrake: false,
      gearDirection: 1,
      shiftTargetDirection: 0,
      shiftDelayTimer: 0,
      swipeStartX: 0,
      swipeStartY: 0
    };

    if (this.signalHuntTickTimer) {
      window.clearInterval(this.signalHuntTickTimer);
      this.signalHuntTickTimer = null;
    }
    if (this.signalHuntMoveTimer) {
      window.clearInterval(this.signalHuntMoveTimer);
      this.signalHuntMoveTimer = null;
    }
    if (this.flappyOrionAnimationFrame) {
      window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
      this.flappyOrionAnimationFrame = null;
    }
    if (this.orionDriftAnimationFrame) {
      window.cancelAnimationFrame(this.orionDriftAnimationFrame);
      this.orionDriftAnimationFrame = null;
    }

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(SIGNAL_HUNT_BEST_KEY) || '0', 10);
      signalState.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      signalState.best = 0;
    }

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(GRID_2048_BEST_KEY) || '0', 10);
      grid2048State.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      grid2048State.best = 0;
    }

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

    const updateSignalHud = () => {
      if (signalScoreEl) signalScoreEl.textContent = String(signalState.score);
      if (signalTimeEl) signalTimeEl.textContent = String(signalState.timeLeft);
      if (signalBestEl) signalBestEl.textContent = String(signalState.best);
      if (signalEarnedEl) signalEarnedEl.textContent = this.formatCoinBalance(signalState.earnedCents);
    };

    const commitSignalReward = () => {
      if (signalState.rewardLogged || signalState.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: signalState.earnedCents,
        title: 'Гра: Полювання на сигнал',
        category: 'games'
      });
      signalState.rewardLogged = true;
    };

    const commitGridReward = () => {
      if (grid2048State.rewardLogged || grid2048State.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: grid2048State.earnedCents,
        title: 'Гра: Orion 2048',
        category: 'games'
      });
      grid2048State.rewardLogged = true;
    };

    const commitFlappyReward = () => {
      if (flappyState.rewardLogged || flappyState.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: flappyState.earnedCents,
        title: 'Гра: Flappy Orion',
        category: 'games'
      });
      flappyState.rewardLogged = true;
    };

    const clearSignalHuntTimers = () => {
      if (this.signalHuntTickTimer) {
        window.clearInterval(this.signalHuntTickTimer);
        this.signalHuntTickTimer = null;
      }
      if (this.signalHuntMoveTimer) {
        window.clearInterval(this.signalHuntMoveTimer);
        this.signalHuntMoveTimer = null;
      }
    };

    const placeSignalTarget = () => {
      if (!signalCanvasEl || !signalTargetEl || !signalTargetEl.classList.contains('active')) return;
      const canvasWidth = signalCanvasEl.clientWidth;
      const canvasHeight = signalCanvasEl.clientHeight;
      const targetWidth = signalTargetEl.offsetWidth || 58;
      const targetHeight = signalTargetEl.offsetHeight || 58;
      const padding = 12;
      const availableWidth = Math.max(0, canvasWidth - targetWidth - padding * 2);
      const availableHeight = Math.max(0, canvasHeight - targetHeight - padding * 2);
      const left = Math.round(padding + Math.random() * availableWidth);
      const top = Math.round(padding + Math.random() * availableHeight);
      signalTargetEl.style.left = `${left}px`;
      signalTargetEl.style.top = `${top}px`;
    };

    const saveSignalBest = () => {
      try {
        window.localStorage.setItem(SIGNAL_HUNT_BEST_KEY, String(signalState.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const saveGridBest = () => {
      try {
        window.localStorage.setItem(GRID_2048_BEST_KEY, String(grid2048State.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const saveFlappyBest = () => {
      try {
        window.localStorage.setItem(FLAPPY_BEST_KEY, String(flappyState.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const updateFlappyHud = () => {
      if (flappyScoreEl) flappyScoreEl.textContent = String(flappyState.score);
      if (flappyCoinsEl) flappyCoinsEl.textContent = String(flappyState.coins);
      if (flappyBestEl) flappyBestEl.textContent = String(flappyState.best);
      if (flappyEarnedEl) flappyEarnedEl.textContent = this.formatCoinBalance(flappyState.earnedCents);
    };

    const setFlappyStatus = (message) => {
      if (!flappyStatusEl) return;
      flappyStatusEl.textContent = message;
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
      this.setTapBalanceCents(this.getTapBalanceCents() + safeAmount);
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    };

    const playFlappyCoinSound = () => {
      if (this.settings?.soundNotifications === false) return;
      try {
        if (!this.flappyCoinAudio) {
          this.flappyCoinAudio = new Audio(flappyCoinSoundUrl);
          this.flappyCoinAudio.preload = 'auto';
          this.flappyCoinAudio.volume = 0.45;
        }
        const coinAudio = this.flappyCoinAudio.cloneNode(true);
        coinAudio.currentTime = 0;
        coinAudio.volume = this.flappyCoinAudio.volume;
        const playResult = coinAudio.play();
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
    };

    const ensureFlappyAssets = () => {
      if (!flappyCanvasEl) return;

      if (this.flappyOrionPreparedAtlas) {
        flappyState.spriteAtlas = this.flappyOrionPreparedAtlas;
        flappyState.spriteReady = true;
      }
      if (this.flappyOrionCoinImage?.complete) {
        flappyState.coinImage = this.flappyOrionCoinImage;
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
          this.flappyOrionPreparedAtlas = prepareFlappySpriteAtlas(spriteImage);
          flappyState.spriteAtlas = this.flappyOrionPreparedAtlas;
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
          this.flappyOrionCoinImage = coinImage;
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
      flappyState.birdY = Math.round((flappyState.worldHeight - groundHeight) * 0.42);
      flappyState.birdVelocity = 0;
      flappyState.birdRotation = 0;
      flappyState.pipes = buildFlappyPreviewPipes();
      flappyState.pipeSpawnTimer = 0.72;
      flappyState.lastTimestamp = performance.now();
      flappyState.flapFrame = 0;
      flappyState.flapFrameIndex = 0;
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
      const shouldHandle = flappyState.isRunning || ((reason === 'switch' || reason === 'restart') && hasProgress);
      if (!shouldHandle) return;

      flappyState.isRunning = false;
      if (flappyState.rafId) {
        window.cancelAnimationFrame(flappyState.rafId);
        flappyState.rafId = null;
      }
      if (this.flappyOrionAnimationFrame) {
        window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
        this.flappyOrionAnimationFrame = null;
      }

      commitFlappyReward();
      if (flappyState.score > flappyState.best) {
        flappyState.best = flappyState.score;
        saveFlappyBest();
      }

      if (reason !== 'restart') {
        flappyState.gameOver = reason !== 'switch';
      }

      if (flappyPanelEl) {
        flappyPanelEl.classList.remove('is-running');
      }
      if (flappyStartBtn) {
        flappyStartBtn.textContent = 'Старт';
      }

      if (reason === 'switch') {
        setFlappyStatus('Гру призупинено. Повернись у Flappy Orion та натисни «Старт».');
      } else if (reason !== 'restart') {
        setFlappyStatus(`Гру завершено. Очки: ${flappyState.score}. Монет: ${flappyState.coins}. Зароблено: ${this.formatCoinBalance(flappyState.earnedCents)}.`);
      }

      updateFlappyHud();
      renderFlappyFrame();
    };

    const stepFlappyOrion = (timestamp) => {
      if (!flappyState.isRunning) return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || currentMiniGameView !== 'flappy') {
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
        stopFlappyOrion('collision');
        return;
      }

      const passReward = Math.max(1, Math.floor(this.getTapLevelStats().rewardPerTapCents / 2));
      const coinReward = Math.max(4, this.getTapLevelStats().rewardPerTapCents * 2);
      flappyState.pipes.forEach((pipe) => {
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
          stopFlappyOrion('collision');
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

      if (!flappyState.isRunning) return;

      flappyState.pipes = flappyState.pipes.filter((pipe) => pipe.x + pipe.width > -120);
      updateFlappyHud();
      renderFlappyFrame();
      flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
      this.flappyOrionAnimationFrame = flappyState.rafId;
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
        flappyPanelEl.classList.add('is-running');
      }
      if (flappyStartBtn) {
        flappyStartBtn.textContent = 'Перезапуск';
      }
      setFlappyStatus('Лети вперед: клікай, торкайся або натискай Space для стрибка.');
      flappyState.pipes = [];
      flappyState.pipeSpawnTimer = 0.95;
      flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
      this.flappyOrionAnimationFrame = flappyState.rafId;
    };

    const flappyJump = () => {
      if (!flappyCanvasEl) return;
      if (!flappyState.isRunning) {
        startFlappyOrion();
        return;
      }
      flappyState.birdVelocity = FLAPPY_FLAP_VELOCITY;
      flappyState.birdRotation = -0.52;
      flappyState.flapFrameIndex += 2;
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
      this.addCoinTransaction({
        amountCents: driftState.earnedCents,
        title: 'Гра: Orion Drift',
        category: 'games'
      });
      driftState.rewardLogged = true;
    };

    const addDriftReward = (amountCents) => {
      const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.floor(amountCents)) : 0;
      if (!safeAmount) return;
      driftState.earnedCents += safeAmount;
      this.setTapBalanceCents(this.getTapBalanceCents() + safeAmount);
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    };

    const updateDriftHud = () => {
      if (driftScoreEl) driftScoreEl.textContent = String(Math.max(0, Math.floor(driftState.score)));
      if (driftMultiplierEl) driftMultiplierEl.textContent = `x${driftState.multiplier.toFixed(1)}`;
      if (driftSpeedEl) {
        const speedKmh = Math.max(0, Math.round(Math.abs(driftState.speed) * DRIFT_SPEED_FACTOR));
        driftSpeedEl.textContent = String(speedKmh);
      }
      if (driftOrbsEl) driftOrbsEl.textContent = String(driftState.orbs);
      if (driftBoostFillEl) driftBoostFillEl.style.width = `${Math.round(driftState.boostValue * 100)}%`;
      if (driftBestEl) driftBestEl.textContent = String(driftState.best);
    };

    const setDriftStatus = (message) => {
      if (!driftStatusEl) return;
      driftStatusEl.textContent = message;
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
      if (!driftState.isRunning) {
        driftState.carX = 0;
        driftState.carY = 0;
        driftState.cameraX = 0;
        driftState.cameraY = 0;
        driftState.prevCameraX = 0;
        driftState.prevCameraY = 0;
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

    const addDriftTrackMark = (x, y, angle, intensity = 1) => {
      const trackLife = 1.5 + Math.random() * 0.8;
      driftState.tireTracks.push({
        x,
        y,
        angle,
        width: 3.5 + Math.random() * 1.3,
        length: 9 + Math.random() * 4.5,
        life: trackLife,
        maxLife: trackLife,
        intensity: Math.max(0.3, Math.min(1, intensity))
      });
      if (driftState.tireTracks.length > 900) {
        driftState.tireTracks.splice(0, driftState.tireTracks.length - 900);
      }
    };

    const spawnDriftCoin = (minDistance = 260, maxDistance = 980) => {
      if (driftState.coins.length >= 24) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      driftState.coins.push({
        id: Math.floor(Math.random() * 1_000_000),
        x: driftState.carX + Math.cos(angle) * distance,
        y: driftState.carY + Math.sin(angle) * distance,
        size: Math.max(24, Math.round(driftState.worldHeight * 0.06)),
        spin: Math.random() * Math.PI * 2
      });
    };

    const spawnDriftZone = () => {
      if (driftState.zones.length >= 8) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = 480 + Math.random() * 1400;
      driftState.zones.push({
        id: Math.floor(Math.random() * 1_000_000),
        x: driftState.carX + Math.cos(angle) * distance,
        y: driftState.carY + Math.sin(angle) * distance,
        radius: 160 + Math.random() * 90,
        life: 20 + Math.random() * 18
      });
    };

    const worldToScreen = (x, y) => {
      return {
        x: x - driftState.cameraX + driftState.worldWidth * 0.5,
        y: y - driftState.cameraY + driftState.worldHeight * 0.5
      };
    };

    const renderOrionDriftFrame = () => {
      if (!driftCanvasEl) return;
      const ctx = driftCanvasEl.getContext('2d');
      if (!ctx) return;

      const worldWidth = driftState.worldWidth || 900;
      const worldHeight = driftState.worldHeight || 540;
      const dpr = worldWidth > 0 ? driftCanvasEl.width / worldWidth : 1;
      const carHeight = Math.max(62, Math.round(worldHeight * 0.2));
      const carWidth = Math.max(34, Math.round(carHeight * 0.52));
      const isDarkTheme = document.documentElement.classList.contains('dark-theme');
      const speedAbs = Math.abs(driftState.speed);
      const speedRatio = Math.max(0, Math.min(1, (speedAbs - 40) / 560));
      const backdropTop = isDarkTheme ? '#1b1d21' : '#f8f1e5';
      const backdropBottom = isDarkTheme ? '#0f1114' : '#ebdcc4';
      const gridLineColor = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(109, 90, 63, 0.12)';
      const tireTrackColor = isDarkTheme ? 'rgba(9, 12, 18, 0.86)' : 'rgba(31, 45, 66, 0.42)';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, worldWidth, worldHeight);

      const backdrop = ctx.createLinearGradient(0, 0, 0, worldHeight);
      backdrop.addColorStop(0, backdropTop);
      backdrop.addColorStop(1, backdropBottom);
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, worldWidth, worldHeight);

      const tile = 120;
      const speedGridFactor = 1 + speedRatio * 0.85;
      const offsetX = ((-(driftState.cameraX * speedGridFactor) % tile) + tile) % tile;
      const offsetY = ((-(driftState.cameraY * speedGridFactor) % tile) + tile) % tile;
      ctx.fillStyle = gridLineColor;
      for (let x = -tile; x < worldWidth + tile; x += tile) {
        ctx.fillRect(Math.round(offsetX + x), 0, 2, worldHeight);
      }
      for (let y = -tile; y < worldHeight + tile; y += tile) {
        ctx.fillRect(0, Math.round(offsetY + y), worldWidth, 2);
      }

      driftState.tireTracks.forEach((track) => {
        const p = worldToScreen(track.x, track.y);
        if (p.x < -48 || p.y < -48 || p.x > worldWidth + 48 || p.y > worldHeight + 48) return;
        const lifeRatio = track.maxLife > 0 ? track.life / track.maxLife : 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(track.angle);
        ctx.globalAlpha = Math.max(0, Math.min(0.42, lifeRatio * 0.44)) * track.intensity;
        ctx.strokeStyle = tireTrackColor;
        ctx.lineWidth = track.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, track.length * 0.5);
        ctx.lineTo(0, -track.length * 0.5);
        ctx.stroke();
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      driftState.zones.forEach((zone) => {
        const p = worldToScreen(zone.x, zone.y);
        const pulse = 0.12 + Math.sin((driftState.runTime * 3 + zone.id * 0.01)) * 0.05;
        ctx.fillStyle = `rgba(58, 165, 255, ${Math.max(0.06, pulse)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, zone.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(86, 188, 255, 0.36)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, zone.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      driftState.coins.forEach((coin) => {
        const p = worldToScreen(coin.x, coin.y);
        const coinSize = coin.size;
        if (p.x < -coinSize || p.y < -coinSize || p.x > worldWidth + coinSize || p.y > worldHeight + coinSize) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(coin.spin);
        ctx.shadowColor = 'rgba(62, 181, 255, 0.82)';
        ctx.shadowBlur = 16;
        if (driftState.orbReady && driftState.orbImage) {
          ctx.drawImage(driftState.orbImage, -coinSize / 2, -coinSize / 2, coinSize, coinSize);
        } else {
          ctx.fillStyle = '#48b9ff';
          ctx.beginPath();
          ctx.arc(0, 0, coinSize * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      driftState.particles.forEach((particle) => {
        const p = worldToScreen(particle.x, particle.y);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const carPoint = worldToScreen(driftState.carX, driftState.carY);
      ctx.save();
      ctx.translate(carPoint.x, carPoint.y);
      ctx.rotate(driftState.carAngle);

      const beamReach = Math.max(180, worldHeight * 0.44) + Math.min(80, speedAbs * 0.12);
      const beamNear = Math.max(10, carWidth * 0.2);
      const beamFar = Math.max(74, worldWidth * 0.12);
      const beamAlpha = (driftState.isRunning ? 0.9 : 0.68) * (0.86 + Math.min(0.18, speedAbs / 760));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const drawHeadlightBeam = (offsetX) => {
        const outerGradient = ctx.createLinearGradient(offsetX, -carHeight * 0.34, offsetX, -beamReach);
        outerGradient.addColorStop(0, `rgba(255, 227, 143, ${0.18 * beamAlpha})`);
        outerGradient.addColorStop(0.42, `rgba(255, 217, 124, ${0.09 * beamAlpha})`);
        outerGradient.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.moveTo(offsetX - beamNear * 1.35, -carHeight * 0.36);
        ctx.lineTo(offsetX + beamNear * 1.35, -carHeight * 0.36);
        ctx.lineTo(offsetX + beamFar * 1.65, -beamReach);
        ctx.lineTo(offsetX - beamFar * 1.65, -beamReach);
        ctx.closePath();
        ctx.fill();

        const innerGradient = ctx.createLinearGradient(offsetX, -carHeight * 0.36, offsetX, -beamReach * 0.92);
        innerGradient.addColorStop(0, `rgba(255, 238, 180, ${0.3 * beamAlpha})`);
        innerGradient.addColorStop(0.5, `rgba(255, 224, 138, ${0.14 * beamAlpha})`);
        innerGradient.addColorStop(1, 'rgba(255, 220, 132, 0)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.moveTo(offsetX - beamNear * 0.9, -carHeight * 0.37);
        ctx.lineTo(offsetX + beamNear * 0.9, -carHeight * 0.37);
        ctx.lineTo(offsetX + beamFar * 1.02, -beamReach * 0.94);
        ctx.lineTo(offsetX - beamFar * 1.02, -beamReach * 0.94);
        ctx.closePath();
        ctx.fill();
      };
      drawHeadlightBeam(-carWidth * 0.19);
      drawHeadlightBeam(carWidth * 0.19);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 236, 184, ${0.92 * beamAlpha})`;
      ctx.shadowColor = 'rgba(255, 212, 129, 0.92)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(-carWidth * 0.19, -carHeight * 0.4, Math.max(2.2, carWidth * 0.07), 0, Math.PI * 2);
      ctx.arc(carWidth * 0.19, -carHeight * 0.4, Math.max(2.2, carWidth * 0.07), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (driftState.carReady && driftState.carImage) {
        ctx.drawImage(driftState.carImage, -carWidth / 2, -carHeight / 2, carWidth, carHeight);
      } else {
        ctx.fillStyle = '#ec4d43';
        ctx.fillRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight);
      }

      const brakeInput = driftState.isRunning ? Math.max(0, -resolveDriftThrottleInput()) : 0;
      const brakeStrength = Math.min(1, brakeInput * (speedAbs > 10 ? 1 : 0.7));
      const rearBase = driftState.isRunning ? 0.18 : 0.12;
      const rearGlowAlpha = rearBase + brakeStrength * 0.76;
      const drawTailLight = (offsetX) => {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = `rgba(255, 74, 74, ${0.55 + brakeStrength * 0.35})`;
        ctx.shadowBlur = 7 + brakeStrength * 15;
        ctx.fillStyle = `rgba(255, 86, 86, ${rearGlowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(offsetX, carHeight * 0.41, carWidth * 0.11, carHeight * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 174, 174, ${0.32 + brakeStrength * 0.42})`;
        ctx.beginPath();
        ctx.ellipse(offsetX, carHeight * 0.405, carWidth * 0.06, carHeight * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawTailLight(-carWidth * 0.19);
      drawTailLight(carWidth * 0.19);

      const isReversePreparing = driftState.isRunning
        && driftState.shiftTargetDirection < 0
        && driftState.shiftDelayTimer > 0
        && Math.abs(driftState.speed) < 1.5;
      const isReverseEngaged = driftState.isRunning && driftState.gearDirection < 0;
      const reverseLightStrength = isReversePreparing ? 0.38 : isReverseEngaged ? 0.26 : 0;
      const drawReverseLight = (offsetX) => {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = `rgba(255, 255, 255, ${0.08 + reverseLightStrength * 0.18})`;
        ctx.shadowBlur = 2 + reverseLightStrength * 5;
        ctx.fillStyle = `rgba(255, 255, 245, ${0.08 + reverseLightStrength * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(offsetX, carHeight * 0.41, carWidth * 0.07, carHeight * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      if (reverseLightStrength > 0) {
        drawReverseLight(-carWidth * 0.19);
        drawReverseLight(carWidth * 0.19);
      }
      ctx.restore();
    };

    const ensureDriftAssets = () => {
      if (!driftCanvasEl) return;

      if (this.orionDriftCarImage?.complete) {
        driftState.carImage = this.orionDriftCarImage;
        driftState.carReady = true;
      }
      if (this.orionDriftOrbImage?.complete) {
        driftState.orbImage = this.orionDriftOrbImage;
        driftState.orbReady = true;
      }

      if (driftState.assetsLoading || (driftState.carReady && driftState.orbReady)) return;
      driftState.assetsLoading = true;

      const carSrc = driftCanvasEl.dataset.carSrc || '';
      const orbSrc = driftCanvasEl.dataset.orbSrc || '';
      const tasks = [];

      const finish = () => {
        driftState.assetsLoading = false;
        renderOrionDriftFrame();
      };

      if (!driftState.carReady && carSrc) {
        tasks.push(new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            this.orionDriftCarImage = image;
            driftState.carImage = image;
            driftState.carReady = true;
            resolve();
          };
          image.onerror = () => resolve();
          image.src = carSrc;
        }));
      }

      if (!driftState.orbReady && orbSrc) {
        tasks.push(new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            this.orionDriftOrbImage = image;
            driftState.orbImage = image;
            driftState.orbReady = true;
            resolve();
          };
          image.onerror = () => resolve();
          image.src = orbSrc;
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
      driftState.cameraX = 0;
      driftState.cameraY = 0;
      driftState.prevCameraX = 0;
      driftState.prevCameraY = 0;
      driftState.driftCharge = 0;
      driftState.driftTime = 0;
      driftState.zoneBonusActive = false;
      driftState.boostValue = 0;
      driftState.coins = [];
      driftState.zones = [];
      driftState.particles = [];
      driftState.tireTracks = [];
      driftState.trackSpawnCarry = 0;
      driftState.coinSpawnTimer = 0.5;
      driftState.zoneSpawnTimer = 3.2;
      driftState.lastTimestamp = performance.now();
      driftState.steerDirection = 0;
      driftState.throttleDirection = 0;
      driftState.touchSteerDirection = 0;
      driftState.touchThrottleDirection = 0;
      driftState.keyLeft = false;
      driftState.keyRight = false;
      driftState.keyGas = false;
      driftState.keyBrake = false;
      driftState.gearDirection = 1;
      driftState.shiftTargetDirection = 0;
      driftState.shiftDelayTimer = 0;
      for (let i = 0; i < 10; i += 1) spawnDriftCoin(180, 1200);
      for (let i = 0; i < 3; i += 1) spawnDriftZone();
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
      if (this.orionDriftAnimationFrame) {
        window.cancelAnimationFrame(this.orionDriftAnimationFrame);
        this.orionDriftAnimationFrame = null;
      }

      commitDriftReward();
      if (driftState.score > driftState.best) {
        driftState.best = driftState.score;
        saveDriftBest();
      }

      if (driftPanelEl) driftPanelEl.classList.remove('is-running');
      if (driftStartBtn) driftStartBtn.textContent = 'Старт';

      if (reason === 'switch') {
        setDriftStatus('Режим призупинено. Повернись в Orion Drift, щоб продовжити поїздку.');
      } else if (reason !== 'restart') {
        setDriftStatus(`Сесію завершено. Очки: ${Math.floor(driftState.score)}. Сфери: ${driftState.orbs}. Зароблено: ${this.formatCoinBalance(driftState.earnedCents)}.`);
      }

      syncDriftControlButtons();
      updateDriftHud();
      renderOrionDriftFrame();
    };

    const stepOrionDrift = (timestamp) => {
      if (!driftState.isRunning) return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || currentMiniGameView !== 'drift') {
        stopOrionDrift('switch');
        return;
      }

      const elapsedSeconds = Math.min(1 / 30, Math.max(0, (timestamp - driftState.lastTimestamp) / 1000));
      driftState.lastTimestamp = timestamp;
      driftState.runTime += elapsedSeconds;

      const steerInput = resolveDriftSteerInput();
      const throttleInput = resolveDriftThrottleInput();
      syncDriftControlButtons();

      const desiredDirection = throttleInput > 0 ? 1 : throttleInput < 0 ? -1 : 0;
      const isShiftRequested = desiredDirection !== 0 && desiredDirection !== driftState.gearDirection;
      const isNearlyStopped = Math.abs(driftState.speed) < 8;

      if (isShiftRequested) {
        driftState.shiftTargetDirection = desiredDirection;
        if (!isNearlyStopped) {
          driftState.shiftDelayTimer = DRIFT_SHIFT_DELAY_SECONDS;
          const shiftBrakeForce = 980;
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
          driftState.speed *= Math.exp(-0.22 * elapsedSeconds);
          if (Math.abs(driftState.speed) < 0.35) driftState.speed = 0;
        } else if (desiredDirection > 0) {
        if (driftState.speed < 0) driftState.speed += 760 * elapsedSeconds;
        driftState.speed += 300 * elapsedSeconds;
        } else {
          if (driftState.speed > 0) driftState.speed -= 760 * elapsedSeconds;
          driftState.speed -= 360 * elapsedSeconds;
        }
      }

      const maxForward = 620;
      const maxReverse = 260;
      driftState.speed = Math.max(-maxReverse, Math.min(maxForward, driftState.speed));

      const speedAbs = Math.abs(driftState.speed);
      const turnRate = 1.1 + Math.min(1.6, speedAbs / 170) * 1.2;
      const reverseFactor = driftState.speed >= 0 ? 1 : -1;
      driftState.carAngle += steerInput * turnRate * reverseFactor * elapsedSeconds;

      const isDrifting = Math.abs(steerInput) > 0.12 && speedAbs > 90;
      if (isDrifting) {
        driftState.driftTime += elapsedSeconds;
        driftState.driftCharge = Math.min(1, driftState.driftCharge + elapsedSeconds * 0.72);
      } else {
        driftState.driftTime = Math.max(0, driftState.driftTime - elapsedSeconds * 2.4);
        driftState.driftCharge = Math.max(0, driftState.driftCharge - elapsedSeconds * 0.52);
      }
      driftState.boostValue = driftState.driftCharge;

      const targetMultiplier = isDrifting ? Math.min(5, 1 + driftState.driftCharge * 2.6) : 1;
      driftState.multiplier += (targetMultiplier - driftState.multiplier) * Math.min(1, elapsedSeconds * 8);

      const forwardX = Math.sin(driftState.carAngle);
      const forwardY = -Math.cos(driftState.carAngle);
      const sideX = Math.cos(driftState.carAngle);
      const sideY = Math.sin(driftState.carAngle);
      driftState.carX += forwardX * driftState.speed * elapsedSeconds;
      driftState.carY += forwardY * driftState.speed * elapsedSeconds;

      if (isDrifting) {
        const sideSlip = steerInput * speedAbs * (0.08 + driftState.driftCharge * 0.22);
        driftState.carX += sideX * sideSlip * elapsedSeconds;
        driftState.carY += sideY * sideSlip * elapsedSeconds;
        addDriftParticles(driftState.carX - sideX * 26, driftState.carY - sideY * 26, 2);
      }

      const shouldLeaveTracks = speedAbs > 56 && (isDrifting || throttleInput < 0 || (Math.abs(steerInput) > 0.35 && speedAbs > 130));
      if (shouldLeaveTracks) {
        const carHeight = Math.max(62, Math.round(driftState.worldHeight * 0.2));
        const carWidth = Math.max(34, Math.round(carHeight * 0.52));
        const rearOffset = carHeight * 0.35;
        const wheelOffset = carWidth * 0.33;
        const rearX = driftState.carX - forwardX * rearOffset;
        const rearY = driftState.carY - forwardY * rearOffset;
        const leftWheelX = rearX - sideX * wheelOffset;
        const leftWheelY = rearY - sideY * wheelOffset;
        const rightWheelX = rearX + sideX * wheelOffset;
        const rightWheelY = rearY + sideY * wheelOffset;
        const intensity = isDrifting ? 1 : 0.6 + Math.min(0.3, speedAbs / 720);
        driftState.trackSpawnCarry += elapsedSeconds * (isDrifting ? 42 : 24) * Math.min(2, speedAbs / 210);
        while (driftState.trackSpawnCarry >= 1) {
          driftState.trackSpawnCarry -= 1;
          addDriftTrackMark(leftWheelX, leftWheelY, driftState.carAngle, intensity);
          addDriftTrackMark(rightWheelX, rightWheelY, driftState.carAngle, intensity);
        }
      } else {
        driftState.trackSpawnCarry = Math.max(0, driftState.trackSpawnCarry - elapsedSeconds * 5);
      }

      const previousCameraX = driftState.cameraX;
      const previousCameraY = driftState.cameraY;
      const cameraLookAhead = Math.min(160, speedAbs * 0.22);
      const movementSign = driftState.speed >= 0 ? 1 : -1;
      const cameraTargetX = driftState.carX + forwardX * cameraLookAhead * movementSign;
      const cameraTargetY = driftState.carY + forwardY * cameraLookAhead * movementSign;
      const camLerp = Math.min(1, elapsedSeconds * (5.2 + speedAbs / 240));
      driftState.cameraX += (cameraTargetX - driftState.cameraX) * camLerp;
      driftState.cameraY += (cameraTargetY - driftState.cameraY) * camLerp;
      driftState.prevCameraX = previousCameraX;
      driftState.prevCameraY = previousCameraY;

      driftState.coinSpawnTimer -= elapsedSeconds;
      driftState.zoneSpawnTimer -= elapsedSeconds;
      if (driftState.coinSpawnTimer <= 0) {
        spawnDriftCoin();
        driftState.coinSpawnTimer = 0.7 + Math.random() * 1.4;
      }
      if (driftState.zoneSpawnTimer <= 0) {
        spawnDriftZone();
        driftState.zoneSpawnTimer = 5 + Math.random() * 4;
      }

      driftState.zoneBonusActive = false;
      driftState.zones.forEach((zone) => {
        zone.life -= elapsedSeconds;
        const dx = driftState.carX - zone.x;
        const dy = driftState.carY - zone.y;
        if (dx * dx + dy * dy <= zone.radius * zone.radius) {
          driftState.zoneBonusActive = true;
          if (isDrifting) {
            driftState.scoreRaw += 18 * driftState.multiplier * elapsedSeconds;
            addDriftParticles(driftState.carX, driftState.carY, 3, 'rgba(80, 188, 255, 0.75)');
          }
        }
      });

      const pickupReward = Math.max(2, Math.ceil(this.getTapLevelStats().rewardPerTapCents * 0.6));
      for (let i = driftState.coins.length - 1; i >= 0; i -= 1) {
        const coin = driftState.coins[i];
        coin.spin += elapsedSeconds * 2.2;
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

      for (let i = driftState.zones.length - 1; i >= 0; i -= 1) {
        const zone = driftState.zones[i];
        const dx = driftState.carX - zone.x;
        const dy = driftState.carY - zone.y;
        if (zone.life <= 0 || (dx * dx + dy * dy > 7_500_000)) {
          driftState.zones.splice(i, 1);
        }
      }

      driftState.particles.forEach((particle) => {
        particle.x += particle.vx * elapsedSeconds;
        particle.y += particle.vy * elapsedSeconds;
        particle.life -= elapsedSeconds;
      });
      driftState.particles = driftState.particles.filter((particle) => particle.life > 0);
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
      this.orionDriftAnimationFrame = driftState.rafId;
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
      if (driftStartBtn) driftStartBtn.textContent = 'Перезапуск';
      setDriftStatus('Відкритий режим: катайся вільно. W/S або ↑/↓ для газу й гальма, A/D або ←/→ для повороту.');
      driftState.rafId = window.requestAnimationFrame(stepOrionDrift);
      this.orionDriftAnimationFrame = driftState.rafId;
    };

    const stopSignalHunt = (reason = 'finished') => {
      if (!signalState.isRunning && reason !== 'switch') return;
      signalState.isRunning = false;
      clearSignalHuntTimers();
      if (signalTargetEl) signalTargetEl.classList.remove('active');
      commitSignalReward();

      if (signalState.score > signalState.best) {
        signalState.best = signalState.score;
        saveSignalBest();
      }

      updateSignalHud();

      if (signalStartBtn) signalStartBtn.textContent = 'Старт';
      if (signalStatusEl) {
        if (reason === 'switch') {
          signalStatusEl.textContent = 'Гру призупинено. Повернись, щоб зіграти знову.';
        } else if (signalState.score > 0) {
          signalStatusEl.textContent = `Гру завершено. Твій результат: ${signalState.score}. Зароблено: ${this.formatCoinBalance(signalState.earnedCents)}.`;
        } else {
          signalStatusEl.textContent = 'Час вийшов. Спробуй ще раз і впіймай більше сигналів.';
        }
      }
    };

    const startSignalHunt = () => {
      if (!signalCanvasEl || !signalTargetEl) return;
      clearSignalHuntTimers();

      signalState.isRunning = true;
      signalState.score = 0;
      signalState.timeLeft = SIGNAL_HUNT_DURATION;
      signalState.earnedCents = 0;
      signalState.rewardLogged = false;
      if (signalStartBtn) signalStartBtn.textContent = 'Перезапуск';
      if (signalStatusEl) signalStatusEl.textContent = 'Лови сигнали, вони зʼявляються у випадкових точках!';
      signalTargetEl.classList.add('active');
      updateSignalHud();
      placeSignalTarget();

      this.signalHuntMoveTimer = window.setInterval(() => {
        placeSignalTarget();
      }, SIGNAL_MOVE_INTERVAL_MS);

      this.signalHuntTickTimer = window.setInterval(() => {
        signalState.timeLeft -= 1;
        if (signalState.timeLeft <= 0) {
          signalState.timeLeft = 0;
          stopSignalHunt('finished');
          return;
        }
        updateSignalHud();
      }, 1000);
    };

    const getGridRow = (row) => {
      const start = row * GRID_2048_SIZE;
      return grid2048State.board.slice(start, start + GRID_2048_SIZE);
    };

    const setGridRow = (row, values) => {
      const start = row * GRID_2048_SIZE;
      for (let i = 0; i < GRID_2048_SIZE; i += 1) {
        grid2048State.board[start + i] = values[i];
      }
    };

    const getGridColumn = (col) => (
      Array.from({ length: GRID_2048_SIZE }, (_, row) => grid2048State.board[row * GRID_2048_SIZE + col])
    );

    const setGridColumn = (col, values) => {
      for (let row = 0; row < GRID_2048_SIZE; row += 1) {
        grid2048State.board[row * GRID_2048_SIZE + col] = values[row];
      }
    };

    const mergeGridLine = (line) => {
      const compact = line.filter((value) => value !== 0);
      let gained = 0;

      for (let i = 0; i < compact.length - 1; i += 1) {
        if (compact[i] !== compact[i + 1]) continue;
        compact[i] *= 2;
        gained += compact[i];
        compact.splice(i + 1, 1);
      }

      while (compact.length < GRID_2048_SIZE) compact.push(0);

      const moved = compact.some((value, index) => value !== line[index]);
      return { values: compact, gained, moved };
    };

    const getGridEmptyIndexes = () => {
      const indexes = [];
      grid2048State.board.forEach((value, index) => {
        if (value === 0) indexes.push(index);
      });
      return indexes;
    };

    const spawnGridTile = (count = 1) => {
      for (let i = 0; i < count; i += 1) {
        const emptyIndexes = getGridEmptyIndexes();
        if (!emptyIndexes.length) return;
        const randomIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
        grid2048State.board[randomIndex] = Math.random() < 0.9 ? 2 : 4;
      }
    };

    const checkGridGameOver = () => {
      if (grid2048State.board.includes(0)) return false;

      for (let row = 0; row < GRID_2048_SIZE; row += 1) {
        for (let col = 0; col < GRID_2048_SIZE; col += 1) {
          const index = row * GRID_2048_SIZE + col;
          const value = grid2048State.board[index];
          const right = col < GRID_2048_SIZE - 1 ? grid2048State.board[index + 1] : null;
          const down = row < GRID_2048_SIZE - 1 ? grid2048State.board[index + GRID_2048_SIZE] : null;
          if (value === right || value === down) return false;
        }
      }

      return true;
    };

    const renderGrid2048 = () => {
      if (!gridBoardEl) return;
      if (gridBoardEl.childElementCount !== GRID_2048_SIZE * GRID_2048_SIZE) {
        gridBoardEl.innerHTML = '';
        for (let i = 0; i < GRID_2048_SIZE * GRID_2048_SIZE; i += 1) {
          const cell = document.createElement('div');
          cell.className = 'tile';
          gridBoardEl.appendChild(cell);
        }
      }

      const tiles = gridBoardEl.querySelectorAll('.tile');
      tiles.forEach((tile, index) => {
        const value = grid2048State.board[index];
        tile.className = 'tile';
        tile.textContent = value ? String(value) : '';
        if (!value) return;

        const cappedClass = value <= 2048 ? `value-${value}` : 'value-2048';
        tile.classList.add(cappedClass);
        if (value >= 128) tile.classList.add('value-high');
        if (value >= 1024) tile.classList.add('value-super');
      });

      if (gridScoreEl) gridScoreEl.textContent = String(grid2048State.score);
      if (gridBestEl) gridBestEl.textContent = String(grid2048State.best);
      if (gridEarnedEl) gridEarnedEl.textContent = this.formatCoinBalance(grid2048State.earnedCents);
      const endMessage = grid2048State.isGameOver
        ? `Гру завершено\nЗароблено: ${this.formatCoinBalance(grid2048State.earnedCents)}\nНатисни «Нова гра»`
        : '';
      if (gridPanelEl) {
        gridPanelEl.classList.toggle('game-over', grid2048State.isGameOver);
      }
      if (gridCanvasEl) {
        gridCanvasEl.dataset.endMessage = endMessage;
      }
    };

    const startGrid2048 = () => {
      commitGridReward();
      grid2048State.board = new Array(GRID_2048_SIZE * GRID_2048_SIZE).fill(0);
      grid2048State.score = 0;
      grid2048State.isGameOver = false;
      grid2048State.earnedCents = 0;
      grid2048State.rewardLogged = false;
      spawnGridTile(2);
      renderGrid2048();
    };

    const applyGridMove = (direction) => {
      if (grid2048State.isGameOver) return false;
      let moved = false;
      let gainedTotal = 0;

      const processLine = (line, reverse = false) => {
        const source = reverse ? [...line].reverse() : [...line];
        const merged = mergeGridLine(source);
        const values = reverse ? merged.values.reverse() : merged.values;
        if (merged.moved) moved = true;
        gainedTotal += merged.gained;
        return values;
      };

      if (direction === 'left' || direction === 'right') {
        for (let row = 0; row < GRID_2048_SIZE; row += 1) {
          const nextValues = processLine(getGridRow(row), direction === 'right');
          setGridRow(row, nextValues);
        }
      } else {
        for (let col = 0; col < GRID_2048_SIZE; col += 1) {
          const nextValues = processLine(getGridColumn(col), direction === 'down');
          setGridColumn(col, nextValues);
        }
      }

      if (!moved) return false;

      grid2048State.score += gainedTotal;
      if (gainedTotal > 0) {
        const rewardCents = Math.max(1, Math.floor(gainedTotal / 16));
        grid2048State.earnedCents += rewardCents;
        this.setTapBalanceCents(this.getTapBalanceCents() + rewardCents);
        balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
      }
      if (grid2048State.score > grid2048State.best) {
        grid2048State.best = grid2048State.score;
        saveGridBest();
      }

      spawnGridTile(1);
      grid2048State.isGameOver = checkGridGameOver();
      if (grid2048State.isGameOver) commitGridReward();
      renderGrid2048();
      return true;
    };

    const handleGridMove = (direction) => {
      if (currentMiniGameView !== 'grid2048') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      applyGridMove(direction);
    };

    const setMiniGameView = (view) => {
      const safeView = normalizeMiniGameView(view);
      currentMiniGameView = safeView;
      if (miniGamesSection) {
        miniGamesSection.dataset.activeMiniGame = safeView;
      }

      gameSelectButtons.forEach((buttonEl) => {
        const isActive = buttonEl.dataset.miniGameSelect === safeView;
        buttonEl.classList.toggle('active', isActive);
        buttonEl.setAttribute('aria-pressed', String(isActive));
      });

      gamePanels.forEach((panelEl) => {
        const isActive = panelEl.dataset.miniGamePanel === safeView;
        panelEl.classList.toggle('active', isActive);
      });

      if (safeView !== 'signal' && signalState.isRunning) {
        stopSignalHunt('switch');
      }
      if (safeView !== 'grid2048') {
        commitGridReward();
      }
      if (safeView !== 'flappy') {
        stopFlappyOrion('switch');
      } else {
        resolveFlappyWorldSize();
        ensureFlappyAssets();
        renderFlappyFrame();
      }
      if (safeView !== 'drift') {
        stopOrionDrift('switch');
      } else {
        resolveDriftWorldSize();
        ensureDriftAssets();
        renderOrionDriftFrame();
      }

      try {
        window.localStorage.setItem(MINI_GAME_VIEW_KEY, safeView);
      } catch {
        // Ignore storage failures.
      }
    };

    gameSelectButtons.forEach((buttonEl) => {
      if (buttonEl.dataset.bound === 'true') return;
      buttonEl.dataset.bound = 'true';
      buttonEl.addEventListener('click', () => {
        setMiniGameView(buttonEl.dataset.miniGameSelect || 'tapper');
      });
    });

    if (signalTargetEl && signalTargetEl.dataset.bound !== 'true') {
      signalTargetEl.dataset.bound = 'true';
      signalTargetEl.addEventListener('click', () => {
        if (!signalState.isRunning) return;
        const rewardCents = Math.max(2, this.getTapLevelStats().rewardPerTapCents + 1);
        signalState.score += 1;
        signalState.earnedCents += rewardCents;
        this.setTapBalanceCents(this.getTapBalanceCents() + rewardCents);
        balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
        updateSignalHud();
        signalTargetEl.classList.remove('hit');
        void signalTargetEl.offsetWidth;
        signalTargetEl.classList.add('hit');
        placeSignalTarget();
      });
    }

    if (signalStartBtn && signalStartBtn.dataset.bound !== 'true') {
      signalStartBtn.dataset.bound = 'true';
      signalStartBtn.addEventListener('click', () => {
        setMiniGameView('signal');
        startSignalHunt();
      });
    }

    if (gridRestartBtn && gridRestartBtn.dataset.bound !== 'true') {
      gridRestartBtn.dataset.bound = 'true';
      gridRestartBtn.addEventListener('click', () => {
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
        setMiniGameView('drift');
        startOrionDrift();
      });
    }

    const setDriftSteerDirection = (direction) => {
      driftState.steerDirection = direction;
      syncDriftControlButtons();
    };

    const setDriftThrottleDirection = (direction) => {
      driftState.throttleDirection = direction;
      syncDriftControlButtons();
    };

    const bindDriftControlButton = (buttonEl, onPress, onRelease) => {
      if (!buttonEl || buttonEl.dataset.bound === 'true') return;
      buttonEl.dataset.bound = 'true';
      buttonEl.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setMiniGameView('drift');
        onPress();
      });
      buttonEl.addEventListener('pointerup', onRelease);
      buttonEl.addEventListener('pointercancel', onRelease);
      buttonEl.addEventListener('pointerleave', onRelease);
    };

    bindDriftControlButton(driftSteerLeftBtn, () => setDriftSteerDirection(-1), () => setDriftSteerDirection(0));
    bindDriftControlButton(driftSteerRightBtn, () => setDriftSteerDirection(1), () => setDriftSteerDirection(0));
    bindDriftControlButton(driftGasBtn, () => setDriftThrottleDirection(1), () => setDriftThrottleDirection(0));
    bindDriftControlButton(driftBrakeBtn, () => setDriftThrottleDirection(-1), () => setDriftThrottleDirection(0));

    if (driftCanvasWrapEl && driftCanvasWrapEl.dataset.bound !== 'true') {
      driftCanvasWrapEl.dataset.bound = 'true';

      driftCanvasWrapEl.addEventListener('touchstart', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        driftState.swipeStartX = point.clientX;
        driftState.swipeStartY = point.clientY;
        driftState.touchSteerDirection = 0;
        syncDriftControlButtons();
      }, { passive: true });

      driftCanvasWrapEl.addEventListener('touchmove', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        const dx = point.clientX - driftState.swipeStartX;
        const dy = point.clientY - driftState.swipeStartY;
        if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 0.8) {
          driftState.touchSteerDirection = dx > 0 ? 1 : -1;
          if (currentMiniGameView !== 'drift') setMiniGameView('drift');
          event.preventDefault();
        } else {
          driftState.touchSteerDirection = 0;
        }
        syncDriftControlButtons();
      }, { passive: false });

      const finishSwipe = (event) => {
        driftState.touchSteerDirection = 0;
        syncDriftControlButtons();
      };

      driftCanvasWrapEl.addEventListener('touchend', finishSwipe, { passive: true });
      driftCanvasWrapEl.addEventListener('touchcancel', finishSwipe, { passive: true });
    }

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

    updateSignalHud();
    resolveFlappyWorldSize();
    ensureFlappyAssets();
    setFlappyStatus('Натисни «Старт», щоб полетіти. Клікай або тисни Space для стрибка.');
    updateFlappyHud();
    renderFlappyFrame();
    resolveDriftWorldSize();
    ensureDriftAssets();
    setDriftStatus('Натисни «Старт». Відкритий режим: W/S або ↑/↓ для газу й гальма, A/D або ←/→ для повороту.');
    updateDriftHud();
    renderOrionDriftFrame();
    startGrid2048();
    setMiniGameView(currentMiniGameView);

    if (this.flappyOrionResizeHandler) {
      window.removeEventListener('resize', this.flappyOrionResizeHandler);
      this.flappyOrionResizeHandler = null;
    }
    this.flappyOrionResizeHandler = () => {
      resolveFlappyWorldSize();
      renderFlappyFrame();
      resolveDriftWorldSize();
      renderOrionDriftFrame();
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

    const syncTapperStats = () => {
      const stats = this.getTapLevelStats();
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());

      if (levelValueEl) {
        levelValueEl.textContent = String(stats.level);
      }
      if (levelIslandEl) {
        const progressPercent = Math.max(0, Math.min(100, Math.round(stats.levelProgress * 100)));
        levelIslandEl.style.setProperty('--coin-level-progress', `${progressPercent}%`);
      }
      if (rewardValueEl) {
        rewardValueEl.textContent = `${this.formatCoinBalance(stats.rewardPerTapCents, 1)} монетки`;
      }
    };

    this.setTapBalanceCents(this.getTapBalanceCents());
    this.setTapTotalClicks(this.getTapTotalClicks());
    syncTapperStats();

    if (tapBtn.dataset.bound === 'true') return;
    tapBtn.dataset.bound = 'true';

    let tapAnimationTimer = null;
    let lastTapTimestamp = Number.NEGATIVE_INFINITY;
    const TAP_DEDUPE_MS = 40;

    tapBtn.addEventListener('click', (event) => {
      const eventTimestamp = typeof event.timeStamp === 'number' ? event.timeStamp : performance.now();
      if (eventTimestamp - lastTapTimestamp < TAP_DEDUPE_MS) return;
      lastTapTimestamp = eventTimestamp;

      const levelStats = this.getTapLevelStats();
      const rewardCents = levelStats.rewardPerTapCents;
      const currentBalance = this.getTapBalanceCents();
      this.setTapBalanceCents(currentBalance + rewardCents);
      this.setTapTotalClicks(levelStats.totalClicks + 1);
      syncTapperStats();

      tapBtn.classList.remove('is-tapping');
      void tapBtn.offsetWidth;
      tapBtn.classList.add('is-tapping');

      if (tapAnimationTimer) window.clearTimeout(tapAnimationTimer);
      tapAnimationTimer = window.setTimeout(() => {
        tapBtn.classList.remove('is-tapping');
      }, 180);
    });
  }

  initProfileItems(settingsContainer) {
    const balanceEl = settingsContainer.querySelector('#profileItemsBalance');
    const itemsCountEl = settingsContainer.querySelector('#profileItemsCount');
    const gridEl = settingsContainer.querySelector('#profileItemsGrid');
    const viewButtons = settingsContainer.querySelectorAll('[data-profile-items-view]');
    if (!balanceEl || !itemsCountEl || !gridEl) return;

    const inventory = new Set(this.loadShopInventory());
    const catalogById = new Map(this.getShopCatalog().map(item => [item.id, item]));
    const SELL_MULTIPLIER = 0.6;
    const PROFILE_ITEMS_VIEW_KEY = 'orionProfileItemsView';
    const normalizeView = (value) => (value === 'list' ? 'list' : 'cards');
    let currentView = 'cards';

    try {
      currentView = normalizeView(window.localStorage.getItem(PROFILE_ITEMS_VIEW_KEY));
    } catch {
      currentView = 'cards';
    }

    const setView = (view) => {
      currentView = normalizeView(view);
      gridEl.classList.toggle('is-list', currentView === 'list');
      viewButtons.forEach(btn => {
        const isActive = btn.dataset.profileItemsView === currentView;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      try {
        window.localStorage.setItem(PROFILE_ITEMS_VIEW_KEY, currentView);
      } catch {
        // Ignore storage failures.
      }
    };

    const getSellPrice = (item) => Math.max(1, Math.floor(item.price * SELL_MULTIPLIER));

    const getTypeLabel = (type) => {
      if (type === 'frame') return 'Рамка';
      if (type === 'aura') return 'Фон';
      if (type === 'motion') return 'Анімація';
      if (type === 'badge') return 'Бейдж';
      return 'Предмет';
    };

    const createPreview = (item) => {
      if (item.type === 'frame') {
        return `
          <div class="shop-item-preview-avatar" data-avatar-frame="${item.effect}">
            <span>${this.getInitials(this.user?.name || 'Користувач Orion')}</span>
          </div>
        `;
      }

      if (item.type === 'badge') {
        return `
          <div class="shop-item-preview-badges">
            <span class="shop-item-preview-name">${escapeHtml(this.user?.name || 'Orion')}</span>
            ${this.getProfileBadgeMarkup(item.effect, 'shop-item-preview-badge-chip')}
          </div>
        `;
      }

      return `
        <div class="shop-item-preview-card" ${item.type === 'motion' ? `data-profile-motion="${item.effect}"` : `data-profile-aura="${item.effect}"`}>
          <div class="shop-item-preview-card-line primary"></div>
          <div class="shop-item-preview-card-line"></div>
          <div class="shop-item-preview-card-line short"></div>
        </div>
      `;
    };

    const isEquipped = (item) => {
      if (item.type === 'frame') return this.user?.equippedAvatarFrame === item.effect;
      if (item.type === 'aura') return this.user?.equippedProfileAura === item.effect;
      if (item.type === 'motion') return this.user?.equippedProfileMotion === item.effect;
      if (item.type === 'badge') return this.user?.equippedProfileBadge === item.effect;
      return false;
    };

    const setEquippedValue = (item, value) => {
      if (item.type === 'frame') this.user.equippedAvatarFrame = value;
      if (item.type === 'aura') this.user.equippedProfileAura = value;
      if (item.type === 'motion') this.user.equippedProfileMotion = value;
      if (item.type === 'badge') this.user.equippedProfileBadge = value;
    };

    const saveCosmetics = () => {
      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || ''
      });
      this.syncProfileCosmetics();
    };

    const renderInventory = () => {
      const ownedItems = [...inventory]
        .map(id => catalogById.get(id))
        .filter(Boolean);

      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
      itemsCountEl.textContent = String(ownedItems.length);

      if (!ownedItems.length) {
        gridEl.innerHTML = `
          <div class="profile-items-empty">
            <strong>Інвентар порожній</strong>
            <span>Купи предмети в магазині, щоб керувати ними тут.</span>
          </div>
        `;
        return;
      }

      gridEl.innerHTML = ownedItems.map(item => {
        const equipped = isEquipped(item);
        const sellPrice = getSellPrice(item);

        return `
          <article class="shop-item-card profile-item-card ${equipped ? 'equipped' : ''}">
            <div class="shop-item-top profile-item-top">
              <span class="shop-item-type profile-item-type">${getTypeLabel(item.type)}</span>
              <span class="shop-item-price profile-item-price">Продаж: ${this.formatCoinBalance(sellPrice, 1)}</span>
            </div>
            <div class="shop-item-preview">
              ${createPreview(item)}
            </div>
            <h3 class="shop-item-title profile-item-title">${escapeHtml(item.title)}</h3>
            <p class="shop-item-description profile-item-description">${escapeHtml(item.description)}</p>
            <div class="profile-item-actions">
              <button
                type="button"
                class="shop-item-action profile-item-action profile-item-action-equip ${equipped ? 'is-equipped' : 'is-owned'}"
                data-profile-item-action="toggle-equip"
                data-profile-item-id="${item.id}"
              >${equipped ? 'Зняти з профілю' : 'Встановити в профіль'}</button>
              <button
                type="button"
                class="shop-item-action profile-item-action profile-item-action-sell can-buy"
                data-profile-item-action="sell"
                data-profile-item-id="${item.id}"
              >Продати за ${this.formatCoinBalance(sellPrice, 1)}</button>
            </div>
          </article>
        `;
      }).join('');
    };

    renderInventory();
    setView(currentView);

    viewButtons.forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const nextView = btn.dataset.profileItemsView;
        setView(nextView);
      });
    });

    if (gridEl.dataset.bound === 'true') return;
    gridEl.dataset.bound = 'true';

    gridEl.addEventListener('click', async (event) => {
      const actionBtn = event.target.closest('[data-profile-item-action]');
      if (!actionBtn) return;

      const itemId = actionBtn.dataset.profileItemId;
      const action = actionBtn.dataset.profileItemAction;
      if (!itemId || !action) return;

      const item = catalogById.get(itemId);
      if (!item || !inventory.has(item.id)) return;

      if (action === 'toggle-equip') {
        const equipped = isEquipped(item);
        setEquippedValue(item, equipped ? '' : item.effect);
        saveCosmetics();
        renderInventory();
        return;
      }

      if (action === 'sell') {
        const sellPrice = getSellPrice(item);
        const confirmed = await this.showConfirm(
          `Продати "${item.title}" за ${this.formatCoinBalance(sellPrice, 1)}?`,
          'Продаж предмета'
        );
        if (!confirmed) return;

        inventory.delete(item.id);
        this.saveShopInventory([...inventory]);

        if (isEquipped(item)) {
          setEquippedValue(item, '');
          saveCosmetics();
        }

        this.applyCoinTransaction(
          sellPrice,
          `Продаж: ${item.title}`,
          { category: 'shop' }
        );
        renderInventory();
      }
    });
  }

  initWalletLedger(settingsContainer) {
    const balanceEl = settingsContainer.querySelector('#walletBalanceValue');
    const badgeEl = settingsContainer.querySelector('#walletBalanceBadge');
    const countEl = settingsContainer.querySelector('#walletTransactionsCount');
    const listEl = settingsContainer.querySelector('#walletTransactionsList');
    if (!balanceEl || !listEl) return;

    const formatDate = (value) => {
      const parsedDate = new Date(value);
      if (Number.isNaN(parsedDate.getTime())) return '';
      return parsedDate.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const render = () => {
      const balance = this.getTapBalanceCents();
      const history = this.getCoinTransactionHistory();

      balanceEl.textContent = this.formatCoinBalance(balance);
      if (countEl) countEl.textContent = String(history.length);
      if (badgeEl) badgeEl.textContent = `Транзакцій: ${history.length}`;

      if (!history.length) {
        listEl.innerHTML = `
          <div class="wallet-history-empty">
            <strong>Транзакцій поки немає</strong>
            <span>Купуйте предмети в магазині або заробляйте монети в іграх.</span>
          </div>
        `;
        return;
      }

      listEl.innerHTML = history.map((entry) => {
        const safeAmount = Math.abs(Number(entry.amountCents) || 0);
        const isIncome = Number(entry.amountCents) > 0;
        const sign = isIncome ? '+' : '-';
        const amountText = `${sign}${this.formatCoinBalance(safeAmount)}`;
        const title = escapeHtml(entry.title || 'Транзакція');
        const dateLabel = escapeHtml(formatDate(entry.createdAt));

        return `
          <article class="wallet-history-item ${isIncome ? 'is-income' : 'is-expense'}">
            <div class="wallet-history-item-main">
              <strong>${title}</strong>
              <span>${dateLabel}</span>
            </div>
            <span class="wallet-history-item-amount">${amountText}</span>
          </article>
        `;
      }).join('');
    };

    render();
  }

  showSettingsSubsection(subsectionName, settingsContainerId, sourceSection = null) {
    const sectionMap = {
      'notifications': 'notifications-settings',
      'privacy': 'privacy-settings',
      'messages': 'messages-settings',
      'appearance': 'appearance-settings',
      'language': 'language-settings',
      'profile-items': 'profile-items'
    };
    
    const sectionName = sectionMap[subsectionName];
    if (sectionName) {
      this.settingsParentSection = sourceSection || this.settingsParentSection || 'messenger-settings';
      this.showSettings(sectionName);
    }
  }

  updateFontPreview(fontSize, displayElement, previewElement) {
    const fontSizeLabels = {
      12: 'Малий',
      13: 'Малий',
      14: 'Малий',
      15: 'Середній',
      16: 'Середній',
      17: 'Великий',
      18: 'Великий',
      19: 'Великий',
      20: 'Великий'
    };
    
    if (displayElement) {
      displayElement.textContent = fontSizeLabels[fontSize] || 'Середній';
    }
    
    if (previewElement) {
      const previewText = previewElement.querySelector('.preview-bubble p');
      const previewTime = previewElement.querySelector('.preview-time');
      
      if (previewText) {
        previewText.style.fontSize = fontSize + 'px';
      }
      if (previewTime) {
        previewTime.style.fontSize = Math.max(10, fontSize - 4) + 'px';
      }
    }
  }

  mapFontSliderToPreset(sliderValue) {
    const safeValue = Number.isFinite(sliderValue) ? sliderValue : 15;
    if (safeValue <= 14) return 'small';
    if (safeValue <= 16) return 'medium';
    return 'large';
  }

  getBlockedChatIds() {
    const stored = this.readJsonStorage('orion_blocked_chat_ids', []);
    if (!Array.isArray(stored)) return [];
    const normalized = stored
      .map(value => Number.parseInt(String(value), 10))
      .filter(value => Number.isFinite(value) && value > 0);
    return [...new Set(normalized)];
  }

  saveBlockedChatIds(ids) {
    const normalized = [...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(value => Number.parseInt(String(value), 10))
        .filter(value => Number.isFinite(value) && value > 0)
    )];

    try {
      window.localStorage.setItem('orion_blocked_chat_ids', JSON.stringify(normalized));
    } catch {
      // Ignore storage failures.
    }
    return normalized;
  }

  updateBlockedUsersSummary(settingsContainer) {
    const summaryEl = settingsContainer?.querySelector('#blockedUsersSummary');
    if (!summaryEl) return;
    const count = this.getBlockedChatIds().length;
    summaryEl.textContent = count > 0 ? `Заблоковано чатів: ${count}` : 'Список порожній';
  }

  async openBlockedUsersManager(settingsContainer) {
    const chats = Array.isArray(this.chats) ? this.chats : [];
    if (!chats.length) {
      await this.showAlert('Наразі немає чатів для блокування.');
      return;
    }

    const blockedSet = new Set(this.getBlockedChatIds());
    const preview = chats
      .slice(0, 14)
      .map(chat => `${chat.id} — ${chat.name}${blockedSet.has(chat.id) ? ' (заблоковано)' : ''}`)
      .join('\n');

    const rawValue = window.prompt(
      `Введіть ID чату для блокування/розблокування:\n${preview}`,
      ''
    );
    if (rawValue === null) return;

    const chatId = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(chatId)) {
      await this.showAlert('Невірний ID чату.');
      return;
    }

    const targetChat = chats.find(chat => chat.id === chatId);
    if (!targetChat) {
      await this.showAlert('Чат із таким ID не знайдено.');
      return;
    }

    const isBlocked = blockedSet.has(chatId);
    if (isBlocked) {
      blockedSet.delete(chatId);
    } else {
      blockedSet.add(chatId);
    }

    this.saveBlockedChatIds([...blockedSet]);
    this.updateBlockedUsersSummary(settingsContainer);
    this.renderChatsList();

    await this.showAlert(
      isBlocked
        ? `Чат "${targetChat.name}" розблоковано.`
        : `Чат "${targetChat.name}" заблоковано.`
    );
  }

  updateDesktopNotificationStatus(settingsContainer) {
    const stateEl = settingsContainer?.querySelector('#desktopNotificationState');
    const actionBtn = settingsContainer?.querySelector('#desktopNotificationActionBtn');
    if (!stateEl || !actionBtn) return;

    if (!('Notification' in window)) {
      stateEl.textContent = 'Браузер не підтримує системні сповіщення';
      actionBtn.textContent = 'Недоступно';
      actionBtn.disabled = true;
      return;
    }

    actionBtn.disabled = false;
    if (Notification.permission === 'granted') {
      stateEl.textContent = 'Доступ надано';
      actionBtn.textContent = 'Тест';
      return;
    }
    if (Notification.permission === 'denied') {
      stateEl.textContent = 'Доступ заблоковано у браузері';
      actionBtn.textContent = 'Заблоковано';
      actionBtn.disabled = true;
      return;
    }

    stateEl.textContent = 'Доступ не надано';
    actionBtn.textContent = 'Надати доступ';
  }

  async handleDesktopNotificationAction(settingsContainer) {
    if (!('Notification' in window)) {
      await this.showAlert('Цей браузер не підтримує системні сповіщення.');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification('Orion', {
        body: 'Тестове сповіщення працює.',
        silent: !this.settings?.soundNotifications
      });
      window.setTimeout(() => notification.close(), 3500);
      return;
    }

    const permission = await Notification.requestPermission();
    this.settings = {
      ...(this.settings || {}),
      desktopNotifications: permission === 'granted'
    };
    this.saveSettings(this.settings);
    this.updateDesktopNotificationStatus(settingsContainer);

    if (permission !== 'granted') {
      await this.showAlert('Браузер не надав доступ до системних сповіщень.');
    }
  }

  applyThemeMode(mode) {
    const themeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    this.settings = { ...(this.settings || {}), theme: themeMode };
    this.saveSettings(this.settings);
    this.loadTheme();
  }

  // Метод-обгортка для імпортованої функції setupSettingsSwipeBack
  setupSettingsSwipeBack(settingsContainer) {
    setupSettingsSwipeBack(settingsContainer, this);
  }

  async showSettings(sectionName) {
    // На мобільному використовуємо settingsContainerMobile, на ПК - settingsContainer
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.showBottomNav();
    } else {
      this.restoreBottomNavToHome({ animate: false });
    }
    const settingsContainerId = isMobile ? 'settingsContainerMobile' : 'settingsContainer';
    const settingsContainer = document.getElementById(settingsContainerId);
    
    const chatContainer = document.getElementById('chatContainer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatsList = document.getElementById('chatsList');
    const chatsListHeader = document.querySelector('.chats-list-header');
    
    // Hide chat and welcome screen
    if (chatContainer) chatContainer.classList.remove('active');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    const appEl = document.querySelector('.orion-app');
    if (isMobile && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    this.currentChat = null;
    this.updateChatHeader();
    if (appEl) {
      appEl.classList.remove('chat-open');
      appEl.classList.remove('chat-active');
      appEl.classList.remove('mobile-chat-open');
      appEl.classList.remove('keyboard-open');
      appEl.classList.remove('composer-focus');
      appEl.style.setProperty('--keyboard-inset', '0px');
    }
    this.setMobilePageScrollLock(false);
    
    // Hide chats list header when showing settings
    if (chatsListHeader) chatsListHeader.style.display = 'none';

    // On desktop, keep sidebar visible and keep nav inside sidebar.
    if (!isMobile) {
      const sidebar = document.querySelector('.sidebar');
      const profileMenu = document.querySelector('.profile-menu-wrapper');
      if (sidebar) {
        sidebar.style.display = '';
        sidebar.classList.remove('compact');
      }
      if (profileMenu) {
        profileMenu.classList.remove('floating-nav');
        this.restoreBottomNavToHome({ animate: false });
        this.updateBottomNavIndicator();
      }
    }
    
    // On mobile, hide chats list and search when showing settings
    const searchBox = document.querySelector('.search-box');
    if (chatsList) {
      if (isMobile) {
        chatsList.classList.add('hidden');
        if (searchBox) searchBox.style.display = 'none';
      } else {
        chatsList.classList.remove('hidden-on-settings');
      }
    }

    // On desktop, hide chat container display
    if (!isMobile && chatContainer) {
      chatContainer.style.display = 'none';
    }
    
    try {
      const htmlContent = this.getSettingsTemplate(sectionName);
      if (!htmlContent) {
        console.error('Template not found for:', sectionName);
        return;
      }
      
      settingsContainer.innerHTML = htmlContent;
      settingsContainer.classList.add('active');
      
      // Очищаємо всі попередні секції
      document.querySelectorAll('.settings-section').forEach(section => {
        if (section !== settingsContainer.querySelector('.settings-section')) {
          section.classList.remove('active');
        }
      });
      
      if (isMobile) {
        // На мобільному видаляємо всі позиційні стилі
        settingsContainer.style.cssText = `
          display: flex !important;
          position: relative !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          width: 100% !important;
          height: 100% !important;
          z-index: auto !important;
          background-color: transparent !important;
          flex-direction: column !important;
          overflow: hidden !important;
          flex: 1 !important;
          min-height: 0 !important;
        `;
      } else {
        // На ПК просто показуємо контейнер як flex item в chat-area (займає місце welcomeScreen)
        settingsContainer.style.cssText = `
          display: flex !important;
          flex: 1 !important;
          flex-direction: column !important;
          width: auto !important;
          height: 100% !important;
          position: static !important;
          overflow: hidden !important;
          background-color: var(--bg-color) !important;
          min-height: 0 !important;
        `;
      }
      
      const settingsSection = settingsContainer.querySelector('.settings-section');
      
      if (settingsSection) {
        settingsSection.classList.add('active');
        
        // Force inline styles for section
        settingsSection.style.display = 'flex';
        settingsSection.style.flexDirection = 'column';
        settingsSection.style.height = '100%';
        settingsSection.style.minHeight = '0';
        settingsSection.style.width = '100%';
      }
      
      if (sectionName === 'profile-settings') {
        this.captureProfileSettingsSnapshot();

        const profileNameInput = settingsContainer.querySelector('#profileName');
        const profileEmailInput = settingsContainer.querySelector('#profileEmail');
        const profileBioInput = settingsContainer.querySelector('#profileBio');
        const profileDobInput = settingsContainer.querySelector('#profileDob');
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        
        if (profileNameInput) profileNameInput.value = this.user.name;
        if (profileEmailInput) profileEmailInput.value = this.user.email;
        if (profileBioInput) profileBioInput.value = this.user.bio;
        if (profileDobInput) profileDobInput.value = this.user.birthDate || '';
        
        this.renderProfileAvatar(avatarDiv);

        const avatarUpload = settingsContainer.querySelector('#profileAvatarUpload');
        if (avatarUpload) {
          avatarUpload.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              await this.showAlert('Файл завеликий. Максимум 2MB.');
              avatarUpload.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              this.user.avatarImage = reader.result?.toString() || '';
              this.saveUserProfile(this.user);
              this.renderProfileAvatar(avatarDiv);
            };
            reader.readAsDataURL(file);
          });
        }
        
        const changeAvatarBtn = settingsContainer.querySelector('.btn-change-avatar');
        if (changeAvatarBtn) {
          changeAvatarBtn.addEventListener('click', () => this.handleAvatarChange(settingsContainer));
        }

        const cancelProfileBtn = settingsContainer.querySelector('.btn-cancel-profile');
        if (cancelProfileBtn) {
          cancelProfileBtn.addEventListener('click', () => {
            this.restoreProfileSettingsSnapshot();
            this.showSettings(this.settingsParentSection || 'profile');
          });
        }
      }

      if (sectionName === 'profile') {
        this.settingsParentSection = 'profile';
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        const inlineEditBtn = settingsContainer.querySelector('.profile-edit-inline');
        const profileEditMainBtn = settingsContainer.querySelector('#profileEditMainBtn');
        const profileMyItemsBtn = settingsContainer.querySelector('#profileMyItemsBtn');
        const menuItems = settingsContainer.querySelectorAll('.settings-menu-item');

        this.renderProfileAvatar(avatarDiv);
        this.applyProfileAura(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileMotion(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileBadge(settingsContainer.querySelector('#profileNameBadges'));
        this.updateProfileDisplay();
        this.updateProfileMenuButton();

        const openProfileSettings = () => this.showSettings('profile-settings');
        if (inlineEditBtn) inlineEditBtn.addEventListener('click', openProfileSettings);
        if (profileEditMainBtn) profileEditMainBtn.addEventListener('click', openProfileSettings);
        if (profileMyItemsBtn) {
          profileMyItemsBtn.addEventListener('click', () => {
            this.settingsParentSection = 'profile';
            this.showSettings('profile-items');
          });
        }

        menuItems.forEach(item => {
          item.addEventListener('click', () => {
            const subsection = item.getAttribute('data-section');
            if (subsection) {
              this.showSettingsSubsection(subsection, settingsContainerId, 'profile');
            }
          });
        });
      }

      if (sectionName === 'mini-games') {
        this.initMiniGames(settingsContainer);
      }

      if (sectionName === 'wallet') {
        this.settingsParentSection = 'wallet';
        this.initWalletLedger(settingsContainer);
      }

      if (sectionName === 'messenger-settings') {
        this.settingsParentSection = 'messenger-settings';
        this.initShop(settingsContainer);
      }

      if (sectionName === 'profile-items') {
        this.settingsParentSection = 'profile';
        this.initProfileItems(settingsContainer);
      }
      
      const bindLiveSave = (element, eventName = 'change', afterChange = null) => {
        if (!element || element.dataset.liveBound === 'true') return;
        element.dataset.liveBound = 'true';
        element.addEventListener(eventName, async () => {
          await this.saveMessengerSettings({ silent: true });
          if (typeof afterChange === 'function') afterChange();
        });
      };

      // Завантаження значень для підрозділів + live-функціонал
      if (sectionName === 'notifications-settings') {
        const soundNotif = settingsContainer.querySelector('#soundNotifications');
        const desktopNotif = settingsContainer.querySelector('#desktopNotifications');
        const vibrationEnabled = settingsContainer.querySelector('#vibrationEnabled');
        const messagePreview = settingsContainer.querySelector('#messagePreview');
        const desktopNotificationActionBtn = settingsContainer.querySelector('#desktopNotificationActionBtn');
        
        if (soundNotif) soundNotif.checked = this.settings.soundNotifications ?? true;
        if (desktopNotif) desktopNotif.checked = this.settings.desktopNotifications ?? true;
        if (vibrationEnabled) vibrationEnabled.checked = this.settings.vibrationEnabled ?? true;
        if (messagePreview) messagePreview.checked = this.settings.messagePreview ?? true;

        bindLiveSave(soundNotif);
        bindLiveSave(desktopNotif, 'change', () => this.updateDesktopNotificationStatus(settingsContainer));
        bindLiveSave(vibrationEnabled);
        bindLiveSave(messagePreview);

        this.updateDesktopNotificationStatus(settingsContainer);
        if (desktopNotificationActionBtn && desktopNotificationActionBtn.dataset.bound !== 'true') {
          desktopNotificationActionBtn.dataset.bound = 'true';
          desktopNotificationActionBtn.addEventListener('click', async () => {
            await this.handleDesktopNotificationAction(settingsContainer);
          });
        }
      }
      
      if (sectionName === 'privacy-settings') {
        const onlineStatus = settingsContainer.querySelector('#showOnlineStatus');
        const typingIndic = settingsContainer.querySelector('#showTypingIndicator');
        const readReceipts = settingsContainer.querySelector('#readReceipts');
        const lastSeen = settingsContainer.querySelector('#lastSeen');
        const twoFactorAuth = settingsContainer.querySelector('#twoFactorAuth');
        const profileVisibility = settingsContainer.querySelector('#profileVisibility');
        const hideBlockedChats = settingsContainer.querySelector('#hideBlockedChats');
        const manageBlockedUsersBtn = settingsContainer.querySelector('#manageBlockedUsersBtn');
        
        if (onlineStatus) onlineStatus.checked = this.settings.showOnlineStatus ?? true;
        if (typingIndic) typingIndic.checked = this.settings.showTypingIndicator ?? true;
        if (readReceipts) readReceipts.checked = this.settings.readReceipts ?? true;
        if (lastSeen) lastSeen.checked = this.settings.lastSeen ?? true;
        if (twoFactorAuth) twoFactorAuth.checked = this.settings.twoFactorAuth ?? true;
        if (profileVisibility) profileVisibility.value = this.settings.profileVisibility || 'friends';
        if (hideBlockedChats) hideBlockedChats.checked = this.settings.hideBlockedChats ?? true;
        this.updateBlockedUsersSummary(settingsContainer);

        bindLiveSave(onlineStatus);
        bindLiveSave(typingIndic);
        bindLiveSave(readReceipts);
        bindLiveSave(lastSeen);
        bindLiveSave(twoFactorAuth);
        bindLiveSave(profileVisibility);
        bindLiveSave(hideBlockedChats, 'change', () => this.renderChatsList());

        if (manageBlockedUsersBtn && manageBlockedUsersBtn.dataset.bound !== 'true') {
          manageBlockedUsersBtn.dataset.bound = 'true';
          manageBlockedUsersBtn.addEventListener('click', async () => {
            await this.openBlockedUsersManager(settingsContainer);
          });
        }
      }
      
      if (sectionName === 'messages-settings') {
        const enterToSend = settingsContainer.querySelector('#enterToSend');
        const autoPlayMedia = settingsContainer.querySelector('#autoPlayMedia');
        const autoSaveMedia = settingsContainer.querySelector('#autoSaveMedia');
        
        if (enterToSend) enterToSend.checked = this.settings.enterToSend ?? true;
        if (autoPlayMedia) autoPlayMedia.checked = this.settings.autoPlayMedia ?? true;
        if (autoSaveMedia) autoSaveMedia.checked = this.settings.autoSaveMedia ?? false;

        bindLiveSave(enterToSend);
        bindLiveSave(autoPlayMedia);
        bindLiveSave(autoSaveMedia);
      }
      
      if (sectionName === 'appearance-settings') {
        const fontSizeSlider = settingsContainer.querySelector('#fontSizeSlider');
        const fontSizeDisplay = settingsContainer.querySelector('#fontSizeDisplay');
        const fontPreview = settingsContainer.querySelector('#fontPreview');
        const animationsEnabled = settingsContainer.querySelector('#animationsEnabled');
        const compactMode = settingsContainer.querySelector('#compactMode');
        const themeMode = settingsContainer.querySelector('#themeMode');
        
        if (fontSizeSlider) {
          const currentFontSize = this.settings.fontSize || 'medium';
          const fontSizeMap = { 'small': 13, 'medium': 15, 'large': 18 };
          const sliderValue = fontSizeMap[currentFontSize] || 15;
          fontSizeSlider.value = sliderValue;
          
          // Функція для оновлення градієнта slider
          const updateSliderBackground = (value) => {
            const min = parseInt(fontSizeSlider.min);
            const max = parseInt(fontSizeSlider.max);
            const percentage = ((value - min) / (max - min)) * 100;
            fontSizeSlider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
          };
          
          // Оновлюємо початковий градієнт
          updateSliderBackground(sliderValue);
          
          this.updateFontPreview(sliderValue, fontSizeDisplay, fontPreview);
          
          fontSizeSlider.addEventListener('input', (e) => {
            const fontSize = parseInt(e.target.value);
            updateSliderBackground(fontSize);
            this.updateFontPreview(fontSize, fontSizeDisplay, fontPreview);
            this.applyFontSize(this.mapFontSliderToPreset(fontSize));
          });

          bindLiveSave(fontSizeSlider, 'change');
        }
        
        if (themeMode) {
          themeMode.value = this.settings.theme || 'system';
          bindLiveSave(themeMode);
        }
        
        if (animationsEnabled) animationsEnabled.checked = this.settings.animationsEnabled ?? true;
        if (compactMode) compactMode.checked = this.settings.compactMode ?? false;
        bindLiveSave(animationsEnabled);
        bindLiveSave(compactMode);
      }
      
      if (sectionName === 'language-settings') {
        const language = settingsContainer.querySelector('#language');
        if (language) language.value = this.settings.language || 'uk';
        bindLiveSave(language);
      }
      
      // Обробник кнопки назад для підрозділів
      const backSubsectionBtn = settingsContainer.querySelector('.btn-back-subsection');
      if (backSubsectionBtn) {
        backSubsectionBtn.addEventListener('click', () => {
          this.showSettings(this.settingsParentSection || 'messenger-settings');
        });
      }

      // Обробник кнопки назад для головного меню налаштувань
      const backSettingsBtn = settingsContainer.querySelector('.btn-back-settings');
      if (backSettingsBtn) {
        backSettingsBtn.addEventListener('click', () => {
          settingsContainer.classList.remove('active');
          settingsContainer.style.display = 'none';
          const section = settingsContainer.querySelector('.settings-section');
          if (section) {
            section.classList.remove('active');
          }
          // Restore chat area
          this.showWelcomeScreen();
          // Set nav back to chats
          const navChats = document.getElementById('navChats');
          if (navChats) this.setActiveNavButton(navChats);
        });
      }
      
      // Додаємо свайп для повернення назад в підрозділах
      if (sectionName !== 'messenger-settings' && sectionName !== 'profile' && sectionName !== 'calls' && sectionName !== 'mini-games') {
        this.setupSettingsSwipeBack(settingsContainer);
      }
      
      const closeButtons = settingsContainer.querySelectorAll('.btn-secondary:not(.btn-change-avatar):not(.btn-cancel-profile)');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if ((sectionName === 'profile-settings' || sectionName.endsWith('-settings')) && btn.closest('.settings-buttons')) {
            this.showSettings(this.settingsParentSection || 'profile');
            return;
          }
          settingsContainer.classList.remove('active');
        });
      });
      
      const saveProfileBtn = settingsContainer.querySelector('.btn-save-profile');
      if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
          this.saveProfileSettings();
        });
      }
      
      const saveMessengerBtn = settingsContainer.querySelector('.btn-save-messenger');
      if (saveMessengerBtn) {
        saveMessengerBtn.addEventListener('click', () => {
          this.saveMessengerSettings();
        });
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      settingsContainer.innerHTML = '<p>Помилка завантаження розділу</p>';
    }
  }

  async saveProfileSettings() {
    const container =
      document.querySelector('#profile.active, #profile-settings.active')
      || document.getElementById('profile')
      || document.getElementById('profile-settings');
    const name = container?.querySelector('#profileName')?.value;
    const email = container?.querySelector('#profileEmail')?.value;
    const bio = container?.querySelector('#profileBio')?.value;
    const birthDate = container?.querySelector('#profileDob')?.value;
    
    if (!name) {
      await this.showAlert('Будь ласка, введіть ім\'я');
      return;
    }
    
    const profileData = {
      ...this.user,
      name: name.trim(),
      email: email?.trim() || '',
      status: this.user.status || 'online',
      bio: bio?.trim() || '',
      birthDate: birthDate?.trim() || '',
      avatarColor: this.user.avatarColor,
      avatarImage: this.user.avatarImage || '',
      equippedAvatarFrame: this.user.equippedAvatarFrame || '',
      equippedProfileAura: this.user.equippedProfileAura || '',
      equippedProfileMotion: this.user.equippedProfileMotion || '',
      equippedProfileBadge: this.user.equippedProfileBadge || ''
    };
    
    this.saveUserProfile(profileData);
    await this.showNotice('Налаштування профілю збережено!');
    this.profileSettingsSnapshot = null;
    
    if (this.currentChat) {
      this.renderChat();
    }

    this.showSettings(this.settingsParentSection || 'profile');
  }

  async saveMessengerSettings(options = {}) {
    const { silent = false } = options;
    const previousSettings = { ...(this.settings || this.loadSettings()) };
    const settings = { ...previousSettings };

    const assignCheckbox = (id, key) => {
      const element = document.getElementById(id);
      if (element) settings[key] = Boolean(element.checked);
    };
    const assignValue = (id, key) => {
      const element = document.getElementById(id);
      if (element) settings[key] = element.value;
    };

    assignCheckbox('soundNotifications', 'soundNotifications');
    assignCheckbox('desktopNotifications', 'desktopNotifications');
    assignCheckbox('showOnlineStatus', 'showOnlineStatus');
    assignCheckbox('showTypingIndicator', 'showTypingIndicator');
    assignCheckbox('vibrationEnabled', 'vibrationEnabled');
    assignCheckbox('messagePreview', 'messagePreview');
    assignCheckbox('readReceipts', 'readReceipts');
    assignCheckbox('lastSeen', 'lastSeen');
    assignCheckbox('twoFactorAuth', 'twoFactorAuth');
    assignValue('profileVisibility', 'profileVisibility');
    assignCheckbox('hideBlockedChats', 'hideBlockedChats');
    assignCheckbox('enterToSend', 'enterToSend');
    assignCheckbox('autoPlayMedia', 'autoPlayMedia');
    assignCheckbox('autoSaveMedia', 'autoSaveMedia');
    assignCheckbox('animationsEnabled', 'animationsEnabled');
    assignCheckbox('compactMode', 'compactMode');
    assignValue('language', 'language');
    assignValue('themeMode', 'theme');

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
      const sliderValue = Number.parseInt(fontSizeSlider.value, 10);
      settings.fontSize = this.mapFontSliderToPreset(sliderValue);
    }

    this.saveSettings(settings);
    this.applyFontSize(settings.fontSize || 'medium');
    this.applySettingsToUI();

    if ((settings.theme || 'system') !== (previousSettings.theme || 'system')) {
      this.loadTheme();
    }

    if ((settings.hideBlockedChats ?? true) !== (previousSettings.hideBlockedChats ?? true)) {
      this.renderChatsList();
    }

    if (!silent) {
      await this.showNotice('Налаштування збережено!');
    }
  }

  applyFontSize(size) {
    const root = document.documentElement;
    switch(size) {
      case 'small':
        root.style.fontSize = '12px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'medium':
      default:
        root.style.fontSize = '16px';
    }
  }

  captureProfileSettingsSnapshot() {
    this.profileSettingsSnapshot = { ...this.user };
  }

  restoreProfileSettingsSnapshot() {
    if (!this.profileSettingsSnapshot) return;
    this.saveUserProfile({ ...this.profileSettingsSnapshot });
    this.profileSettingsSnapshot = null;
  }

  handleAvatarChange(settingsContainer) {
    const colors = [
      'linear-gradient(135deg, #6b7280, #9ca3af)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #a3a3a3)',
      'linear-gradient(135deg, #30cfd0, #330867)',
      'linear-gradient(135deg, #a8edea, #fed6e3)'
    ];

    let colorIndex = colors.findIndex(c => c === this.user.avatarColor);
    if (colorIndex === -1) colorIndex = 0;
    
    colorIndex = (colorIndex + 1) % colors.length;
    const newColor = colors[colorIndex];
    
    const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
    this.user.avatarColor = newColor;
    this.user.avatarImage = '';

    if (avatarDiv) {
      this.renderProfileAvatar(avatarDiv);
    }
  }
}
