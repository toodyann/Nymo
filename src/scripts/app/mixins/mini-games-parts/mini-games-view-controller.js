export function setupMiniGameViewController({
  settingsContainer = null,
  miniGamesSection = null,
  gameSelectButtons = [],
  gamePanels = [],
  miniGameViewKey = 'orionMiniGameView',
  normalizeMiniGameView = (value) => value,
  getCurrentMiniGameView = () => 'tapper',
  setCurrentMiniGameView = () => {},
  getTapperViewHandlers = () => ({
    handleTapperViewEnter: () => {},
    handleTapperViewLeave: () => {}
  }),
  onGridViewLeave = () => {},
  onFlappyViewEnter = () => {},
  onFlappyViewLeave = () => {},
  onDriftViewEnter = () => {},
  onDriftViewLeave = () => {},
  lockLandscapeForDrift = () => {},
  lockPortraitForApp = () => {},
  unlockOrientationIfAvailable = () => {},
  applyMiniGameContainerBackground = () => {}
} = {}) {
  const setMiniGameView = (view) => {
    const safeView = normalizeMiniGameView(view);
    const previousView = getCurrentMiniGameView();

    setCurrentMiniGameView(safeView);

    if (miniGamesSection) {
      miniGamesSection.dataset.activeMiniGame = safeView;
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      if (isMobileViewport) {
        miniGamesSection.dataset.mobileMiniGameFullscreen = safeView === 'tapper' ? 'false' : 'true';
        const appEl = document.querySelector('.orion-app');
        if (appEl) {
          appEl.classList.toggle('mobile-game-fullscreen', safeView !== 'tapper');
        }
      } else {
        delete miniGamesSection.dataset.mobileMiniGameFullscreen;
        const appEl = document.querySelector('.orion-app');
        if (appEl) {
          appEl.classList.remove('mobile-game-fullscreen');
        }
      }

      if (isMobileViewport && safeView === 'drift') {
        lockLandscapeForDrift();
      } else if (isMobileViewport) {
        lockPortraitForApp();
      } else {
        unlockOrientationIfAvailable();
      }

      applyMiniGameContainerBackground(safeView);
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

    if (safeView !== 'grid2048') {
      onGridViewLeave();
    }

    if (safeView !== 'flappy') {
      onFlappyViewLeave();
    } else {
      onFlappyViewEnter();
    }

    if (safeView !== 'drift') {
      onDriftViewLeave();
    } else {
      onDriftViewEnter();
    }

    try {
      window.localStorage.setItem(miniGameViewKey, safeView);
    } catch {
      // Ignore storage failures.
    }

    const tapperHandlers = getTapperViewHandlers() || {};
    if (previousView === 'tapper' && safeView !== 'tapper') {
      tapperHandlers.handleTapperViewLeave?.();
    }
    if (previousView !== 'tapper' && safeView === 'tapper') {
      tapperHandlers.handleTapperViewEnter?.();
    }
  };

  const addMobileGameCenterBackButtons = () => {
    if (!settingsContainer) return;

    const panelsWithHeader = settingsContainer.querySelectorAll('.mini-game-panel.mini-game-view[data-mini-game-panel]');
    panelsWithHeader.forEach((panelEl) => {
      const panelName = panelEl.dataset.miniGamePanel;
      if (!panelName || panelName === 'tapper') return;

      const headerEl = panelEl.querySelector('.mini-game-view-header');
      if (!headerEl || headerEl.querySelector('[data-mini-game-mobile-back]')) return;

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'mini-game-mobile-back';
      backBtn.setAttribute('data-mini-game-mobile-back', 'true');
      backBtn.setAttribute('aria-label', 'Повернутись в ігровий центр');
      backBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
        </svg>
      `;
      backBtn.addEventListener('click', () => setMiniGameView('tapper'));
      headerEl.prepend(backBtn);
    });
  };

  const bindGameSelectButtons = () => {
    gameSelectButtons.forEach((buttonEl) => {
      if (buttonEl.dataset.bound === 'true') return;
      buttonEl.dataset.bound = 'true';
      buttonEl.addEventListener('click', () => {
        setMiniGameView(buttonEl.dataset.miniGameSelect || 'tapper');
      });
    });
  };

  return {
    setMiniGameView,
    addMobileGameCenterBackButtons,
    bindGameSelectButtons
  };
}
