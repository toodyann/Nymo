import { setupSettingsSwipeBack } from '../../../shared/gestures/swipe-handlers.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import {
  getAuthSession,
  setAuthSession,
  syncLegacyUserProfile
} from '../../../shared/auth/auth-session.js';
import {
  flappyCoinSoundUrl,
  flappyWingSoundUrl,
  flappyDieSoundUrl,
  TAP_PERSONS_AVATAR_POOL,
  TAP_PERSONS_AVATAR_IMPORTER_BY_KEY,
  TAP_AUTO_AWAY_START_TS_KEY,
  TAP_AUTO_PENDING_REWARD_CENTS_KEY,
  TAP_AUTO_PENDING_REWARD_SECONDS_KEY,
  ORION_DRIVE_SHOP_CARS,
  ORION_DRIVE_CAR_PHYSICS_DEFAULT,
  ORION_DRIVE_CAR_PHYSICS,
  ORION_DRIVE_SMOKE_DEFAULT,
  ORION_DRIVE_SHOP_SMOKE_COLORS,
  createOrionDriveGltfLoader
} from '../features-parts/index.js';
import { ChatAppFeaturesMiniGamesMethods } from './features-mini-games-methods.js';

export class ChatAppFeaturesProfileWalletMethods extends ChatAppFeaturesMiniGamesMethods {
  initProfileItems(settingsContainer, options = {}) {
    const balanceEl = settingsContainer.querySelector('#profileItemsBalance');
    const itemsCountEl = settingsContainer.querySelector('#profileItemsCount');
    const gridEl = settingsContainer.querySelector('#profileItemsGrid');
    const viewButtons = settingsContainer.querySelectorAll('[data-profile-items-view]');
    if (!balanceEl || !itemsCountEl || !gridEl) return;
    const scope = options?.scope === 'games' ? 'games' : 'all';

    const inventory = new Set(this.loadShopInventory());
    const shopCatalog = [
      ...this.getShopCatalog(),
      ...this.getOrionDriveCarCatalog(),
      ...this.getOrionDriveSmokeCatalog()
    ];
    const catalogById = new Map(shopCatalog.map(item => [item.id, item]));
    const carPreviewCache = this.shopCarPreviewCache instanceof Map ? this.shopCarPreviewCache : new Map();
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
      if (type === 'car') return 'Авто Nymo Drive';
      if (type === 'smoke') return 'Дим Nymo Drive';
      return 'Предмет';
    };

    const isGameItem = (item) => item?.type === 'car' || item?.type === 'smoke';

    const createPreview = (item) => {
      if (item.type === 'frame') {
        return `
          <div class="shop-item-preview-avatar" data-avatar-frame="${item.effect}">
            <span>${this.getInitials(this.user?.name || 'Користувач Nymo')}</span>
          </div>
        `;
      }

      if (item.type === 'badge') {
        return `
          <div class="shop-item-preview-badges">
            <span class="shop-item-preview-name">${escapeHtml(this.user?.name || 'Nymo')}</span>
            ${this.getProfileBadgeMarkup(item.effect, 'shop-item-preview-badge-chip')}
          </div>
        `;
      }

      if (item.type === 'car') {
        const cachedPreview = carPreviewCache.get(item.effect);
        const previewSrc = cachedPreview || item.previewSrc;
        const qualityClass = cachedPreview ? 'is-enhanced' : 'is-fallback';
        return `
          <div class="shop-item-preview-vehicle">
            <img
              class="shop-item-preview-vehicle-image ${qualityClass}"
              src="${previewSrc}"
              alt="${escapeHtml(item.title)}"
              loading="lazy"
              data-shop-car-effect="${this.escapeAttr(item.effect)}"
            />
          </div>
        `;
      }

      if (item.type === 'smoke') {
        return `
          <div
            class="shop-item-preview-smoke"
            style="--shop-smoke-color: ${this.escapeAttr(item.previewColor || '#aeb7c4')}; --shop-smoke-accent: ${this.escapeAttr(item.previewAccent || '#dee5f0')};"
          >
            <span class="shop-item-preview-smoke-aura" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-1" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-2" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-3" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-4" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-5" aria-hidden="true"></span>
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
      if (item.type === 'car') return this.user?.equippedDriveCar === item.effect;
      if (item.type === 'smoke') return this.user?.equippedDriveSmokeColor === item.effect;
      return false;
    };

    const setEquippedValue = (item, value) => {
      if (item.type === 'frame') this.user.equippedAvatarFrame = value;
      if (item.type === 'aura') this.user.equippedProfileAura = value;
      if (item.type === 'motion') this.user.equippedProfileMotion = value;
      if (item.type === 'badge') this.user.equippedProfileBadge = value;
      if (item.type === 'car') this.user.equippedDriveCar = value;
      if (item.type === 'smoke') this.user.equippedDriveSmokeColor = value;
    };

    const saveCosmetics = () => {
      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || '',
        equippedDriveCar: this.user.equippedDriveCar || '',
        equippedDriveSmokeColor: this.user.equippedDriveSmokeColor || ''
      });
      this.syncProfileCosmetics();
    };

    const renderInventory = () => {
      const ownedItems = [...inventory]
        .map(id => catalogById.get(id))
        .filter(Boolean)
        .filter((item) => (scope === 'games' ? isGameItem(item) : true));

      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
      itemsCountEl.textContent = String(ownedItems.length);

      if (!ownedItems.length) {
        gridEl.innerHTML = `
          <div class="profile-items-empty">
            <strong>${scope === 'games' ? 'Ігрових предметів поки немає' : 'Інвентар порожній'}</strong>
            <span>${scope === 'games' ? 'Купи предмети Nymo Drive у магазині, щоб керувати ними тут.' : 'Купи предмети в магазині, щоб керувати ними тут.'}</span>
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
              >Продати за&nbsp;<span class="currency-value-inline">${this.formatCoinBalance(sellPrice, 1)}</span></button>
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


  initWalletLedger(settingsContainer, options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const balanceEl = settingsContainer.querySelector('#walletBalanceValue');
    const badgeEl = settingsContainer.querySelector('#walletBalanceBadge');
    const countEl = settingsContainer.querySelector('#walletTransactionsCount');
    const listEl = settingsContainer.querySelector('#walletTransactionsList');
    const paginationEl = settingsContainer.querySelector('#walletTransactionsPagination');
    const paginationPrevBtn = settingsContainer.querySelector('#walletTransactionsPrevPage');
    const paginationNextBtn = settingsContainer.querySelector('#walletTransactionsNextPage');
    const paginationPagesEl = settingsContainer.querySelector('#walletTransactionsPages');
    const walletQuickActionButtons = [...settingsContainer.querySelectorAll('[data-wallet-quick-action]')];
    const walletTransferModalEl = settingsContainer.querySelector('#walletTransferModal');
    const walletTransferCloseEls = [...settingsContainer.querySelectorAll('[data-wallet-modal-close]')];
    const walletTransferToUserIdEl = settingsContainer.querySelector('#walletTransferToUserId');
    const walletTransferAmountEl = settingsContainer.querySelector('#walletTransferAmount');
    const walletTransferRecipientSearchEl = settingsContainer.querySelector('#walletTransferRecipientSearch');
    const walletTransferRecipientPreviewEl = settingsContainer.querySelector('#walletTransferRecipientPreview');
    const walletTransferStatusEl = settingsContainer.querySelector('#walletTransferStatus');
    const walletTransferSubmitEl = settingsContainer.querySelector('#walletTransferSubmit');
    const walletReceiveModalEl = settingsContainer.querySelector('#walletReceiveModal');
    const walletReceiveCloseEls = [...settingsContainer.querySelectorAll('[data-wallet-receive-close]')];
    const walletReceiveUserIdEl = settingsContainer.querySelector('#walletReceiveUserId');
    const walletReceiveStatusEl = settingsContainer.querySelector('#walletReceiveStatus');
    const walletReceiveCopyBtn = settingsContainer.querySelector('#walletReceiveCopyBtn');
    const walletIncomingTransferNoticeEl = settingsContainer.querySelector('#walletIncomingTransferNotice');
    const walletViewButtons = [...settingsContainer.querySelectorAll('[data-wallet-view]')];
    const walletPanels = [...settingsContainer.querySelectorAll('[data-wallet-panel]')];
    const analyticsIncomeEl = settingsContainer.querySelector('#walletAnalyticsIncome');
    const analyticsExpenseEl = settingsContainer.querySelector('#walletAnalyticsExpense');
    const analyticsNetEl = settingsContainer.querySelector('#walletAnalyticsNet');
    const analyticsBarsTitleEl = settingsContainer.querySelector('#walletAnalyticsBarsTitle');
    const analyticsLineTitleEl = settingsContainer.querySelector('#walletAnalyticsLineTitle');
    const analyticsBarsEl = settingsContainer.querySelector('#walletAnalyticsBars');
    const analyticsAreaEl = settingsContainer.querySelector('#walletAnalyticsArea');
    const analyticsLineChartEl = settingsContainer.querySelector('#walletAnalyticsLineChart');
    const analyticsLineEl = settingsContainer.querySelector('#walletAnalyticsLine');
    const analyticsZeroLineEl = settingsContainer.querySelector('#walletAnalyticsZeroLine');
    const analyticsPointsEl = settingsContainer.querySelector('#walletAnalyticsPoints');
    const analyticsLineWrapEl = settingsContainer.querySelector('#walletAnalyticsLineWrap');
    const analyticsLineTooltipEl = settingsContainer.querySelector('#walletAnalyticsLineTooltip');
    const analyticsLineStartDayEl = settingsContainer.querySelector('#walletAnalyticsLineStartDay');
    const analyticsLineEndDayEl = settingsContainer.querySelector('#walletAnalyticsLineEndDay');
    const analyticsDonutEl = settingsContainer.querySelector('#walletAnalyticsDonut');
    const analyticsDonutSegmentsEl = settingsContainer.querySelector('#walletAnalyticsDonutSegments');
    const analyticsDonutCenterLabelEl = settingsContainer.querySelector('#walletAnalyticsDonutCenterLabel');
    const analyticsDonutCenterValueEl = settingsContainer.querySelector('#walletAnalyticsDonutCenterValue');
    const analyticsSourcesEl = settingsContainer.querySelector('#walletAnalyticsSourceList');
    const analyticsRangeControlEls = [
      ...settingsContainer.querySelectorAll('[data-analytics-range-control]')
    ];
    const analyticsModeControlEl = settingsContainer.querySelector('#walletAnalyticsMode');
    const analyticsFocusLabelEl = settingsContainer.querySelector('#walletAnalyticsFocusLabel');
    const analyticsFocusValueEl = settingsContainer.querySelector('#walletAnalyticsFocusValue');
    const analyticsFocusMetaEl = settingsContainer.querySelector('#walletAnalyticsFocusMeta');
    const donutPalette = ['#64e6bf', '#63beff', '#f7cb67', '#b89aff', '#ff94b8'];
    const donutMutedPalette = [
      'rgba(100, 230, 191, 0.3)',
      'rgba(99, 190, 255, 0.3)',
      'rgba(247, 203, 103, 0.3)',
      'rgba(184, 154, 255, 0.3)',
      'rgba(255, 148, 184, 0.3)'
    ];
    const analyticsSourceColorMap = {
      'ігри': { color: '#58b8ff', mutedColor: 'rgba(88, 184, 255, 0.28)' },
      'списання': { color: '#ff6b8a', mutedColor: 'rgba(255, 107, 138, 0.28)' },
      'магазин': { color: '#f7b84f', mutedColor: 'rgba(247, 184, 79, 0.28)' },
      'перекази': { color: '#a58bff', mutedColor: 'rgba(165, 139, 255, 0.28)' },
      'бонуси': { color: '#5fd8d0', mutedColor: 'rgba(95, 216, 208, 0.28)' },
      'інше': { color: '#9db0c9', mutedColor: 'rgba(157, 176, 201, 0.26)' }
    };
    const readCssVarColor = (name, fallback) => {
      try {
        const resolved = window.getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim();
        return resolved || fallback;
      } catch {
        return fallback;
      }
    };
    const getWalletIncomeColor = () => readCssVarColor('--wallet-income-color', '#3ed08b');
    const getWalletIncomeMutedColor = () => `color-mix(in srgb, ${getWalletIncomeColor()} 28%, transparent)`;
    const analyticsModeLabels = {
      net: 'Чистий результат',
      income: 'Дохід',
      expense: 'Витрати'
    };
    let analyticsDonutSegments = [];
    let analyticsActiveSourceIndex = null;
    let analyticsDailySeries = [];
    let analyticsLinePoints = [];
    let analyticsLineViewportWidth = 300;
    let analyticsLineViewportHeight = 120;
    let analyticsMode = 'net';
    let analyticsRangeDays = 14;
    let analyticsPeriodIncome = 0;
    let analyticsPeriodExpense = 0;
    let analyticsPeriodNet = 0;
    let analyticsPeriodTransactions = 0;
    let analyticsActiveDayKey = '';
    const walletTransactionsPageSize = 20;
    let walletTransactionsPage = 1;
    let walletTransactionsTotalPages = 1;
    let walletTransactionsTotalCount = 0;
    let walletTransactionsPageEntries = [];
    let walletTransactionsLoading = false;
    let walletTransactionsLoadedFromBackend = false;
    let walletTransactionsRequestNonce = 0;
    const walletTransactionsPageCache = new Map();
    let walletTransactionsBackendMode = 'unknown';
    let walletTransactionsFullListEntries = [];
    let walletTransferSubmitting = false;
    let walletTransferSearchTimer = null;
    let walletTransferSearchRequestId = 0;
    let walletTransferSearchResults = [];
    let walletTransferSelectedRecipient = null;
    let walletRefreshSubmitting = false;
    let walletIncomingTransferNoticeTimer = null;
    if (!balanceEl || !listEl) return;
    if (!(this.walletIncomingTransferNotifiedIds instanceof Set)) {
      this.walletIncomingTransferNotifiedIds = new Set();
    }

    const forceHideModal = (modalEl) => {
      if (!(modalEl instanceof HTMLElement)) return;
      const closeTimerId = Number(modalEl.dataset.closeTimerId || 0);
      const openRafId = Number(modalEl.dataset.openRafId || 0);
      if (closeTimerId > 0) {
        window.clearTimeout(closeTimerId);
      }
      if (openRafId > 0) {
        window.cancelAnimationFrame(openRafId);
      }
      modalEl.dataset.closeTimerId = '';
      modalEl.dataset.openRafId = '';
      modalEl.classList.remove('is-open');
      modalEl.hidden = true;
    };

    const setModalState = (modalEl, isOpen) => {
      if (!(modalEl instanceof HTMLElement)) return;
      const closeTimerId = Number(modalEl.dataset.closeTimerId || 0);
      const openRafId = Number(modalEl.dataset.openRafId || 0);
      if (closeTimerId > 0) {
        window.clearTimeout(closeTimerId);
        modalEl.dataset.closeTimerId = '';
      }
      if (openRafId > 0) {
        window.cancelAnimationFrame(openRafId);
        modalEl.dataset.openRafId = '';
      }
      if (isOpen) {
        modalEl.hidden = false;
        const nextRafId = window.requestAnimationFrame(() => {
          modalEl.classList.add('is-open');
          modalEl.dataset.openRafId = '';
        });
        modalEl.dataset.openRafId = String(nextRafId);
        return;
      }
      modalEl.classList.remove('is-open');
      const nextTimerId = window.setTimeout(() => {
        if (!modalEl.classList.contains('is-open')) {
          modalEl.hidden = true;
        }
        modalEl.dataset.closeTimerId = '';
      }, 180);
      modalEl.dataset.closeTimerId = String(nextTimerId);
    };

    forceHideModal(walletTransferModalEl);
    forceHideModal(walletReceiveModalEl);

    const resolveCurrentUserId = () => String(
      this.user?.id
      || this.user?.userId
      || this.user?._id
      || ''
    ).trim();

    const setTransferStatus = (message = '', tone = 'neutral') => {
      if (!(walletTransferStatusEl instanceof HTMLElement)) return;
      const safeMessage = String(message || '').trim();
      walletTransferStatusEl.hidden = !safeMessage;
      walletTransferStatusEl.textContent = safeMessage;
      walletTransferStatusEl.dataset.tone = safeMessage ? tone : '';
    };

    const setReceiveStatus = (message = '', tone = 'neutral') => {
      if (!(walletReceiveStatusEl instanceof HTMLElement)) return;
      const safeMessage = String(message || '').trim();
      walletReceiveStatusEl.hidden = !safeMessage;
      walletReceiveStatusEl.textContent = safeMessage;
      walletReceiveStatusEl.dataset.tone = safeMessage ? tone : '';
    };

    const normalizeUserTag = (value = '') => {
      const safeValue = String(value || '').trim();
      if (!safeValue) return '';
      if (typeof this.normalizeTagQuery === 'function') {
        return this.normalizeTagQuery(safeValue);
      }
      return safeValue.toLowerCase().replace(/^@+/, '');
    };

    const buildWalletTransferRecipient = (user = null, fallbackId = '') => {
      const source = user && typeof user === 'object' ? user : {};
      const id = String(source.id || source.userId || source._id || fallbackId || '').trim();
      if (!id) return null;
      const name = typeof this.getUserDisplayName === 'function'
        ? this.getUserDisplayName(source)
        : (String(source.nickname || source.name || 'Користувач').trim() || 'Користувач');
      const tag = typeof this.getUserTag === 'function'
        ? this.getUserTag(source)
        : String(source.tag || source.username || '').trim().replace(/^@+/, '');
      const avatarImage = this.getAvatarImage(
        source.avatarImage
        || source.avatarUrl
        || source.image
        || source.photoUrl
        || source.picture
        || ''
      );
      const avatarColor = String(
        source.avatarColor
        || (typeof this.getContactColor === 'function' ? this.getContactColor(name) : '')
      ).trim();
      return {
        id,
        name,
        tag,
        avatarImage,
        avatarColor
      };
    };

    const renderWalletTransferRecipient = (recipient = null) => {
      if (!(walletTransferRecipientPreviewEl instanceof HTMLElement)) return;
      if (!recipient || !recipient.id) {
        walletTransferRecipientPreviewEl.hidden = true;
        walletTransferRecipientPreviewEl.innerHTML = '';
        return;
      }
      const displayName = String(recipient.name || 'Користувач').trim() || 'Користувач';
      const shortId = recipient.id.length > 16
        ? `${recipient.id.slice(0, 7)}...${recipient.id.slice(-4)}`
        : recipient.id;
      const detailText = recipient.tag
        ? `@${recipient.tag} · ID ${shortId}`
        : `ID ${shortId}`;
      const avatarHtml = typeof this.getChatAvatarHtml === 'function'
        ? this.getChatAvatarHtml({
          name: displayName,
          avatarImage: recipient.avatarImage,
          avatarColor: recipient.avatarColor
        }, 'wallet-transfer-recipient-avatar')
        : `<div class="wallet-transfer-recipient-avatar">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>`;

      walletTransferRecipientPreviewEl.innerHTML = `
        ${avatarHtml}
        <span class="wallet-transfer-recipient-copy">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(detailText)}</span>
        </span>
      `.trim();
      walletTransferRecipientPreviewEl.hidden = false;
    };

    const renderWalletTransferSearch = ({ items = [], message = '' } = {}) => {
      if (!(walletTransferRecipientSearchEl instanceof HTMLElement)) return;
      const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
      const safeMessage = String(message || '').trim();

      if (!safeItems.length) {
        walletTransferRecipientSearchEl.innerHTML = safeMessage
          ? `<p class="wallet-transfer-search-empty">${escapeHtml(safeMessage)}</p>`
          : '';
        walletTransferRecipientSearchEl.hidden = !safeMessage;
        return;
      }

      walletTransferRecipientSearchEl.innerHTML = safeItems.map((recipient) => {
        const displayName = String(recipient.name || 'Користувач').trim() || 'Користувач';
        const detail = recipient.tag
          ? `@${recipient.tag} · ${recipient.id.slice(0, 7)}...${recipient.id.slice(-4)}`
          : recipient.id;
        const avatarHtml = typeof this.getChatAvatarHtml === 'function'
          ? this.getChatAvatarHtml({
            name: displayName,
            avatarImage: recipient.avatarImage,
            avatarColor: recipient.avatarColor
          }, 'wallet-transfer-recipient-avatar')
          : `<div class="wallet-transfer-recipient-avatar">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>`;
        const isSelected = walletTransferSelectedRecipient && walletTransferSelectedRecipient.id === recipient.id;
        return `
          <button
            type="button"
            class="wallet-transfer-search-option${isSelected ? ' is-selected' : ''}"
            data-wallet-transfer-recipient-id="${escapeHtml(recipient.id)}"
          >
            ${avatarHtml}
            <span class="wallet-transfer-search-copy">
              <strong>${escapeHtml(displayName)}</strong>
              <span>${escapeHtml(detail)}</span>
            </span>
          </button>
        `.trim();
      }).join('');
      walletTransferRecipientSearchEl.hidden = false;
    };

    const collectWalletTransferKnownUsers = () => {
      const localUsers = [];
      if (typeof this.collectKnownUsersForSearch === 'function') {
        localUsers.push(this.collectKnownUsersForSearch());
      }
      if (Array.isArray(this.allRegisteredUsersCache) && this.allRegisteredUsersCache.length) {
        localUsers.push(this.allRegisteredUsersCache);
      }
      if (typeof this.mergeNormalizedUsers === 'function') {
        return this.mergeNormalizedUsers(...localUsers);
      }
      return localUsers.flat().filter(Boolean);
    };

    const listWalletTransferRecipientsFromUsers = (users = [], inputValue = '') => {
      const safeUsers = Array.isArray(users) ? users : [];
      if (!safeUsers.length) return [];
      const trimmed = String(inputValue || '').trim();
      const ranked = typeof this.rankUsersByQuery === 'function'
        ? this.rankUsersByQuery(safeUsers, trimmed)
        : safeUsers;
      const recipients = [];
      const seenIds = new Set();
      ranked.forEach((user) => {
        const recipient = buildWalletTransferRecipient(user);
        if (!recipient?.id || seenIds.has(recipient.id)) return;
        seenIds.add(recipient.id);
        recipients.push(recipient);
      });
      return recipients;
    };

    const getWalletTransferRecipientSearchResults = async (inputValue = '', { includeRemote = true } = {}) => {
      const trimmed = String(inputValue || '').trim();
      if (!trimmed) return [];
      if (trimmed.length < 2) return [];
      const remoteQuery = normalizeUserTag(trimmed);
      const combinedUsers = [collectWalletTransferKnownUsers()];

      if (includeRemote && remoteQuery.length >= 2 && typeof this.fetchRegisteredUsers === 'function') {
        try {
          const remoteUsers = await this.fetchRegisteredUsers(remoteQuery);
          combinedUsers.push(remoteUsers);
        } catch {
          // Ignore remote lookup errors, keep local fallback.
        }
      }

      const users = typeof this.mergeNormalizedUsers === 'function'
        ? this.mergeNormalizedUsers(...combinedUsers)
        : combinedUsers.flat().filter(Boolean);
      return listWalletTransferRecipientsFromUsers(users, trimmed).slice(0, 8);
    };

    const clearWalletTransferSelectedRecipient = () => {
      walletTransferSelectedRecipient = null;
      renderWalletTransferRecipient(null);
    };

    const getWalletTransactionId = (entry = {}, index = 0) => {
      const explicitId = String(
        entry?.id
        || entry?.txId
        || entry?.transactionId
        || ''
      ).trim();
      if (explicitId) return explicitId;
      return `${entry?.createdAt || ''}-${entry?.amountCents || 0}-${entry?.title || ''}-${index}`;
    };

    const isIncomingTransferEntry = (entry = {}) => {
      const amount = Number(entry?.amountCents) || 0;
      if (amount <= 0) return false;
      const haystack = [
        entry?.title,
        entry?.source,
        entry?.category,
        entry?.type,
        entry?.transactionType,
        entry?.description
      ].map((value) => String(value || '').trim().toLowerCase()).join(' ');
      return /(transfer|переказ|перевод)/i.test(haystack);
    };

    const showIncomingTransferNotice = ({ count = 0, amountCents = 0 } = {}) => {
      const safeCount = Math.max(0, Number(count) || 0);
      const safeAmountCents = Math.max(0, Math.trunc(Number(amountCents) || 0));
      if (safeCount <= 0 || safeAmountCents <= 0) return;

      const amountText = `+${this.formatCoinBalance(safeAmountCents)}`;
      const message = safeCount > 1
        ? `Надійшло ${safeCount} переказів на ${amountText}.`
        : `Надійшов переказ на ${amountText}.`;

      if (walletIncomingTransferNoticeEl instanceof HTMLElement) {
        walletIncomingTransferNoticeEl.textContent = message;
        walletIncomingTransferNoticeEl.hidden = false;
        if (walletIncomingTransferNoticeTimer) {
          window.clearTimeout(walletIncomingTransferNoticeTimer);
        }
        walletIncomingTransferNoticeTimer = window.setTimeout(() => {
          walletIncomingTransferNoticeTimer = null;
          if (walletIncomingTransferNoticeEl) {
            walletIncomingTransferNoticeEl.hidden = true;
            walletIncomingTransferNoticeEl.textContent = '';
          }
        }, 5200);
      }

      if (typeof this.showDesktopBrowserNotification === 'function') {
        this.showDesktopBrowserNotification({
          title: 'Nymo · Гаманець',
          body: message,
          requireEnabledSetting: false,
          closeAfterMs: 5200,
          notificationKey: `wallet-incoming-transfer:${Date.now()}:${safeAmountCents}:${safeCount}`
        });
      }
    };

    const getSortedWalletEntriesSnapshot = () => (
      walletTransactionsLoadedFromBackend
        ? sortWalletTransactions(walletTransactionsFullListEntries)
        : sortWalletTransactions(this.getCoinTransactionHistory())
    );

    const detectAndNotifyIncomingTransfers = (previousEntries = [], nextEntries = []) => {
      const prevIds = new Set((Array.isArray(previousEntries) ? previousEntries : []).map((entry, index) => (
        getWalletTransactionId(entry, index)
      )));
      const incomingEntries = [];

      (Array.isArray(nextEntries) ? nextEntries : []).forEach((entry, index) => {
        const txId = getWalletTransactionId(entry, index);
        if (!txId) return;
        if (prevIds.has(txId)) return;
        if (this.walletIncomingTransferNotifiedIds.has(txId)) return;
        if (!isIncomingTransferEntry(entry)) return;
        incomingEntries.push(entry);
        this.walletIncomingTransferNotifiedIds.add(txId);
      });

      if (!incomingEntries.length) return;
      const totalIncomingCents = incomingEntries.reduce((sum, entry) => (
        sum + Math.max(0, Math.trunc(Number(entry?.amountCents) || 0))
      ), 0);
      showIncomingTransferNotice({
        count: incomingEntries.length,
        amountCents: totalIncomingCents
      });
    };

    const refreshWalletLedgerData = async ({ silent = true, notifyIncoming = false } = {}) => {
      if (walletRefreshSubmitting) return;
      walletRefreshSubmitting = true;
      const refreshButtons = walletQuickActionButtons.filter((button) => (
        String(button.getAttribute('data-wallet-quick-action') || '').trim().toLowerCase() === 'refresh'
      ));
      refreshButtons.forEach((button) => { button.disabled = true; });
      const previousEntries = getSortedWalletEntriesSnapshot();
      previousEntries.forEach((entry, index) => {
        const txId = getWalletTransactionId(entry, index);
        if (txId) this.walletIncomingTransferNotifiedIds.add(txId);
      });
      try {
        await this.refreshCoinWalletFromBackend({ includeTransactions: false, silent, force: true });
        walletTransactionsLoadedFromBackend = false;
        walletTransactionsFullListEntries = [];
        await loadWalletTransactionsPage(1, { silent, forceReload: true });
        if (notifyIncoming) {
          detectAndNotifyIncomingTransfers(previousEntries, getSortedWalletEntriesSnapshot());
        }
        render();
      } finally {
        walletRefreshSubmitting = false;
        refreshButtons.forEach((button) => { button.disabled = false; });
      }
    };

    const runWalletTransferSearch = async (rawInputValue = '', { includeRemote = true } = {}) => {
      const trimmed = String(rawInputValue || '').trim();
      const requestId = ++walletTransferSearchRequestId;

      if (!trimmed) {
        walletTransferSearchResults = [];
        renderWalletTransferSearch({ items: [], message: '' });
        clearWalletTransferSelectedRecipient();
        return;
      }

      if (trimmed.length < 2) {
        walletTransferSearchResults = [];
        renderWalletTransferSearch({ items: [], message: 'Введіть мінімум 2 символи для пошуку.' });
        clearWalletTransferSelectedRecipient();
        return;
      }

      renderWalletTransferSearch({ items: [], message: 'Пошук користувачів...' });
      const recipients = await getWalletTransferRecipientSearchResults(trimmed, { includeRemote });
      if (requestId !== walletTransferSearchRequestId) return;

      walletTransferSearchResults = recipients;
      if (!recipients.length) {
        clearWalletTransferSelectedRecipient();
        renderWalletTransferSearch({ items: [], message: 'Користувачів не знайдено.' });
        return;
      }

      if (
        walletTransferSelectedRecipient
        && !recipients.some((item) => item.id === walletTransferSelectedRecipient.id)
      ) {
        clearWalletTransferSelectedRecipient();
      }
      renderWalletTransferSearch({ items: recipients });
    };

    const openTransferModal = () => {
      setTransferStatus('');
      if (walletTransferSearchTimer) {
        window.clearTimeout(walletTransferSearchTimer);
        walletTransferSearchTimer = null;
      }
      walletTransferSearchRequestId += 1;
      walletTransferSearchResults = [];
      renderWalletTransferSearch({ items: [], message: '' });
      clearWalletTransferSelectedRecipient();
      if (walletTransferToUserIdEl instanceof HTMLInputElement) {
        walletTransferToUserIdEl.focus();
      }
      setModalState(walletTransferModalEl, true);
    };

    const closeTransferModal = () => {
      if (walletTransferSearchTimer) {
        window.clearTimeout(walletTransferSearchTimer);
        walletTransferSearchTimer = null;
      }
      walletTransferSearchRequestId += 1;
      walletTransferSearchResults = [];
      if (walletTransferToUserIdEl instanceof HTMLInputElement) {
        walletTransferToUserIdEl.value = '';
      }
      renderWalletTransferSearch({ items: [], message: '' });
      clearWalletTransferSelectedRecipient();
      setModalState(walletTransferModalEl, false);
      setTransferStatus('');
    };

    const openReceiveModal = () => {
      setReceiveStatus('');
      if (walletReceiveUserIdEl instanceof HTMLInputElement) {
        walletReceiveUserIdEl.value = resolveCurrentUserId();
      }
      setModalState(walletReceiveModalEl, true);
    };

    const closeReceiveModal = () => {
      setModalState(walletReceiveModalEl, false);
      setReceiveStatus('');
    };

    const formatPercentLabel = (value) => {
      const safeValue = Number.isFinite(value) ? value : 0;
      if (safeValue >= 99.95) return '100%';
      return `${safeValue.toFixed(1).replace('.', ',')}%`;
    };

    const setAnalyticsDonutCenter = (segment = null) => {
      if (!analyticsDonutCenterLabelEl || !analyticsDonutCenterValueEl) return;

      if (!segment) {
        if (analyticsDonutSegments.length) {
          analyticsDonutCenterLabelEl.textContent = 'Усі джерела';
          analyticsDonutCenterValueEl.textContent = '100%';
        } else {
          analyticsDonutCenterLabelEl.textContent = 'Немає даних';
          analyticsDonutCenterValueEl.textContent = '0%';
        }
        analyticsDonutCenterValueEl.removeAttribute('title');
        return;
      }

      analyticsDonutCenterLabelEl.textContent = segment.label;
      analyticsDonutCenterValueEl.textContent = formatPercentLabel(segment.percent);
      analyticsDonutCenterValueEl.title = this.formatCoinBalance(segment.amount);
    };

    const setAnalyticsFocus = ({ label, value, meta, tone = 'neutral' }) => {
      if (!analyticsFocusLabelEl || !analyticsFocusValueEl || !analyticsFocusMetaEl) return;
      analyticsFocusLabelEl.textContent = label || 'Фокус';
      analyticsFocusValueEl.textContent = value || 'Увесь період';
      analyticsFocusMetaEl.textContent = meta || 'Наведи на рядок, точку графіка або джерело.';
      const focusRoot = analyticsFocusLabelEl.closest('.wallet-analytics-focus');
      if (focusRoot) focusRoot.dataset.tone = tone;
    };

    const setIdleAnalyticsFocus = () => {
      const periodLabel = `${analyticsRangeDays} днів`;
      const modeLabel = analyticsModeLabels[analyticsMode] || analyticsModeLabels.net;
      const modeValue = analyticsMode === 'income'
        ? analyticsPeriodIncome
        : analyticsMode === 'expense'
          ? -analyticsPeriodExpense
          : analyticsPeriodNet;
      setAnalyticsFocus({
        label: `${modeLabel} · ${periodLabel}`,
        value: formatSignedCoins(modeValue),
        meta: `Транзакцій у періоді: ${analyticsPeriodTransactions}`,
        tone: modeValue >= 0 ? 'positive' : 'negative'
      });
    };

    const setAnalyticsControlState = () => {
      analyticsRangeControlEls.forEach((controlEl) => {
        controlEl.querySelectorAll('[data-analytics-range]').forEach((button) => {
          if (!(button instanceof HTMLButtonElement)) return;
          const buttonRange = Number(button.getAttribute('data-analytics-range'));
          const isActive = buttonRange === analyticsRangeDays;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      });

      if (analyticsModeControlEl) {
        analyticsModeControlEl.querySelectorAll('[data-analytics-mode]').forEach((button) => {
          if (!(button instanceof HTMLButtonElement)) return;
          const buttonMode = String(button.getAttribute('data-analytics-mode') || '').trim().toLowerCase();
          const isActive = buttonMode === analyticsMode;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }
    };

    const hideAnalyticsLineTooltip = () => {
      if (!analyticsLineTooltipEl) return;
      analyticsLineTooltipEl.hidden = true;
      analyticsLineTooltipEl.style.removeProperty('left');
      analyticsLineTooltipEl.style.removeProperty('top');
    };

    const updateAnalyticsChartViewport = () => {
      const fallbackWidth = analyticsLineViewportWidth > 0 ? analyticsLineViewportWidth : 300;
      const fallbackHeight = analyticsLineViewportHeight > 0 ? analyticsLineViewportHeight : 120;
      if (!(analyticsLineChartEl instanceof SVGElement)) {
        analyticsLineViewportWidth = fallbackWidth;
        analyticsLineViewportHeight = fallbackHeight;
        return { width: fallbackWidth, height: fallbackHeight };
      }

      const rect = analyticsLineChartEl.getBoundingClientRect();
      const measuredWidth = Math.max(120, Math.round(rect.width || fallbackWidth));
      const measuredHeight = Math.max(80, Math.round(rect.height || fallbackHeight));
      analyticsLineViewportWidth = measuredWidth;
      analyticsLineViewportHeight = measuredHeight;
      analyticsLineChartEl.setAttribute('viewBox', `0 0 ${measuredWidth} ${measuredHeight}`);
      return { width: measuredWidth, height: measuredHeight };
    };

    const setActiveAnalyticsDay = (dayKey = '') => {
      analyticsActiveDayKey = String(dayKey || '').trim();

      if (analyticsBarsEl) {
        analyticsBarsEl.querySelectorAll('.wallet-analytics-bar-row[data-day-key]').forEach((rowEl) => {
          const rowKey = String(rowEl.getAttribute('data-day-key') || '');
          rowEl.classList.toggle('is-active', Boolean(analyticsActiveDayKey) && rowKey === analyticsActiveDayKey);
        });
      }

      if (analyticsPointsEl) {
        analyticsPointsEl.querySelectorAll('.wallet-analytics-point').forEach((pointEl) => {
          const pointKey = String(pointEl.getAttribute('data-day-key') || '');
          pointEl.classList.toggle('is-active', Boolean(analyticsActiveDayKey) && pointKey === analyticsActiveDayKey);
        });
      }
    };

    const focusAnalyticsPoint = (dayKey = '') => {
      const normalizedKey = String(dayKey || '').trim();
      if (!normalizedKey) {
        setActiveAnalyticsDay('');
        hideAnalyticsLineTooltip();
        setIdleAnalyticsFocus();
        return;
      }

      const point = analyticsLinePoints.find((item) => item.key === normalizedKey);
      if (!point) {
        setActiveAnalyticsDay('');
        hideAnalyticsLineTooltip();
        setIdleAnalyticsFocus();
        return;
      }

      setActiveAnalyticsDay(point.key);
      if (analyticsLineTooltipEl && analyticsLineWrapEl) {
        const wrapRect = analyticsLineWrapEl.getBoundingClientRect();
        const chartRect = analyticsLineChartEl instanceof SVGElement
          ? analyticsLineChartEl.getBoundingClientRect()
          : wrapRect;
        const offsetLeft = chartRect.left - wrapRect.left;
        const offsetTop = chartRect.top - wrapRect.top;
        const rawLeft = offsetLeft + ((point.x / analyticsLineViewportWidth) * chartRect.width);
        const rawTop = offsetTop + ((point.y / analyticsLineViewportHeight) * chartRect.height);
        analyticsLineTooltipEl.hidden = false;
        analyticsLineTooltipEl.textContent = `${point.label} · ${formatSignedCoins(point.value)}`;
        const tooltipRect = analyticsLineTooltipEl.getBoundingClientRect();
        const halfWidth = Math.max(0, tooltipRect.width / 2);
        const minLeft = offsetLeft + halfWidth + 6;
        const maxLeft = offsetLeft + chartRect.width - halfWidth - 6;
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));
        analyticsLineTooltipEl.style.left = `${clampedLeft}px`;
        analyticsLineTooltipEl.style.top = `${rawTop}px`;
      }

      const tone = point.value >= 0 ? 'positive' : 'negative';
      setAnalyticsFocus({
        label: `День · ${point.label}`,
        value: formatSignedCoins(point.value),
        meta: `Режим: ${analyticsModeLabels[analyticsMode] || analyticsModeLabels.net}`,
        tone
      });
    };

    const focusLatestAnalyticsPoint = () => {
      const latestPoint = analyticsLinePoints[analyticsLinePoints.length - 1];
      if (!latestPoint) {
        focusAnalyticsPoint('');
        return;
      }
      focusAnalyticsPoint(latestPoint.key);
    };

    const renderAnalyticsDonut = (activeIndex = null) => {
      if (!analyticsDonutEl) return;

      if (!analyticsDonutSegments.length) {
        if (analyticsDonutSegmentsEl) analyticsDonutSegmentsEl.innerHTML = '';
        analyticsDonutEl.classList.remove('is-interactive-active');
        return;
      }

      const totalRaw = analyticsDonutSegments.reduce((sum, segment) => {
        return sum + Math.max(0, Number(segment.percent) || 0);
      }, 0) || 1;
      const normalizedSegments = analyticsDonutSegments.map((segment) => ({
        ...segment,
        normalizedPercent: (Math.max(0, Number(segment.percent) || 0) / totalRaw) * 100
      }));
      let cursor = 0;
      const visualSegments = normalizedSegments.map((segment, index) => {
        const start = cursor;
        if (index === normalizedSegments.length - 1) {
          cursor = 100;
        } else {
          cursor += segment.normalizedPercent;
        }
        return {
          ...segment,
          start,
          end: cursor,
          visualPercent: Math.max(0, cursor - start)
        };
      });

      if (analyticsDonutSegmentsEl) {
        analyticsDonutSegmentsEl.innerHTML = visualSegments.map((segment, index) => {
          const color = activeIndex === null || activeIndex === index
            ? segment.color
            : segment.mutedColor;
          const opacity = activeIndex === null || activeIndex === index ? 1 : 0.65;
          const dash = Math.max(0, segment.visualPercent);
          const gap = Math.max(0, 100 - dash);
          return `
            <circle
              class="wallet-analytics-donut-segment"
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="${color}"
              stroke-width="22"
              pathLength="100"
              stroke-dasharray="${dash} ${gap}"
              stroke-dashoffset="${-segment.start}"
              style="opacity:${opacity};"
            ></circle>
          `;
        }).join('');
      } else {
        const stops = visualSegments.map((segment, index) => {
          const color = activeIndex === null || activeIndex === index
            ? segment.color
            : segment.mutedColor;
          return `${color} ${segment.start}% ${segment.end}%`;
        });
        analyticsDonutEl.style.background = `conic-gradient(from -90deg, ${stops.join(', ')})`;
      }

      analyticsDonutEl.classList.toggle('is-interactive-active', activeIndex !== null);
    };

    const setActiveAnalyticsSource = (index = null) => {
      const normalizedIndex = Number.isInteger(index)
        && index >= 0
        && index < analyticsDonutSegments.length
        ? index
        : null;

      if (analyticsActiveSourceIndex === normalizedIndex) return;
      analyticsActiveSourceIndex = normalizedIndex;

      if (analyticsSourcesEl) {
        analyticsSourcesEl.querySelectorAll('.wallet-analytics-source-item').forEach((itemEl) => {
          const itemIndex = Number(itemEl.getAttribute('data-source-index'));
          itemEl.classList.toggle('is-active', normalizedIndex !== null && itemIndex === normalizedIndex);
        });
      }

      const activeSegment = normalizedIndex === null ? null : analyticsDonutSegments[normalizedIndex] || null;
      setAnalyticsDonutCenter(activeSegment);
      renderAnalyticsDonut(normalizedIndex);

      if (activeSegment) {
        hideAnalyticsLineTooltip();
        setActiveAnalyticsDay('');
        setAnalyticsFocus({
          label: `Джерело · ${activeSegment.label}`,
          value: formatPercentLabel(activeSegment.percent),
          meta: this.formatCoinBalance(activeSegment.amount),
          tone: 'neutral'
        });
      } else {
        setIdleAnalyticsFocus();
      }
    };

    if (analyticsSourcesEl && analyticsSourcesEl.dataset.analyticsInteractiveBound !== 'true') {
      analyticsSourcesEl.dataset.analyticsInteractiveBound = 'true';

      analyticsSourcesEl.addEventListener('pointerover', (event) => {
        const sourceEl = event.target.closest('.wallet-analytics-source-item[data-source-index]');
        if (!sourceEl || !analyticsSourcesEl.contains(sourceEl)) return;
        setActiveAnalyticsSource(Number(sourceEl.getAttribute('data-source-index')));
      });

      analyticsSourcesEl.addEventListener('pointerleave', () => {
        setActiveAnalyticsSource(null);
      });

      analyticsSourcesEl.addEventListener('focusin', (event) => {
        const sourceEl = event.target.closest('.wallet-analytics-source-item[data-source-index]');
        if (!sourceEl || !analyticsSourcesEl.contains(sourceEl)) return;
        setActiveAnalyticsSource(Number(sourceEl.getAttribute('data-source-index')));
      });

      analyticsSourcesEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsSourcesEl.contains(nextTarget)) return;
        setActiveAnalyticsSource(null);
      });
    }

    analyticsRangeControlEls.forEach((controlEl, index) => {
      const boundKey = `analyticsRangeBound${index}`;
      if (controlEl.dataset[boundKey] === 'true') return;
      controlEl.dataset[boundKey] = 'true';
      controlEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-analytics-range]');
        if (!(button instanceof HTMLButtonElement) || !controlEl.contains(button)) return;
        const nextRange = Number(button.getAttribute('data-analytics-range'));
        if (!Number.isFinite(nextRange) || nextRange < 2) return;
        analyticsRangeDays = Math.trunc(nextRange);
        render();
      });
    });

    if (analyticsModeControlEl && analyticsModeControlEl.dataset.analyticsModeBound !== 'true') {
      analyticsModeControlEl.dataset.analyticsModeBound = 'true';
      analyticsModeControlEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-analytics-mode]');
        if (!(button instanceof HTMLButtonElement) || !analyticsModeControlEl.contains(button)) return;
        const nextMode = String(button.getAttribute('data-analytics-mode') || '').trim().toLowerCase();
        if (!['net', 'income', 'expense'].includes(nextMode)) return;
        analyticsMode = nextMode;
        render();
      });
    }

    if (analyticsBarsEl && analyticsBarsEl.dataset.analyticsBarsBound !== 'true') {
      analyticsBarsEl.dataset.analyticsBarsBound = 'true';

      analyticsBarsEl.addEventListener('pointerover', (event) => {
        const rowEl = event.target.closest('.wallet-analytics-bar-row[data-day-key]');
        if (!rowEl || !analyticsBarsEl.contains(rowEl)) return;
        focusAnalyticsPoint(String(rowEl.getAttribute('data-day-key') || ''));
      });

      analyticsBarsEl.addEventListener('focusin', (event) => {
        const rowEl = event.target.closest('.wallet-analytics-bar-row[data-day-key]');
        if (!rowEl || !analyticsBarsEl.contains(rowEl)) return;
        focusAnalyticsPoint(String(rowEl.getAttribute('data-day-key') || ''));
      });

      analyticsBarsEl.addEventListener('pointerleave', () => {
        focusLatestAnalyticsPoint();
      });

      analyticsBarsEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsBarsEl.contains(nextTarget)) return;
        focusLatestAnalyticsPoint();
      });
    }

    if (analyticsLineWrapEl && analyticsLineWrapEl.dataset.analyticsLineBound !== 'true') {
      analyticsLineWrapEl.dataset.analyticsLineBound = 'true';

      analyticsLineWrapEl.addEventListener('pointermove', (event) => {
        if (!analyticsLinePoints.length) return;
        const rect = analyticsLineChartEl instanceof SVGElement
          ? analyticsLineChartEl.getBoundingClientRect()
          : analyticsLineWrapEl.getBoundingClientRect();
        if (!rect.width) return;
        const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const rawX = (localX / rect.width) * analyticsLineViewportWidth;
        let nearestPoint = analyticsLinePoints[0];
        for (let index = 1; index < analyticsLinePoints.length; index += 1) {
          const point = analyticsLinePoints[index];
          if (Math.abs(point.x - rawX) < Math.abs(nearestPoint.x - rawX)) nearestPoint = point;
        }
        focusAnalyticsPoint(nearestPoint.key);
      });

      analyticsLineWrapEl.addEventListener('pointerleave', () => {
        focusLatestAnalyticsPoint();
      });

      analyticsLineWrapEl.addEventListener('click', (event) => {
        const pointEl = event.target.closest('.wallet-analytics-point[data-day-key]');
        if (!pointEl || !analyticsLineWrapEl.contains(pointEl)) return;
        focusAnalyticsPoint(String(pointEl.getAttribute('data-day-key') || ''));
      });

      analyticsLineWrapEl.addEventListener('focusin', (event) => {
        const pointEl = event.target.closest('.wallet-analytics-point[data-day-key]');
        if (!pointEl || !analyticsLineWrapEl.contains(pointEl)) return;
        focusAnalyticsPoint(String(pointEl.getAttribute('data-day-key') || ''));
      });

      analyticsLineWrapEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsLineWrapEl.contains(nextTarget)) return;
        focusLatestAnalyticsPoint();
      });
    }

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

    const formatSignedCoins = (amountCents) => {
      const safeAmount = Number.isFinite(amountCents) ? Math.trunc(amountCents) : 0;
      const sign = safeAmount >= 0 ? '+' : '-';
      return `${sign}${this.formatCoinBalance(Math.abs(safeAmount))}`;
    };

    const startOfDay = (dateInput) => {
      const date = new Date(dateInput);
      if (Number.isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const dayKey = (dateInput) => {
      const date = startOfDay(dateInput);
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const dayLabel = (dateInput) => {
      const date = startOfDay(dateInput);
      if (!date) return '';
      return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    };

    const resolveSourceLabel = (entry) => {
      if (!entry || typeof entry !== 'object') return 'Інше';
      const category = String(entry.category || '').trim().toLowerCase();
      const title = String(entry.title || '').trim().toLowerCase();
      const subtitle = String(entry.subtitle || entry.details || '').trim().toLowerCase();
      const sourceLabel = String(entry.source || entry.game || '').trim().toLowerCase();
      const type = String(entry.type || '').trim().toLowerCase();
      const source = `${category} ${type} ${title} ${subtitle} ${sourceLabel}`;

      if (/flappy|2048|клікер|clicker|tapper|drive|drift|race|гра/.test(source)) return 'Ігри';
      if (/shop|store|магазин|purchase|buy|sell|продаж/.test(source)) return 'Магазин';
      if (/transfer|переказ/.test(source)) return 'Перекази';
      if (/bonus|reward|referral|бонус/.test(source)) return 'Бонуси';
      if (/deposit|topup|поповнення|income|credit|earn/.test(source)) return 'Поповнення';
      if (/withdraw|expense|debit|списання/.test(source)) return 'Списання';
      return 'Інше';
    };

    const resolveAnalyticsSourceColors = (label, index = 0) => {
      const normalizedLabel = String(label || '').trim().toLowerCase();
      if (normalizedLabel === 'поповнення') {
        return {
          color: getWalletIncomeColor(),
          mutedColor: getWalletIncomeMutedColor()
        };
      }
      const mapped = analyticsSourceColorMap[normalizedLabel];
      if (mapped) return mapped;
      return {
        color: donutPalette[index % donutPalette.length],
        mutedColor: donutMutedPalette[index % donutMutedPalette.length]
      };
    };

    const buildSmoothLinePath = (points, tension = 0.5) => {
      if (!Array.isArray(points) || !points.length) return 'M 8,60 L 292,60';
      if (points.length === 1) {
        return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;
      }
      if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
      }

      let path = `M ${points[0].x},${points[0].y}`;
      for (let index = 0; index < points.length - 1; index += 1) {
        const p0 = points[index - 1] || points[index];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[index + 2] || p2;
        const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
        const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
        const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
        const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      return path;
    };

    const buildDailySeries = (history, days, mode = analyticsMode) => {
      const safeDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 7;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const points = [];
      const sumByDay = new Map();

      history.forEach((entry) => {
        const key = dayKey(entry.createdAt);
        if (!key) return;
        const amount = Number(entry.amountCents) || 0;
        const normalizedMode = String(mode || 'net').toLowerCase();
        const modeAmount = normalizedMode === 'income'
          ? (amount > 0 ? amount : 0)
          : normalizedMode === 'expense'
            ? (amount < 0 ? amount : 0)
            : amount;
        if (!modeAmount) return;
        const current = sumByDay.get(key) || 0;
        const next = current + modeAmount;
        sumByDay.set(key, next);
      });

      for (let index = safeDays - 1; index >= 0; index -= 1) {
        const day = new Date(now);
        day.setDate(now.getDate() - index);
        const key = dayKey(day);
        points.push({
          key,
          label: dayLabel(day),
          value: Number(sumByDay.get(key) || 0)
        });
      }

      return points;
    };

    const renderAnalytics = (history) => {
      setAnalyticsControlState();
      if (analyticsBarsTitleEl) {
        analyticsBarsTitleEl.textContent = `Рух за ${Math.min(10, analyticsRangeDays)} з ${analyticsRangeDays} днів`;
      }
      if (analyticsLineTitleEl) {
        analyticsLineTitleEl.textContent = `Динаміка за ${analyticsRangeDays} днів`;
      }

      if (!Array.isArray(history) || !history.length) {
        if (analyticsIncomeEl) analyticsIncomeEl.textContent = '+0,00';
        if (analyticsExpenseEl) analyticsExpenseEl.textContent = '-0,00';
        if (analyticsNetEl) analyticsNetEl.textContent = '+0,00';
        analyticsPeriodIncome = 0;
        analyticsPeriodExpense = 0;
        analyticsPeriodNet = 0;
        analyticsPeriodTransactions = 0;
        analyticsDailySeries = [];
        analyticsLinePoints = [];
        analyticsActiveDayKey = '';
        if (analyticsBarsEl) {
          analyticsBarsEl.innerHTML = '<div class="wallet-analytics-empty">Недостатньо даних для графіка.</div>';
        }
        if (analyticsLineEl) {
          const { width: baseWidth, height: baseHeight } = updateAnalyticsChartViewport();
          const centerY = Math.round(baseHeight / 2);
          analyticsLineEl.setAttribute('d', `M 8,${centerY} L ${Math.max(8, baseWidth - 8)},${centerY}`);
        }
        if (analyticsAreaEl) {
          analyticsAreaEl.setAttribute('d', '');
        }
        if (analyticsZeroLineEl) {
          const centerY = Math.round(analyticsLineViewportHeight / 2);
          analyticsZeroLineEl.setAttribute('x1', '0');
          analyticsZeroLineEl.setAttribute('x2', String(analyticsLineViewportWidth));
          analyticsZeroLineEl.setAttribute('y1', String(centerY));
          analyticsZeroLineEl.setAttribute('y2', String(centerY));
        }
        if (analyticsPointsEl) {
          analyticsPointsEl.innerHTML = '';
        }
        if (analyticsLineStartDayEl) analyticsLineStartDayEl.textContent = '-';
        if (analyticsLineEndDayEl) analyticsLineEndDayEl.textContent = 'Сьогодні';
        hideAnalyticsLineTooltip();
        analyticsDonutSegments = [];
        renderAnalyticsDonut(null);
        setAnalyticsDonutCenter(null);
        if (analyticsSourcesEl) {
          analyticsSourcesEl.innerHTML = '<div class="wallet-analytics-empty">Транзакції ще не накопичились.</div>';
        }
        analyticsActiveSourceIndex = null;
        setIdleAnalyticsFocus();
        return;
      }

      const periodSeriesNet = buildDailySeries(history, analyticsRangeDays, 'net');
      const periodKeys = new Set(periodSeriesNet.map((item) => item.key));
      const periodHistory = history.filter((entry) => periodKeys.has(dayKey(entry.createdAt)));
      analyticsPeriodTransactions = periodHistory.length;

      analyticsPeriodIncome = periodHistory
        .filter((entry) => Number(entry.amountCents) > 0)
        .reduce((sum, entry) => sum + (Number(entry.amountCents) || 0), 0);
      analyticsPeriodExpense = periodHistory
        .filter((entry) => Number(entry.amountCents) < 0)
        .reduce((sum, entry) => sum + Math.abs(Number(entry.amountCents) || 0), 0);
      analyticsPeriodNet = analyticsPeriodIncome - analyticsPeriodExpense;

      if (analyticsIncomeEl) analyticsIncomeEl.textContent = `+${this.formatCoinBalance(analyticsPeriodIncome)}`;
      if (analyticsExpenseEl) analyticsExpenseEl.textContent = `-${this.formatCoinBalance(analyticsPeriodExpense)}`;
      if (analyticsNetEl) analyticsNetEl.textContent = formatSignedCoins(analyticsPeriodNet);
      const netCardEl = analyticsNetEl ? analyticsNetEl.closest('.wallet-analytics-net-card') : null;
      if (netCardEl) {
        netCardEl.classList.toggle('is-positive', analyticsPeriodNet >= 0);
        netCardEl.classList.toggle('is-negative', analyticsPeriodNet < 0);
      }

      analyticsDailySeries = buildDailySeries(history, analyticsRangeDays, analyticsMode);
      const barsWindow = analyticsDailySeries.slice(-Math.min(10, analyticsDailySeries.length));
      if (analyticsBarsEl) {
        const peak = barsWindow.reduce((max, item) => Math.max(max, Math.abs(item.value)), 0) || 1;
        const incomeBarColor = getWalletIncomeColor();
        analyticsBarsEl.innerHTML = barsWindow.map((item) => {
          const absoluteValue = Math.abs(item.value);
          const ratio = absoluteValue > 0
            ? Math.max(4, Math.round((absoluteValue / peak) * 100))
            : 0;
          const fillColor = item.value > 0
            ? incomeBarColor
            : item.value < 0
              ? '#ff6b8a'
              : 'transparent';
          const tone = analyticsMode === 'income'
            ? 'is-income'
            : analyticsMode === 'expense'
              ? 'is-expense'
              : item.value >= 0 ? 'is-income' : 'is-expense';
          return `
            <button type="button" class="wallet-analytics-bar-row ${tone}" data-day-key="${escapeHtml(item.key)}" title="${escapeHtml(`${item.label}: ${formatSignedCoins(item.value)}`)}">
              <span class="wallet-analytics-bar-label">${escapeHtml(item.label)}</span>
              <div class="wallet-analytics-bar-track">
                <span class="wallet-analytics-bar-fill" style="width:${ratio}%; background:${fillColor};"></span>
              </div>
              <strong class="wallet-analytics-bar-value">${escapeHtml(formatSignedCoins(item.value))}</strong>
            </button>
          `;
        }).join('');
      }

      if (analyticsLineEl) {
        const timeline = analyticsDailySeries;
        const viewport = updateAnalyticsChartViewport();
        const width = viewport.width;
        const height = viewport.height;
        const xPadding = 8;
        const usableWidth = Math.max(1, width - (xPadding * 2));
        const yPadding = 14;
        const values = timeline.map((item) => Number(item.value) || 0);
        let min = Math.min(...values, 0);
        let max = Math.max(...values, 0);
        if (!Number.isFinite(min)) min = 0;
        if (!Number.isFinite(max)) max = 0;
        if (min === max) {
          const delta = min === 0 ? 1 : Math.max(1, Math.abs(min) * 0.15);
          min -= delta;
          max += delta;
        }
        const chartHeight = Math.max(1, height - (yPadding * 2));
        const range = Math.max(0.0001, max - min);
        const projectY = (plotValue) => {
          const ratio = (plotValue - min) / range;
          return Math.round((height - yPadding) - (ratio * chartHeight));
        };
        const zeroY = Math.max(yPadding, Math.min(height - yPadding, projectY(0)));
        analyticsLinePoints = timeline.map((item, index) => {
          const x = timeline.length <= 1
            ? Math.round(width / 2)
            : Math.round(xPadding + ((index / (timeline.length - 1)) * usableWidth));
          const y = projectY(Number(item.value) || 0);
          return {
            ...item,
            x,
            y
          };
        });
        const linePath = buildSmoothLinePath(analyticsLinePoints, 0.48);
        analyticsLineEl.setAttribute('d', linePath);
        if (analyticsAreaEl) {
          if (!analyticsLinePoints.length) {
            analyticsAreaEl.setAttribute('d', '');
          } else {
            const bottomY = height - yPadding;
            const start = analyticsLinePoints[0];
            const end = analyticsLinePoints[analyticsLinePoints.length - 1];
            analyticsAreaEl.setAttribute('d', `${linePath} L ${end.x},${bottomY} L ${start.x},${bottomY} Z`);
          }
        }
        if (analyticsZeroLineEl) {
          analyticsZeroLineEl.setAttribute('x1', '0');
          analyticsZeroLineEl.setAttribute('x2', String(width));
          analyticsZeroLineEl.setAttribute('y1', String(zeroY));
          analyticsZeroLineEl.setAttribute('y2', String(zeroY));
        }
        if (analyticsLineStartDayEl) {
          analyticsLineStartDayEl.textContent = analyticsLinePoints[0]?.label || '-';
        }
        if (analyticsLineEndDayEl) {
          const endLabel = analyticsLinePoints[analyticsLinePoints.length - 1]?.label || '-';
          analyticsLineEndDayEl.textContent = analyticsLinePoints.length ? `${endLabel} · Сьогодні` : '-';
        }
        if (analyticsPointsEl) {
          analyticsPointsEl.innerHTML = analyticsLinePoints.map((point) => {
            const isToday = analyticsLinePoints[analyticsLinePoints.length - 1]?.key === point.key;
            return `
              <circle class="wallet-analytics-point ${isToday ? 'is-today' : ''}" data-day-key="${escapeHtml(point.key)}" cx="${point.x}" cy="${point.y}" r="${isToday ? '3.8' : '3.1'}" tabindex="0" focusable="true"></circle>
            `;
          }).join('');
        }
      }

      const sourceTotals = new Map();
      periodHistory.forEach((entry) => {
        const label = resolveSourceLabel(entry);
        const next = (sourceTotals.get(label) || 0) + Math.abs(Number(entry.amountCents) || 0);
        sourceTotals.set(label, next);
      });
      const sourceEntries = [...sourceTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const total = sourceEntries.reduce((sum, [, amount]) => sum + amount, 0) || 1;
      analyticsDonutSegments = sourceEntries.map(([label, amount], index) => {
        const tones = resolveAnalyticsSourceColors(label, index);
        return {
          label,
          amount,
          percent: (amount / total) * 100,
          color: tones.color,
          mutedColor: tones.mutedColor
        };
      });
      renderAnalyticsDonut(null);
      setAnalyticsDonutCenter(null);

      if (analyticsSourcesEl) {
        if (!sourceEntries.length) {
          analyticsSourcesEl.innerHTML = '<div class="wallet-analytics-empty">Немає даних.</div>';
        } else {
          analyticsSourcesEl.innerHTML = analyticsDonutSegments.map((segment, index) => {
            return `
              <button class="wallet-analytics-source-item" type="button" data-source-index="${index}" title="${escapeHtml(`${segment.label}: ${this.formatCoinBalance(segment.amount)}`)}">
                <span class="wallet-analytics-source-dot" style="background:${segment.color}"></span>
                <span class="wallet-analytics-source-label">${escapeHtml(segment.label)}</span>
                <strong class="wallet-analytics-source-value">${escapeHtml(formatPercentLabel(segment.percent))}</strong>
              </button>
            `;
          }).join('');
        }
      }

      analyticsActiveSourceIndex = null;
      if (analyticsActiveDayKey && analyticsLinePoints.some((item) => item.key === analyticsActiveDayKey)) {
        focusAnalyticsPoint(analyticsActiveDayKey);
      } else {
        focusLatestAnalyticsPoint();
      }
    };

    const parsePaginationInteger = (value, fallback = 0, { min = 0 } = {}) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.max(min, Math.trunc(parsed));
    };

    const buildWalletPageTokenSequence = (currentPage = 1, totalPages = 1) => {
      const safeCurrent = Math.max(1, parsePaginationInteger(currentPage, 1, { min: 1 }));
      const safeTotal = Math.max(1, parsePaginationInteger(totalPages, 1, { min: 1 }));
      if (safeTotal <= 7) {
        return Array.from({ length: safeTotal }, (_, index) => index + 1);
      }
      const tokens = [1];
      const start = Math.max(2, safeCurrent - 1);
      const end = Math.min(safeTotal - 1, safeCurrent + 1);
      if (start > 2) tokens.push('ellipsis-left');
      for (let page = start; page <= end; page += 1) tokens.push(page);
      if (end < safeTotal - 1) tokens.push('ellipsis-right');
      tokens.push(safeTotal);
      return tokens;
    };

    const extractWalletTransactionsMeta = (
      payload,
      {
        requestedPage = 1,
        requestedLimit = walletTransactionsPageSize,
        itemsLength = 0,
        totalCountHint = 0
      } = {}
    ) => {
      const safeRequestedPage = Math.max(1, parsePaginationInteger(requestedPage, 1, { min: 1 }));
      const safeRequestedLimit = Math.max(1, parsePaginationInteger(requestedLimit, walletTransactionsPageSize, { min: 1 }));
      const root = payload && typeof payload === 'object' ? payload : {};
      const sources = [
        root,
        root?.data,
        root?.result,
        root?.wallet,
        root?.meta,
        root?.pagination,
        root?.pageInfo,
        root?.pager,
        root?.page,
        root?.links,
        root?.data?.links,
        root?.data?.pageInfo,
        root?.data?.pager,
        root?.result?.links,
        root?.result?.pageInfo,
        root?.result?.pager,
        root?.data?.meta,
        root?.data?.pagination,
        root?.result?.meta,
        root?.result?.pagination
      ].filter(Boolean);
      const readFromSources = (keys = []) => {
        for (const source of sources) {
          if (!source || typeof source !== 'object') continue;
          for (const key of keys) {
            if (!(key in source)) continue;
            const rawValue = source[key];
            if (rawValue === null || rawValue === undefined || rawValue === '') continue;
            return rawValue;
          }
        }
        return null;
      };

      let page = parsePaginationInteger(
        readFromSources(['page', 'currentPage', 'pageNumber', 'index', 'current_page', 'page_no', 'pageNo']),
        safeRequestedPage,
        { min: 1 }
      );
      const limit = Math.min(
        walletTransactionsPageSize,
        Math.max(1, parsePaginationInteger(
          readFromSources(['limit', 'pageSize', 'perPage', 'size', 'take', 'per_page', 'perPageCount', 'page_limit']),
          safeRequestedLimit,
          { min: 1 }
        ))
      );
      let totalCount = parsePaginationInteger(
        readFromSources([
          'total',
          'totalCount',
          'itemsTotal',
          'transactionsTotal',
          'total_items',
          'totalItems',
          'total_records',
          'totalRecords',
          'recordsTotal',
          'totalElements'
        ]),
        0,
        { min: 0 }
      );
      if (totalCount <= 0) {
        totalCount = parsePaginationInteger(totalCountHint, 0, { min: 0 });
      }
      let totalPages = parsePaginationInteger(
        readFromSources([
          'totalPages',
          'pages',
          'pageCount',
          'lastPage',
          'total_pages',
          'page_total',
          'last_page',
          'lastPageNumber'
        ]),
        0,
        { min: 0 }
      );
      const hasNextRaw = readFromSources(['hasNext', 'hasMore', 'nextPageExists', 'has_next', 'next']);
      const hasPrevRaw = readFromSources(['hasPrev', 'hasPrevious', 'prevPageExists', 'has_prev', 'prev']);
      const nextPageRaw = parsePaginationInteger(
        readFromSources(['nextPage', 'next_page', 'nextPageNumber', 'nextIndex']),
        0,
        { min: 0 }
      );
      const prevPageRaw = parsePaginationInteger(
        readFromSources(['prevPage', 'prev_page', 'previousPage', 'previous_page']),
        0,
        { min: 0 }
      );
      const nextLinkRaw = readFromSources(['nextUrl', 'next_url', 'nextLink', 'next']);
      const prevLinkRaw = readFromSources(['prevUrl', 'prev_url', 'prevLink', 'previous']);
      const nextLinkExists = typeof nextLinkRaw === 'string' ? Boolean(String(nextLinkRaw).trim()) : false;
      const prevLinkExists = typeof prevLinkRaw === 'string' ? Boolean(String(prevLinkRaw).trim()) : false;
      const hasNext = typeof hasNextRaw === 'boolean'
        ? hasNextRaw
        : (nextPageRaw > page ? true : (nextLinkExists ? true : null));
      const hasPrev = typeof hasPrevRaw === 'boolean'
        ? hasPrevRaw
        : (prevPageRaw > 0 ? true : (prevLinkExists ? true : null));

      const minimumTotalByPage = ((Math.max(1, page) - 1) * limit) + Math.max(0, itemsLength);
      if (totalCount > 0 && totalCount < minimumTotalByPage) {
        totalCount = minimumTotalByPage;
      }

      if (totalPages <= 0 && totalCount > 0) {
        const isSuspiciousSinglePageCount = (
          page === 1
          && itemsLength >= limit
          && totalCount <= itemsLength
          && hasNext !== false
        );
        if (!isSuspiciousSinglePageCount) {
          totalPages = Math.max(1, Math.ceil(totalCount / limit));
        }
      }
      if (totalPages <= 0) {
        const optimisticHasMore = hasNext === true || itemsLength >= limit;
        totalPages = optimisticHasMore ? page + 1 : page;
      }
      totalPages = Math.max(1, totalPages);
      page = Math.max(1, Math.min(page, totalPages));
      if (totalCount <= 0) {
        if (totalPages <= 1) {
          totalCount = itemsLength;
        } else {
          totalCount = Math.max(itemsLength + ((page - 1) * limit), totalPages * limit);
        }
      }
      return {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: hasNext === null ? page < totalPages : hasNext,
        hasPrev: hasPrev === null ? page > 1 : hasPrev
      };
    };

    const renderWalletTransactionsPagination = () => {
      if (!paginationEl || !paginationPagesEl) return;
      const safePage = Math.max(1, walletTransactionsPage);
      const safeTotalPages = Math.max(1, walletTransactionsTotalPages);
      paginationEl.hidden = safeTotalPages <= 1;
      if (paginationEl.hidden) return;

      if (paginationPrevBtn) {
        paginationPrevBtn.disabled = walletTransactionsLoading || safePage <= 1;
      }
      if (paginationNextBtn) {
        paginationNextBtn.disabled = walletTransactionsLoading || safePage >= safeTotalPages;
      }

      const pageTokens = buildWalletPageTokenSequence(safePage, safeTotalPages);
      paginationPagesEl.innerHTML = pageTokens.map((token) => {
        if (typeof token !== 'number') {
          return '<span class="wallet-history-page-ellipsis" aria-hidden="true">…</span>';
        }
        const isActive = token === safePage;
        return `
          <button
            type="button"
            class="wallet-history-page-number ${isActive ? 'is-active' : ''}"
            data-wallet-page="${token}"
            ${walletTransactionsLoading || isActive ? 'disabled' : ''}
            ${isActive ? 'aria-current="page"' : ''}
          >${token}</button>
        `;
      }).join('');
    };

    const renderWalletTransactionsList = () => {
      if (walletTransactionsLoading && !walletTransactionsPageEntries.length) {
        listEl.innerHTML = `
          <div class="wallet-history-empty">
            <strong>Завантаження транзакцій...</strong>
            <span>Отримуємо сторінку ${walletTransactionsPage}.</span>
          </div>
        `;
        renderWalletTransactionsPagination();
        return;
      }

      if (!walletTransactionsPageEntries.length) {
        listEl.innerHTML = `
          <div class="wallet-history-empty">
            <strong>Транзакцій поки немає</strong>
            <span>Купуйте предмети в магазині або заробляйте монети в іграх.</span>
          </div>
        `;
        renderWalletTransactionsPagination();
        return;
      }

      listEl.innerHTML = walletTransactionsPageEntries.map((entry) => {
        const safeAmount = Math.abs(Number(entry.amountCents) || 0);
        const isIncome = Number(entry.amountCents) > 0;
        const sign = isIncome ? '+' : '-';
        const amountText = `${sign}${this.formatCoinBalance(safeAmount)}`;
        const title = escapeHtml(entry.title || 'Транзакція');
        const dateLabel = escapeHtml(formatDate(entry.createdAt));
        const subtitle = escapeHtml(String(entry.subtitle || '').trim());
        const metaLine = subtitle
          ? `${subtitle} · ${dateLabel}`
          : dateLabel;

        return `
          <article class="wallet-history-item ${isIncome ? 'is-income' : 'is-expense'}">
            <div class="wallet-history-item-main">
              <strong>${title}</strong>
              <span>${metaLine}</span>
            </div>
            <span class="wallet-history-item-amount">${amountText}</span>
          </article>
        `;
      }).join('');
      renderWalletTransactionsPagination();
    };

    const sortWalletTransactions = (entries = []) => {
      const safeEntries = Array.isArray(entries) ? [...entries] : [];
      safeEntries.sort((a, b) => {
        const left = new Date(a?.createdAt || 0).getTime();
        const right = new Date(b?.createdAt || 0).getTime();
        const safeLeft = Number.isFinite(left) ? left : 0;
        const safeRight = Number.isFinite(right) ? right : 0;
        return safeRight - safeLeft;
      });
      return safeEntries;
    };

    const applyWalletTransactionsPage = (entries = [], nextPage = 1) => {
      const safeEntries = Array.isArray(entries) ? entries : [];
      walletTransactionsTotalCount = safeEntries.length;
      walletTransactionsTotalPages = Math.max(1, Math.ceil(walletTransactionsTotalCount / walletTransactionsPageSize));
      walletTransactionsPage = Math.max(1, Math.min(
        parsePaginationInteger(nextPage, 1, { min: 1 }),
        walletTransactionsTotalPages
      ));
      const startIndex = (walletTransactionsPage - 1) * walletTransactionsPageSize;
      walletTransactionsPageEntries = safeEntries.slice(startIndex, startIndex + walletTransactionsPageSize);
    };

    const setLocalWalletTransactionsPage = (nextPage = 1) => {
      const history = sortWalletTransactions(this.getCoinTransactionHistory());
      applyWalletTransactionsPage(history, nextPage);
    };

    const fetchWalletTransactionsAllFromBackend = async ({ silent = true } = {}) => {
      const headers = this.getWalletApiHeaders();
      if (!String(headers?.['X-User-Id'] || '').trim()) {
        throw new Error('missing-wallet-user-id');
      }
      const currency = this.getWalletCurrencyCode();
      const params = new URLSearchParams({ currency });
      const response = await fetch(buildApiUrl(`/wallet/me/transactions?${params.toString()}`), {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        cache: 'no-store'
      });
      if (!response.ok) {
        if (!silent) {
          console.warn(`[wallet] GET /wallet/me/transactions failed with status ${response.status}`);
        }
        throw new Error(`wallet-transactions-${response.status}`);
      }
      const payload = await response.json().catch(() => ({}));
      const entries = sortWalletTransactions(this.normalizeWalletTransactionsPayload(payload));
      return entries;
    };

    const loadWalletTransactionsPage = async (nextPage = 1, { silent = true, forceReload = false } = {}) => {
      const targetPage = Math.max(1, parsePaginationInteger(nextPage, walletTransactionsPage, { min: 1 }));

      if (walletTransactionsLoadedFromBackend && !forceReload) {
        applyWalletTransactionsPage(walletTransactionsFullListEntries, targetPage);
        render();
        return;
      }

      const requestNonce = ++walletTransactionsRequestNonce;
      walletTransactionsLoading = true;
      walletTransactionsPage = targetPage;
      renderWalletTransactionsList();
      try {
        const allEntries = await fetchWalletTransactionsAllFromBackend({ silent });
        if (requestNonce !== walletTransactionsRequestNonce) return;
        walletTransactionsLoadedFromBackend = true;
        walletTransactionsFullListEntries = allEntries;
        walletTransactionsBackendMode = 'full';
        walletTransactionsPageCache.clear();
        applyWalletTransactionsPage(walletTransactionsFullListEntries, targetPage);
        this.saveCoinTransactionHistory(walletTransactionsFullListEntries);
      } catch (error) {
        if (requestNonce !== walletTransactionsRequestNonce) return;
        walletTransactionsLoadedFromBackend = false;
        walletTransactionsFullListEntries = [];
        setLocalWalletTransactionsPage(targetPage);
        if (!silent) {
          console.warn('[wallet] Failed to load transactions from backend, fallback to local history.', error);
        }
      } finally {
        if (requestNonce !== walletTransactionsRequestNonce) return;
        walletTransactionsLoading = false;
        render();
      }
    };

    const submitWalletTransfer = async () => {
      if (walletTransferSubmitting) return;
      const recipientInput = String(walletTransferToUserIdEl?.value || '').trim();
      const amountInput = String(walletTransferAmountEl?.value || '').trim();
      const amountRaw = /^\d+$/.test(amountInput)
        ? Number.parseInt(amountInput, 10)
        : Number.NaN;
      const amount = Number.isFinite(amountRaw) ? Math.max(0, Math.trunc(amountRaw)) : 0;
      if (!recipientInput) {
        setTransferStatus('Вкажіть отримувача (@tag або ID).', 'error');
        return;
      }
      if (amount <= 0) {
        setTransferStatus('Вкажіть коректну суму (ціле число > 0).', 'error');
        return;
      }

      const headers = this.getWalletApiHeaders({ json: true });
      if (!String(headers?.['X-User-Id'] || '').trim()) {
        setTransferStatus('Не вдалося визначити ваш User ID для запиту.', 'error');
        return;
      }

      const currency = this.getWalletCurrencyCode();
      walletTransferSubmitting = true;
      if (walletTransferSubmitEl instanceof HTMLButtonElement) {
        walletTransferSubmitEl.disabled = true;
      }
      setTransferStatus('Виконуємо переказ...', 'neutral');

      try {
        const selectedRecipient = walletTransferSelectedRecipient;
        const toUserId = String(selectedRecipient?.id || '').trim();

        if (!toUserId) {
          setTransferStatus('Оберіть отримувача зі списку пошуку.', 'error');
          return;
        }
        if (toUserId.toLowerCase() === resolveCurrentUserId().toLowerCase()) {
          setTransferStatus('Не можна переказати монети самому собі.', 'error');
          return;
        }

        const response = await fetch(buildApiUrl('/wallet/me/transfer'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            currency,
            toUserId,
            amount: String(amount)
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const reason = String(payload?.message || payload?.error || '').trim();
          setTransferStatus(
            `Переказ не виконано${reason ? `: ${reason}` : '.'}`,
            'error'
          );
          return;
        }

        setTransferStatus('Переказ успішний.', 'success');
        if (walletTransferToUserIdEl instanceof HTMLInputElement) {
          walletTransferToUserIdEl.value = '';
        }
        if (walletTransferAmountEl instanceof HTMLInputElement) {
          walletTransferAmountEl.value = '';
        }
        walletTransferSearchResults = [];
        renderWalletTransferSearch({ items: [], message: '' });
        clearWalletTransferSelectedRecipient();

        await this.refreshCoinWalletFromBackend({ includeTransactions: true, silent: true, force: true });
        walletTransactionsLoadedFromBackend = false;
        walletTransactionsFullListEntries = [];
        await loadWalletTransactionsPage(1, { silent: true, forceReload: true });
        render();

        window.setTimeout(() => {
          closeTransferModal();
        }, 320);
      } catch (error) {
        setTransferStatus('Помилка запиту. Спробуйте ще раз.', 'error');
      } finally {
        walletTransferSubmitting = false;
        if (walletTransferSubmitEl instanceof HTMLButtonElement) {
          walletTransferSubmitEl.disabled = false;
        }
      }
    };

    const setWalletView = (view, { persist = true } = {}) => {
      const normalizedView = view === 'analytics' ? 'analytics' : 'ledger';
      if (persist) this.walletActiveView = normalizedView;
      walletViewButtons.forEach((button) => {
        const isActive = button.getAttribute('data-wallet-view') === normalizedView;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      walletPanels.forEach((panel) => {
        const isActive = panel.getAttribute('data-wallet-panel') === normalizedView;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
      if (normalizedView !== 'analytics') {
        hideAnalyticsLineTooltip();
        setActiveAnalyticsDay('');
        if (!walletTransactionsLoadedFromBackend && !walletTransactionsLoading) {
          loadWalletTransactionsPage(walletTransactionsPage, { silent: true }).catch(() => {});
        }
      } else {
        setIdleAnalyticsFocus();
        window.requestAnimationFrame(() => {
          render();
        });
      }
    };

    walletViewButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletViewBound === 'true') return;
      button.dataset.walletViewBound = 'true';
      button.addEventListener('click', () => {
        const nextView = String(button.getAttribute('data-wallet-view') || '').trim().toLowerCase();
        setWalletView(nextView || 'ledger');
      });
    });

    walletQuickActionButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletQuickBound === 'true') return;
      button.dataset.walletQuickBound = 'true';
      button.addEventListener('click', () => {
        const action = String(button.getAttribute('data-wallet-quick-action') || '').trim().toLowerCase();
        if (action === 'send') {
          openTransferModal();
          return;
        }
        if (action === 'receive') {
          openReceiveModal();
          return;
        }
        if (action === 'refresh') {
          refreshWalletLedgerData({ silent: true, notifyIncoming: true }).catch(() => {});
        }
      });
    });

    walletTransferCloseEls.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletQuickBound === 'true') return;
      button.dataset.walletQuickBound = 'true';
      button.addEventListener('click', () => {
        closeTransferModal();
      });
    });

    if (walletTransferToUserIdEl instanceof HTMLInputElement && walletTransferToUserIdEl.dataset.walletRecipientBound !== 'true') {
      walletTransferToUserIdEl.dataset.walletRecipientBound = 'true';

      walletTransferToUserIdEl.addEventListener('input', () => {
        if (walletTransferSearchTimer) {
          window.clearTimeout(walletTransferSearchTimer);
          walletTransferSearchTimer = null;
        }
        setTransferStatus('');
        const rawValue = String(walletTransferToUserIdEl.value || '').trim();
        clearWalletTransferSelectedRecipient();
        if (!rawValue) {
          walletTransferSearchRequestId += 1;
          walletTransferSearchResults = [];
          renderWalletTransferSearch({ items: [], message: '' });
          return;
        }

        walletTransferSearchTimer = window.setTimeout(() => {
          walletTransferSearchTimer = null;
          runWalletTransferSearch(rawValue, { includeRemote: true }).catch(() => {
            renderWalletTransferSearch({ items: [], message: 'Не вдалося виконати пошук.' });
          });
        }, 240);
      });

      walletTransferToUserIdEl.addEventListener('blur', () => {
        if (walletTransferSearchTimer) {
          window.clearTimeout(walletTransferSearchTimer);
          walletTransferSearchTimer = null;
        }
        const rawValue = String(walletTransferToUserIdEl.value || '').trim();
        if (!rawValue) {
          renderWalletTransferSearch({ items: [], message: '' });
          return;
        }
        runWalletTransferSearch(rawValue, { includeRemote: true }).catch(() => {
          renderWalletTransferSearch({ items: [], message: 'Не вдалося виконати пошук.' });
        });
      });

      walletTransferToUserIdEl.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        submitWalletTransfer().catch(() => {});
      });
    }

    if (walletTransferRecipientSearchEl instanceof HTMLElement && walletTransferRecipientSearchEl.dataset.walletRecipientBound !== 'true') {
      walletTransferRecipientSearchEl.dataset.walletRecipientBound = 'true';
      walletTransferRecipientSearchEl.addEventListener('click', (event) => {
        const optionEl = event.target.closest('[data-wallet-transfer-recipient-id]');
        if (!(optionEl instanceof HTMLButtonElement)) return;
        const recipientId = String(optionEl.getAttribute('data-wallet-transfer-recipient-id') || '').trim();
        if (!recipientId) return;
        const nextRecipient = walletTransferSearchResults.find((item) => item.id === recipientId) || null;
        if (!nextRecipient) return;

        walletTransferSelectedRecipient = nextRecipient;
        const displayValue = nextRecipient.tag ? `@${nextRecipient.tag}` : nextRecipient.name;
        if (walletTransferToUserIdEl instanceof HTMLInputElement) {
          walletTransferToUserIdEl.value = displayValue;
        }
        renderWalletTransferRecipient(nextRecipient);
        renderWalletTransferSearch({ items: walletTransferSearchResults });
        walletTransferRecipientSearchEl.hidden = true;
        setTransferStatus(`Отримувач: ${nextRecipient.name}`, 'success');
      });
    }

    walletReceiveCloseEls.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletQuickBound === 'true') return;
      button.dataset.walletQuickBound = 'true';
      button.addEventListener('click', () => {
        closeReceiveModal();
      });
    });

    if (walletTransferSubmitEl instanceof HTMLButtonElement && walletTransferSubmitEl.dataset.walletQuickBound !== 'true') {
      walletTransferSubmitEl.dataset.walletQuickBound = 'true';
      walletTransferSubmitEl.addEventListener('click', () => {
        submitWalletTransfer().catch(() => {});
      });
    }

    if (walletReceiveCopyBtn instanceof HTMLButtonElement && walletReceiveCopyBtn.dataset.walletQuickBound !== 'true') {
      walletReceiveCopyBtn.dataset.walletQuickBound = 'true';
      walletReceiveCopyBtn.addEventListener('click', async () => {
        const value = String(walletReceiveUserIdEl?.value || '').trim();
        if (!value) {
          setReceiveStatus('Не вдалося знайти ваш ID.', 'error');
          return;
        }
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
          } else if (walletReceiveUserIdEl instanceof HTMLInputElement) {
            walletReceiveUserIdEl.select();
            document.execCommand('copy');
          }
          setReceiveStatus('ID скопійовано.', 'success');
        } catch {
          setReceiveStatus('Не вдалося скопіювати ID.', 'error');
        }
      });
    }

    if (paginationPrevBtn && paginationPrevBtn.dataset.walletPaginationBound !== 'true') {
      paginationPrevBtn.dataset.walletPaginationBound = 'true';
      paginationPrevBtn.addEventListener('click', () => {
        if (walletTransactionsLoading || walletTransactionsPage <= 1) return;
        loadWalletTransactionsPage(walletTransactionsPage - 1, { silent: true }).catch(() => {});
      });
    }

    if (paginationNextBtn && paginationNextBtn.dataset.walletPaginationBound !== 'true') {
      paginationNextBtn.dataset.walletPaginationBound = 'true';
      paginationNextBtn.addEventListener('click', () => {
        if (walletTransactionsLoading || walletTransactionsPage >= walletTransactionsTotalPages) return;
        loadWalletTransactionsPage(walletTransactionsPage + 1, { silent: true }).catch(() => {});
      });
    }

    if (paginationPagesEl && paginationPagesEl.dataset.walletPaginationBound !== 'true') {
      paginationPagesEl.dataset.walletPaginationBound = 'true';
      paginationPagesEl.addEventListener('click', (event) => {
        const pageButton = event.target.closest('[data-wallet-page]');
        if (!(pageButton instanceof HTMLButtonElement) || !paginationPagesEl.contains(pageButton)) return;
        if (walletTransactionsLoading) return;
        const nextPage = parsePaginationInteger(pageButton.getAttribute('data-wallet-page'), walletTransactionsPage, { min: 1 });
        if (nextPage === walletTransactionsPage) return;
        loadWalletTransactionsPage(nextPage, { silent: true }).catch(() => {});
      });
    }

    const render = () => {
      const balance = this.getTapBalanceCents();
      const history = walletTransactionsLoadedFromBackend
        ? walletTransactionsFullListEntries
        : this.getCoinTransactionHistory();
      if (!walletTransactionsLoadedFromBackend && !walletTransactionsPageEntries.length) {
        setLocalWalletTransactionsPage(walletTransactionsPage);
      }
      const transactionsCount = walletTransactionsLoadedFromBackend
        ? walletTransactionsTotalCount
        : history.length;

      balanceEl.textContent = this.formatCoinBalance(balance);
      if (countEl) countEl.textContent = String(transactionsCount);
      if (badgeEl) badgeEl.textContent = `Транзакцій: ${transactionsCount}`;

      renderWalletTransactionsList();
      renderAnalytics(history);
    };

    setLocalWalletTransactionsPage(1);
    getSortedWalletEntriesSnapshot().forEach((entry, index) => {
      const txId = getWalletTransactionId(entry, index);
      if (txId) this.walletIncomingTransferNotifiedIds.add(txId);
    });
    render();
    setWalletView(
      String(safeOptions.view || this.walletActiveView || 'ledger').trim().toLowerCase(),
      { persist: true }
    );
    loadWalletTransactionsPage(walletTransactionsPage, { silent: true }).catch(() => {});
    const pendingWalletAction = String(this.pendingWalletAction || '').trim().toLowerCase();
    if (pendingWalletAction === 'send' || pendingWalletAction === 'receive') {
      this.pendingWalletAction = '';
      window.requestAnimationFrame(() => {
        if (pendingWalletAction === 'send') openTransferModal();
        if (pendingWalletAction === 'receive') openReceiveModal();
      });
    }
    this.refreshCoinWalletFromBackend({ includeTransactions: false, silent: true })
      .then(() => {
        render();
      })
      .catch(() => {});
  }


  showSettingsSubsection(subsectionName, settingsContainerId, sourceSection = null) {
    const sectionMap = {
      'notifications': 'notifications-settings',
      'privacy': 'privacy-settings',
      'messages': 'messages-settings',
      'appearance': 'appearance-settings',
      'language': 'language-settings',
      'faq': 'faq-settings',
      'wallet': 'wallet',
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
      this.showDesktopBrowserNotification({
        title: 'Nymo',
        body: 'Тестове сповіщення працює.',
        notificationKey: `system:test:${Date.now()}`,
        requireEnabledSetting: false,
        closeAfterMs: 3500
      });
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


  isStandalonePwaMode() {
    const mediaStandalone = typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator?.standalone === true;
    return Boolean(mediaStandalone || iosStandalone);
  }


  updatePwaControls(settingsContainer) {
    const installStateEl = settingsContainer?.querySelector('#pwaInstallState');
    const installBtn = settingsContainer?.querySelector('#pwaInstallActionBtn');
    const updateStateEl = settingsContainer?.querySelector('#pwaUpdateState');
    const updateBtn = settingsContainer?.querySelector('#pwaUpdateActionBtn');
    if (!installStateEl || !installBtn || !updateStateEl || !updateBtn) return;

    const isSupported = 'serviceWorker' in navigator;
    const isInstalled = this.isStandalonePwaMode();
    const deferredPrompt = window.__ORION_PWA_DEFERRED_PROMPT || null;
    const updateRegistration = window.__ORION_PWA_UPDATE_REGISTRATION || null;
    const hasUpdate = Boolean(updateRegistration?.waiting);

    if (!('serviceWorker' in navigator)) {
      installStateEl.textContent = 'PWA не підтримується у цьому браузері';
      installBtn.textContent = 'Недоступно';
      installBtn.disabled = true;
      updateStateEl.textContent = 'Service Worker недоступний';
      updateBtn.textContent = 'Недоступно';
      updateBtn.disabled = true;
      return;
    }

    if (isInstalled) {
      installStateEl.textContent = 'Застосунок уже встановлено';
      installBtn.textContent = 'Встановлено';
      installBtn.disabled = true;
    } else if (deferredPrompt) {
      installStateEl.textContent = 'Можна встановити Nymo як застосунок';
      installBtn.textContent = 'Встановити';
      installBtn.disabled = false;
    } else if (isSupported) {
      installStateEl.textContent = 'Браузер ще не дозволив показати вікно встановлення для цієї сторінки';
      installBtn.textContent = 'Очікування';
      installBtn.disabled = true;
    } else {
      installStateEl.textContent = 'PWA не підтримується у цьому браузері';
      installBtn.textContent = 'Недоступно';
      installBtn.disabled = true;
    }

    if (hasUpdate) {
      updateStateEl.textContent = 'Є нова версія Nymo';
      updateBtn.textContent = 'Оновити';
      updateBtn.disabled = false;
    } else {
      updateStateEl.textContent = 'Остання версія вже активна';
      updateBtn.textContent = 'Актуально';
      updateBtn.disabled = true;
    }
  }


  async handlePwaInstallAction(settingsContainer) {
    const deferredPrompt = window.__ORION_PWA_DEFERRED_PROMPT || null;
    if (!deferredPrompt || typeof deferredPrompt.prompt !== 'function') {
      this.updatePwaControls(settingsContainer);
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (_) {
      // Ignore prompt dismissal errors.
    } finally {
      window.__ORION_PWA_DEFERRED_PROMPT = null;
      this.updatePwaControls(settingsContainer);
    }
  }


  handlePwaUpdateAction() {
    const registration = window.__ORION_PWA_UPDATE_REGISTRATION || null;
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }


  applyThemeMode(mode) {
    const themeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    this.settings = { ...(this.settings || {}), theme: themeMode };
    this.saveSettings(this.settings);
    this.loadTheme();
  }

  // Метод-обгортка для імпортованої функції setupSettingsSwipeBack
}
