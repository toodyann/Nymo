import { setupSettingsSwipeBack } from '../swipe-handlers.js';
import { escapeHtml } from '../ui-helpers.js';

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
      filterCloseEl.addEventListener('click', () => {
        setFilterPanelOpen(false);
      });
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
        this.setTapBalanceCents(balance - item.price);
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
    const tapperContentEl = settingsContainer.querySelector('.coin-tapper-content');
    const balanceEl = settingsContainer.querySelector('#coinTapBalance');
    const tapBtn = settingsContainer.querySelector('#coinTapBtn');
    const levelIslandEl = settingsContainer.querySelector('.coin-level-island');
    const rateEl = settingsContainer.querySelector('.coin-tapper-rate');
    const levelValueEl = settingsContainer.querySelector('#coinTapLevelValue');
    const rewardValueEl = settingsContainer.querySelector('#coinTapRewardValue');
    if (!balanceEl || !tapBtn) return;

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

        this.setTapBalanceCents(this.getTapBalanceCents() + sellPrice);
        renderInventory();
      }
    });
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
    const stored = this.readJsonStorage('bridge_blocked_chat_ids', []);
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
      window.localStorage.setItem('bridge_blocked_chat_ids', JSON.stringify(normalized));
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
    const appEl = document.querySelector('.bridge-app');
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
      }

      if (sectionName === 'profile') {
        this.settingsParentSection = 'profile';
        const profileName = settingsContainer.querySelector('#profileDisplayName');
        const profileBio = settingsContainer.querySelector('#profileDisplayBio');
        const profileEmail = settingsContainer.querySelector('#profileDisplayEmail');
        const profileDob = settingsContainer.querySelector('#profileDisplayDob');
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        const inlineEditBtn = settingsContainer.querySelector('.profile-edit-inline');
        const profileMyItemsBtn = settingsContainer.querySelector('#profileMyItemsBtn');
        const menuItems = settingsContainer.querySelectorAll('.settings-menu-item');

        if (profileName) profileName.textContent = this.user.name;
        if (profileBio) profileBio.textContent = this.user.bio || '';
        if (profileEmail) profileEmail.textContent = this.user.email || '';
        if (profileDob) profileDob.textContent = this.formatBirthDate(this.user.birthDate);

        this.renderProfileAvatar(avatarDiv);
        this.applyProfileAura(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileMotion(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileBadge(settingsContainer.querySelector('#profileNameBadges'));
        this.updateProfileMenuButton();

        const openProfileSettings = () => this.showSettings('profile-settings');
        if (inlineEditBtn) inlineEditBtn.addEventListener('click', openProfileSettings);
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
          const chatContainer = document.getElementById('chatContainer');
          const welcomeScreen = document.getElementById('welcomeScreen');
          if (chatContainer) chatContainer.style.display = '';
          if (welcomeScreen) welcomeScreen.classList.remove('hidden');
          // Set nav back to chats
          const navChats = document.getElementById('navChats');
          if (navChats) this.setActiveNavButton(navChats);
        });
      }
      
      // Додаємо свайп для повернення назад в підрозділах
      if (sectionName !== 'messenger-settings' && sectionName !== 'profile' && sectionName !== 'calls' && sectionName !== 'mini-games') {
        this.setupSettingsSwipeBack(settingsContainer);
      }
      
      const closeButtons = settingsContainer.querySelectorAll('.btn-secondary:not(.btn-change-avatar)');
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
    
    if (this.currentChat) {
      this.renderChat();
    }
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

  handleAvatarChange(settingsContainer) {
    const colors = [
      'linear-gradient(135deg, #ff9500, #ff6b6b)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
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
