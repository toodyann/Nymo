import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';

export function setupTapperAutoMiningRuntime({
  app,
  currentMiniGameView = 'tapper',
  tapperContentEl = null,
  tapBtn = null,
  balanceEl = null,
  levelIslandEl = null,
  levelValueEl = null,
  rewardValueEl = null,
  autoBuyBatchButtons = [],
  autoMenuToggleBtn = null,
  autoMenuCloseBtn = null,
  autoBackdropEl = null,
  autoMiningContainerEl = null,
  autoMinersEl = null,
  autoStatusTextEl = null,
  autoLastGainEl = null,
  autoPulseFillEl = null,
  tapAutoSenders = [],
  autoBuyBatchKey = '',
  autoMenuOpenKey = '',
  autoBuyBatchValues = [1, 5, 10],
  autoAwayStartTsKey = '',
  autoPendingRewardCentsKey = '',
  autoPendingRewardSecondsKey = ''
} = {}) {
  const TAP_AUTO_SENDERS = Array.isArray(tapAutoSenders) ? tapAutoSenders : [];
  const AUTO_BUY_BATCH_KEY = String(autoBuyBatchKey || '').trim();
  const AUTO_MENU_OPEN_KEY = String(autoMenuOpenKey || '').trim();
  const AUTO_BUY_BATCH_VALUES = Array.isArray(autoBuyBatchValues) ? autoBuyBatchValues : [1, 5, 10];
  const TAP_AUTO_AWAY_START_TS_KEY = String(autoAwayStartTsKey || '').trim();
  const TAP_AUTO_PENDING_REWARD_CENTS_KEY = String(autoPendingRewardCentsKey || '').trim();
  const TAP_AUTO_PENDING_REWARD_SECONDS_KEY = String(autoPendingRewardSecondsKey || '').trim();
  let handleTapperViewEnter = () => {};
  let handleTapperViewLeave = () => {};

const autoSenderCatalogById = new Map(TAP_AUTO_SENDERS.map((sender) => [sender.id, sender]));
const normalizeAutoSenderProgress = (value) => {
  const safeValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const count = Number.parseInt(safeValue.count, 10);
  const upgradeLevel = Number.parseInt(safeValue.upgradeLevel, 10);
  return {
    count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
    upgradeLevel: Number.isFinite(upgradeLevel) && upgradeLevel >= 0 ? Math.floor(upgradeLevel) : 0
  };
};
const normalizeAutoBuyBatch = (value) => {
  const parsed = Number.parseInt(value, 10);
  return AUTO_BUY_BATCH_VALUES.includes(parsed) ? parsed : 1;
};
const normalizeAutoMenuOpen = (value) => String(value || '').trim() === '1';
const formatMessageRate = (value) => {
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  return safeValue.toLocaleString('uk-UA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};
const autoSenderState = app.getTapAutoMinersState();
TAP_AUTO_SENDERS.forEach((sender) => {
  autoSenderState[sender.id] = normalizeAutoSenderProgress(autoSenderState[sender.id]);
});
app.setTapAutoMinersState(autoSenderState);

let autoBuyBatch = 1;
try {
  autoBuyBatch = normalizeAutoBuyBatch(window.localStorage.getItem(AUTO_BUY_BATCH_KEY));
} catch {
  autoBuyBatch = 1;
}

let isAutoMenuOpen = false;
try {
  isAutoMenuOpen = normalizeAutoMenuOpen(window.localStorage.getItem(AUTO_MENU_OPEN_KEY));
} catch {
  isAutoMenuOpen = false;
}
let autoMenuHideTimer = null;
if (typeof app.tapAutoMenuCleanup === 'function') {
  app.tapAutoMenuCleanup();
  app.tapAutoMenuCleanup = null;
}
const readStoredInteger = (key, fallback = 0) => {
  try {
    const raw = Number.parseInt(window.localStorage.getItem(key) || '', 10);
    return Number.isFinite(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
};
const writeStoredInteger = (key, value) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  try {
    window.localStorage.setItem(key, String(safeValue));
  } catch {
    // Ignore storage failures.
  }
  return safeValue;
};
const removeStoredValue = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};
let pendingOfflineRewardCents = Math.max(0, readStoredInteger(TAP_AUTO_PENDING_REWARD_CENTS_KEY, 0));
let pendingOfflineRewardSeconds = Math.max(0, readStoredInteger(TAP_AUTO_PENDING_REWARD_SECONDS_KEY, 0));
let lastTapAutoLiveTickTs = Date.now();

const getAutoSenderProgress = (senderId) => normalizeAutoSenderProgress(autoSenderState[senderId]);
const getAutoSenderBuyCostCents = (sender, count) => Math.max(1, Math.floor(sender.baseCostCents * Math.pow(sender.costGrowth, count)));
const getAutoSenderBulkBuyCostCents = (sender, count, batchCount) => {
  let totalCost = 0;
  for (let index = 0; index < batchCount; index += 1) {
    totalCost += getAutoSenderBuyCostCents(sender, count + index);
  }
  return totalCost;
};
const getAutoSenderUpgradeCostCents = (sender, upgradeLevel, count) => Math.max(
  1,
  Math.floor(sender.upgradeBaseCostCents * Math.pow(sender.upgradeGrowth, upgradeLevel) * Math.max(1, count))
);
const getAutoSenderUnitMessagesPerSecond = (sender, upgradeLevel) => Math.max(
  0,
  sender.baseMessagesPerSecond * (1 + upgradeLevel * sender.messageBonusPerLevel)
);
const getAutoSenderUnitIncomeCents = (sender, upgradeLevel) => Math.max(
  1,
  Math.ceil(getAutoSenderUnitMessagesPerSecond(sender, upgradeLevel) * sender.coinsPerMessageCents)
);
const getAutoSenderTotalIncomeCents = (sender) => {
  const progress = getAutoSenderProgress(sender.id);
  return progress.count * getAutoSenderUnitIncomeCents(sender, progress.upgradeLevel);
};
const getAutoSenderTotalMessagesPerSecond = (sender) => {
  const progress = getAutoSenderProgress(sender.id);
  return progress.count * getAutoSenderUnitMessagesPerSecond(sender, progress.upgradeLevel);
};
const getTapAutoIncomeRateCents = () => TAP_AUTO_SENDERS.reduce(
  (sum, sender) => sum + getAutoSenderTotalIncomeCents(sender),
  0
);
const getTapAutoMessagesRate = () => TAP_AUTO_SENDERS.reduce(
  (sum, sender) => sum + getAutoSenderTotalMessagesPerSecond(sender),
  0
);
const getTierClass = (tier) => {
  const value = String(tier || '').trim().toLowerCase();
  if (value === 'elite') return 'elite';
  if (value === 'pro') return 'pro';
  return 'starter';
};
const saveAutoBuyBatch = () => {
  try {
    window.localStorage.setItem(AUTO_BUY_BATCH_KEY, String(autoBuyBatch));
  } catch {
    // Ignore storage failures.
  }
};
const saveAutoMenuOpen = () => {
  try {
    window.localStorage.setItem(AUTO_MENU_OPEN_KEY, isAutoMenuOpen ? '1' : '0');
  } catch {
    // Ignore storage failures.
  }
};
const setAutoMenuOpen = (nextOpen, { persist = true } = {}) => {
  isAutoMenuOpen = Boolean(nextOpen);
  if (autoMenuHideTimer) {
    window.clearTimeout(autoMenuHideTimer);
    autoMenuHideTimer = null;
  }
  tapperContentEl?.classList.toggle('is-auto-menu-open', isAutoMenuOpen);
  document.body.classList.toggle('tap-auto-menu-open', isAutoMenuOpen);
  if (autoMiningContainerEl) {
    if (isAutoMenuOpen) {
      autoMiningContainerEl.hidden = false;
      autoMiningContainerEl.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        autoMiningContainerEl.classList.add('is-open');
      });
    } else {
      autoMiningContainerEl.classList.remove('is-open');
      autoMiningContainerEl.setAttribute('aria-hidden', 'true');
      autoMenuHideTimer = window.setTimeout(() => {
        if (!isAutoMenuOpen) {
          autoMiningContainerEl.hidden = true;
        }
      }, 240);
    }
  }
  if (autoBackdropEl) {
    if (isAutoMenuOpen) {
      autoBackdropEl.hidden = false;
      requestAnimationFrame(() => {
        autoBackdropEl.classList.add('is-open');
      });
    } else {
      autoBackdropEl.classList.remove('is-open');
      window.setTimeout(() => {
        if (!isAutoMenuOpen) autoBackdropEl.hidden = true;
      }, 180);
    }
  }
  if (autoMenuToggleBtn) {
    autoMenuToggleBtn.setAttribute('aria-expanded', String(isAutoMenuOpen));
    autoMenuToggleBtn.classList.toggle('is-open', isAutoMenuOpen);
    const toggleLabelEl = autoMenuToggleBtn.querySelector('.coin-auto-mining-toggle-label');
    if (toggleLabelEl) {
      toggleLabelEl.textContent = isAutoMenuOpen ? 'Закрити прокачку' : 'Відкрити прокачку';
    } else {
      autoMenuToggleBtn.textContent = isAutoMenuOpen ? 'Закрити прокачку' : 'Відкрити прокачку';
    }
  }
  if (persist) saveAutoMenuOpen();
};
const updateAutoMiningPulse = () => {
  if (!autoPulseFillEl) return;
  const elapsedMs = Math.max(0, Date.now() - lastTapAutoLiveTickTs);
  const progress = Math.max(0, Math.min(1, elapsedMs / 1000));
  autoPulseFillEl.style.width = `${Math.round(progress * 100)}%`;
};
const flashAutoMiningGain = (rewardCents) => {
  if (!Number.isFinite(rewardCents) || rewardCents <= 0) return;
  if (autoLastGainEl) {
    const autoLastGainValueEl = autoLastGainEl.querySelector('.coin-auto-mining-last-gain-value');
    if (autoLastGainValueEl) {
      autoLastGainValueEl.textContent = `+${app.formatCoinBalance(rewardCents, 1)}`;
    } else {
      autoLastGainEl.textContent = `+${app.formatCoinBalance(rewardCents, 1)}`;
    }
    autoLastGainEl.classList.add('is-live');
    if (app.tapAutoLastGainBadgeTimer) window.clearTimeout(app.tapAutoLastGainBadgeTimer);
    app.tapAutoLastGainBadgeTimer = window.setTimeout(() => {
      autoLastGainEl.classList.remove('is-live');
    }, 420);
  }
  if (!autoMiningContainerEl) return;
  autoMiningContainerEl.classList.add('is-earning');
  if (app.tapAutoMiningGainFlashTimer) window.clearTimeout(app.tapAutoMiningGainFlashTimer);
  app.tapAutoMiningGainFlashTimer = window.setTimeout(() => {
    autoMiningContainerEl.classList.remove('is-earning');
  }, 300);
};
const persistPendingOfflineReward = () => {
  pendingOfflineRewardCents = writeStoredInteger(TAP_AUTO_PENDING_REWARD_CENTS_KEY, pendingOfflineRewardCents);
  pendingOfflineRewardSeconds = writeStoredInteger(TAP_AUTO_PENDING_REWARD_SECONDS_KEY, pendingOfflineRewardSeconds);
};
const queueOfflineRewardFromAway = () => {
  const awayStartTs = Math.max(0, readStoredInteger(TAP_AUTO_AWAY_START_TS_KEY, 0));
  if (!awayStartTs) return;
  removeStoredValue(TAP_AUTO_AWAY_START_TS_KEY);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - awayStartTs) / 1000));
  if (elapsedSeconds <= 0) return;
  const incomeRateCents = getTapAutoIncomeRateCents();
  if (incomeRateCents <= 0) return;
  pendingOfflineRewardCents += incomeRateCents * elapsedSeconds;
  pendingOfflineRewardSeconds += elapsedSeconds;
  persistPendingOfflineReward();
};
const runTapperPassiveTick = ({ force = false } = {}) => {
  const now = Date.now();
  const elapsedSeconds = force
    ? Math.max(0, Math.floor((now - lastTapAutoLiveTickTs) / 1000))
    : Math.max(0, Math.floor((now - lastTapAutoLiveTickTs) / 1000));
  if (elapsedSeconds <= 0) return 0;

  lastTapAutoLiveTickTs += elapsedSeconds * 1000;
  const incomeRateCents = getTapAutoIncomeRateCents();
  if (incomeRateCents <= 0) return 0;

  const rewardCents = incomeRateCents * elapsedSeconds;
  app.setTapBalanceCents(app.getTapBalanceCents() + rewardCents, { syncBackend: false });
  flashAutoMiningGain(rewardCents);
  return rewardCents;
};
const startTapperPassiveRuntime = () => {
  app.stopTapAutoMiningRuntime({ markAway: false });
  lastTapAutoLiveTickTs = Date.now();
  app.tapAutoMiningInterval = window.setInterval(() => {
    const rewarded = runTapperPassiveTick();
    if (rewarded > 0) {
      syncTapperStats();
    } else {
      updateAutoMiningPulse();
    }
  }, 1000);
  app.tapAutoMiningPulseInterval = window.setInterval(updateAutoMiningPulse, 90);
  updateAutoMiningPulse();
};
const claimPendingOfflineReward = () => {
  if (pendingOfflineRewardCents <= 0) return false;
  const rewardCents = pendingOfflineRewardCents;
  pendingOfflineRewardCents = 0;
  pendingOfflineRewardSeconds = 0;
  persistPendingOfflineReward();

  const applied = app.applyCoinTransaction(rewardCents, 'Клікер: офлайн дохід', {
    category: 'games',
    type: 'reward',
    subtitle: 'Гра: Клікер',
    game: 'Клікер',
    source: 'Міні-гра'
  });
  if (!applied) {
    pendingOfflineRewardCents = rewardCents;
    pendingOfflineRewardSeconds = rewardSeconds;
    persistPendingOfflineReward();
    return false;
  }

  flashAutoMiningGain(rewardCents);
  return true;
};
handleTapperViewLeave = () => {
  setAutoMenuOpen(false);
  runTapperPassiveTick({ force: true });
  app.stopTapAutoMiningRuntime({ markAway: false });
  app.markTapAutoAwayStart();
};
handleTapperViewEnter = () => {
  queueOfflineRewardFromAway();
  lastTapAutoLiveTickTs = Date.now();
  startTapperPassiveRuntime();
  updateAutoMiningPulse();
  if (pendingOfflineRewardCents <= 0) return;
  if (claimPendingOfflineReward()) {
    syncTapperStats();
  }
};
const syncAutoBuyBatchControls = () => {
  autoBuyBatchButtons.forEach((buttonEl) => {
    const batchValue = normalizeAutoBuyBatch(buttonEl.dataset.autoBuyBatch);
    const isActive = batchValue === autoBuyBatch;
    buttonEl.classList.toggle('is-active', isActive);
    buttonEl.setAttribute('aria-pressed', String(isActive));
  });
};

const renderTapAutoMiners = () => {
  if (!autoMinersEl) return;
  const currentBalance = app.getTapBalanceCents();
  autoMinersEl.innerHTML = TAP_AUTO_SENDERS.map((sender) => {
    const safeTitle = escapeHtml(sender.title || 'Агент');
    const safeRole = escapeHtml(sender.role || 'Веде діалоги');
    const safeTier = escapeHtml(sender.tier || 'Starter');
    const tierClass = getTierClass(sender.tier);
    const fallbackInitial = escapeHtml((sender.title || 'A').trim().charAt(0).toUpperCase() || 'A');
    const avatarMarkup = sender.avatarSrc
      ? `<img class="coin-auto-miner-avatar" src="${escapeHtml(sender.avatarSrc)}" alt="${safeTitle}" loading="lazy" decoding="async" />`
      : `<span class="coin-auto-miner-avatar-fallback">${fallbackInitial}</span>`;
    const progress = getAutoSenderProgress(sender.id);
    const unitMessagesPerSecond = getAutoSenderUnitMessagesPerSecond(sender, progress.upgradeLevel);
    const unitIncomeCents = getAutoSenderUnitIncomeCents(sender, progress.upgradeLevel);
    const totalMessagesPerSecond = progress.count * unitMessagesPerSecond;
    const totalIncomeCents = progress.count * unitIncomeCents;
    const buyCostCents = getAutoSenderBulkBuyCostCents(sender, progress.count, autoBuyBatch);
    const nextBuyIncomeGainCents = unitIncomeCents * autoBuyBatch;
    const upgradeCostCents = getAutoSenderUpgradeCostCents(sender, progress.upgradeLevel, progress.count);
    const upgradedUnitIncomeCents = getAutoSenderUnitIncomeCents(sender, progress.upgradeLevel + 1);
    const upgradeIncomeGainCents = Math.max(0, (upgradedUnitIncomeCents - unitIncomeCents) * progress.count);
    const canBuy = currentBalance >= buyCostCents;
    const canUpgrade = progress.count > 0 && currentBalance >= upgradeCostCents;
    const affordabilityPercent = buyCostCents > 0
      ? Math.max(0, Math.min(100, Math.round((currentBalance / buyCostCents) * 100)))
      : 100;
    return `
      <article class="coin-auto-miner-card ${canBuy || canUpgrade ? 'is-affordable' : ''}">
        <div class="coin-auto-miner-headline">
          <div class="coin-auto-miner-identity">
            <span class="coin-auto-miner-avatar-wrap">${avatarMarkup}</span>
            <div class="coin-auto-miner-namebox">
              <strong class="coin-auto-miner-title">${safeTitle}</strong>
              <span class="coin-auto-miner-role">${safeRole}</span>
            </div>
          </div>
          <div class="coin-auto-miner-meta">
            <span class="coin-auto-miner-tier coin-auto-miner-tier-${tierClass}">${safeTier}</span>
          </div>
        </div>
        <div class="coin-auto-miner-metrics">
          <span>Lv.${progress.upgradeLevel} · x${progress.count} · ${formatMessageRate(totalMessagesPerSecond)} пов./с</span>
          <strong>${app.formatCoinBalance(totalIncomeCents, 1)}/с</strong>
        </div>
        <div class="coin-auto-miner-progress" role="presentation">
          <span class="coin-auto-miner-progress-fill" style="width:${affordabilityPercent}%"></span>
        </div>
        <div class="coin-auto-miner-metrics coin-auto-miner-metrics-secondary">
          <span>Наступний найм: +${app.formatCoinBalance(nextBuyIncomeGainCents, 1)}/с</span>
          <span>Прокачка: +${app.formatCoinBalance(upgradeIncomeGainCents, 1)}/с</span>
        </div>
        <div class="coin-auto-miner-actions">
          <button
            type="button"
            class="coin-auto-miner-action"
            data-auto-action="buy"
            data-auto-id="${sender.id}"
            ${canBuy ? '' : 'disabled'}
          >Найняти x${autoBuyBatch} · ${app.formatCoinBalance(buyCostCents, 1)}</button>
          <button
            type="button"
            class="coin-auto-miner-action coin-auto-miner-action-secondary"
            data-auto-action="upgrade"
            data-auto-id="${sender.id}"
            ${canUpgrade ? '' : 'disabled'}
          >Прокачати · ${app.formatCoinBalance(upgradeCostCents, 1)}</button>
        </div>
      </article>
    `;
  }).join('');
};
const loadTapSenderAvatars = async () => {
  await Promise.all(TAP_AUTO_SENDERS.map(async (sender) => {
    if (!sender || sender.avatarSrc || !sender.avatarKey) return;
    sender.avatarSrc = await app.resolveTapPersonAvatarSrc(sender.avatarKey);
  }));
};

const buyAutoSender = (sender) => {
  if (!sender) return false;
  const progress = getAutoSenderProgress(sender.id);
  const batchCount = autoBuyBatch;
  const costCents = getAutoSenderBulkBuyCostCents(sender, progress.count, batchCount);
  if (app.getTapBalanceCents() < costCents) return false;
  const spent = app.applyCoinTransaction(
    -costCents,
    `Клікер: найм ${sender.title}${batchCount > 1 ? ` x${batchCount}` : ''}`,
    {
      category: 'games',
      type: 'purchase',
      subtitle: 'Гра: Клікер',
      game: 'Клікер',
      item: sender.title,
      source: 'Міні-гра'
    }
  );
  if (!spent) return false;
  autoSenderState[sender.id] = {
    count: progress.count + batchCount,
    upgradeLevel: progress.upgradeLevel
  };
  app.setTapAutoMinersState(autoSenderState);
  return true;
};

const upgradeAutoSender = (sender) => {
  if (!sender) return false;
  const progress = getAutoSenderProgress(sender.id);
  if (progress.count < 1) return false;
  const costCents = getAutoSenderUpgradeCostCents(sender, progress.upgradeLevel, progress.count);
  if (app.getTapBalanceCents() < costCents) return false;
  const spent = app.applyCoinTransaction(-costCents, `Клікер: прокачка ${sender.title}`, {
    category: 'games',
    type: 'purchase',
    subtitle: 'Гра: Клікер',
    game: 'Клікер',
    item: sender.title,
    source: 'Міні-гра'
  });
  if (!spent) return false;
  autoSenderState[sender.id] = {
    count: progress.count,
    upgradeLevel: progress.upgradeLevel + 1
  };
  app.setTapAutoMinersState(autoSenderState);
  return true;
};

if (autoMinersEl && autoMinersEl.dataset.bound !== 'true') {
  autoMinersEl.dataset.bound = 'true';
  autoMinersEl.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const buttonEl = event.target.closest('.coin-auto-miner-action');
    if (!buttonEl || buttonEl.disabled) return;
    const sender = autoSenderCatalogById.get(buttonEl.dataset.autoId || '');
    const action = buttonEl.dataset.autoAction || '';
    if (!sender || !action) return;
    if (action === 'buy') {
      buyAutoSender(sender);
    } else if (action === 'upgrade') {
      upgradeAutoSender(sender);
    }
    syncTapperStats();
  });
}

autoBuyBatchButtons.forEach((buttonEl) => {
  if (buttonEl.dataset.bound === 'true') return;
  buttonEl.dataset.bound = 'true';
  buttonEl.addEventListener('click', () => {
    const nextBatch = normalizeAutoBuyBatch(buttonEl.dataset.autoBuyBatch);
    if (nextBatch === autoBuyBatch) return;
    autoBuyBatch = nextBatch;
    saveAutoBuyBatch();
    syncTapperStats();
  });
});

if (autoMenuToggleBtn && autoMenuToggleBtn.dataset.bound !== 'true') {
  autoMenuToggleBtn.dataset.bound = 'true';
  autoMenuToggleBtn.addEventListener('click', () => {
    setAutoMenuOpen(!isAutoMenuOpen);
  });
}
if (autoMenuCloseBtn && autoMenuCloseBtn.dataset.bound !== 'true') {
  autoMenuCloseBtn.dataset.bound = 'true';
  autoMenuCloseBtn.addEventListener('click', () => {
    setAutoMenuOpen(false);
  });
}
if (autoBackdropEl && autoBackdropEl.dataset.bound !== 'true') {
  autoBackdropEl.dataset.bound = 'true';
  autoBackdropEl.addEventListener('click', () => {
    setAutoMenuOpen(false);
  });
}
const handleAutoMenuEscape = (event) => {
  if (!isAutoMenuOpen) return;
  if (event.key !== 'Escape') return;
  event.preventDefault();
  setAutoMenuOpen(false);
};
document.addEventListener('keydown', handleAutoMenuEscape);
app.tapAutoMenuCleanup = () => {
  document.removeEventListener('keydown', handleAutoMenuEscape);
  if (autoMenuHideTimer) {
    window.clearTimeout(autoMenuHideTimer);
    autoMenuHideTimer = null;
  }
  document.body.classList.remove('tap-auto-menu-open');
  tapperContentEl?.classList.remove('is-auto-menu-open');
  if (autoMiningContainerEl) {
    autoMiningContainerEl.classList.remove('is-open');
    autoMiningContainerEl.hidden = true;
    autoMiningContainerEl.setAttribute('aria-hidden', 'true');
  }
  if (autoBackdropEl) {
    autoBackdropEl.classList.remove('is-open');
    autoBackdropEl.hidden = true;
  }
};
setAutoMenuOpen(isAutoMenuOpen, { persist: false });

const syncTapperStats = () => {
  const stats = app.getTapLevelStats();
  const autoRateCents = getTapAutoIncomeRateCents();
  const hiredCount = TAP_AUTO_SENDERS.reduce((sum, sender) => sum + getAutoSenderProgress(sender.id).count, 0);
  balanceEl.textContent = app.formatCoinBalance(app.getTapBalanceCents());

  if (levelValueEl) {
    levelValueEl.textContent = String(stats.level);
  }
  if (levelIslandEl) {
    const progressPercent = Math.max(0, Math.min(100, Math.round(stats.levelProgress * 100)));
    levelIslandEl.style.setProperty('--coin-level-progress', `${progressPercent}%`);
  }
  if (rewardValueEl) {
    rewardValueEl.textContent = app.formatCoinBalance(stats.rewardPerTapCents, 1);
  }
  if (autoStatusTextEl) {
    autoStatusTextEl.textContent = `Команда ${hiredCount} · x${autoBuyBatch} · дохід ${app.formatCoinBalance(autoRateCents, 1)}/с`;
  }
  if (autoMiningContainerEl) {
    autoMiningContainerEl.classList.toggle('is-idle', autoRateCents <= 0);
  }
  syncAutoBuyBatchControls();
  renderTapAutoMiners();
  updateAutoMiningPulse();
};

app.setTapBalanceCents(app.getTapBalanceCents());
app.setTapTotalClicks(app.getTapTotalClicks());
syncTapperStats();
app.stopTapAutoMiningRuntime({ markAway: false });
if (currentMiniGameView === 'tapper') {
  handleTapperViewEnter();
} else {
  handleTapperViewLeave();
}
void loadTapSenderAvatars().then(() => {
  syncTapperStats();
});

if (tapBtn.dataset.bound !== 'true') {
  tapBtn.dataset.bound = 'true';

let tapAnimationTimer = null;
let lastTapTimestamp = Number.NEGATIVE_INFINITY;
const TAP_DEDUPE_MS = 40;

tapBtn.addEventListener('click', (event) => {
  const eventTimestamp = typeof event.timeStamp === 'number' ? event.timeStamp : performance.now();
  if (eventTimestamp - lastTapTimestamp < TAP_DEDUPE_MS) return;
  lastTapTimestamp = eventTimestamp;

  const levelStats = app.getTapLevelStats();
  const rewardCents = levelStats.rewardPerTapCents;
  const currentBalance = app.getTapBalanceCents();
  app.setTapBalanceCents(currentBalance + rewardCents, {
    transactionMeta: {
      title: 'Гра: Клікер',
      category: 'games',
      amountCents: rewardCents
    }
  });
  app.setTapTotalClicks(levelStats.totalClicks + 1);
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

  return {
    handleTapperViewEnter,
    handleTapperViewLeave,
    syncTapperStats
  };
}
