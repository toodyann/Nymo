import { setupMobileSwipeBack } from '../../shared/gestures/swipe-handlers.js';
import { getContactColor } from '../../shared/helpers/ui-helpers.js';

export class ChatAppCoreMethods {
  readJsonStorage(key, fallback) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallback;

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(`Invalid JSON in localStorage for key "${key}", resetting value.`);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  loadUserProfile() {
    const data = this.readJsonStorage('orion_user', null);
    if (data && typeof data === 'object') {
      const avatarImage = String(data.avatarImage || data.avatarUrl || '').trim();
      return {
        name: data.name || 'Користувач Orion',
        email: data.email || 'user@example.com',
        status: data.status || 'online',
        bio: data.bio || 'Вітаю!',
        birthDate: data.birthDate || '',
        createdAt: data.createdAt || new Date().toISOString(),
        avatarColor: data.avatarColor || '',
        avatarImage,
        avatarUrl: avatarImage,
        equippedAvatarFrame: data.equippedAvatarFrame || '',
        equippedProfileAura: data.equippedProfileAura || '',
        equippedProfileMotion: data.equippedProfileMotion || '',
        equippedProfileBadge: data.equippedProfileBadge || '',
        equippedDriveCar: data.equippedDriveCar || '',
        equippedDriveSmokeColor: data.equippedDriveSmokeColor || ''
      };
    }
    return {
      name: 'Користувач Orion',
      email: 'user@example.com',
      status: 'online',
      bio: 'Вітаю!',
      birthDate: '',
      createdAt: new Date().toISOString(),
      avatarColor: 'linear-gradient(135deg, #6b7280, #9ca3af)',
      avatarImage: '',
      avatarUrl: '',
      equippedAvatarFrame: '',
      equippedProfileAura: '',
      equippedProfileMotion: '',
      equippedProfileBadge: '',
      equippedDriveCar: '',
      equippedDriveSmokeColor: ''
    };
  }

  saveUserProfile(userData) {
    const avatarImage = this.getAvatarImage(userData?.avatarImage || userData?.avatarUrl);
    const nextUserData = {
      ...userData,
      avatarImage,
      avatarUrl: avatarImage
    };
    this.user = nextUserData;
    localStorage.setItem('orion_user', JSON.stringify(nextUserData));
    this.updateProfileMenuButton();
    this.updateProfileDisplay();
  }

  formatCoinBalance(value, wholeDigits = 1) {
    const cents = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    const minWholeDigits = Number.isFinite(wholeDigits) ? Math.max(1, Math.floor(wholeDigits)) : 1;
    const whole = String(Math.floor(cents / 100)).padStart(minWholeDigits, '0');
    const fraction = String(cents % 100).padStart(2, '0');
    return `${whole},${fraction}`;
  }

  formatShopIslandBalance(value) {
    return this.formatCoinBalance(value, 1);
  }

  getTapLevelThreshold(level = 1) {
    const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
    return Math.floor(100 * Math.pow(1.25, safeLevel - 1));
  }

  getTapTotalClicks() {
    try {
      const raw = window.localStorage.getItem('orionTapTotalClicks');
      const value = Number.parseInt(raw || '0', 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  setTapTotalClicks(value) {
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    this.tapTotalClicks = safeValue;
    try {
      window.localStorage.setItem('orionTapTotalClicks', String(safeValue));
    } catch {
      // Ignore storage failures and keep the in-memory value.
    }
  }

  getTapLevelStats(totalClicks = this.getTapTotalClicks()) {
    const safeClicks = Number.isFinite(totalClicks) && totalClicks >= 0 ? Math.floor(totalClicks) : 0;
    let remainingClicks = safeClicks;
    let level = 1;
    let tapsPerLevel = this.getTapLevelThreshold(level);

    while (remainingClicks >= tapsPerLevel) {
      remainingClicks -= tapsPerLevel;
      level += 1;
      tapsPerLevel = this.getTapLevelThreshold(level);
    }

    const rewardPerTapCents = level;
    const currentLevelClicks = remainingClicks;
    const levelProgress = tapsPerLevel > 0 ? currentLevelClicks / tapsPerLevel : 0;

    return {
      level,
      tapsPerLevel,
      totalClicks: safeClicks,
      currentLevelClicks,
      levelProgress,
      rewardPerTapCents
    };
  }

  getTapBalanceCents() {
    try {
      const raw = window.localStorage.getItem('orionTapBalanceCents');
      const value = Number.parseInt(raw || '0', 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  setTapBalanceCents(value) {
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    this.tapBalanceCents = safeValue;
    try {
      window.localStorage.setItem('orionTapBalanceCents', String(safeValue));
    } catch {
      // Ignore storage failures and keep the in-memory value.
    }
    const balanceTargets = document.querySelectorAll('#coinTapBalance, #shopBalanceValue');
    balanceTargets.forEach(el => {
      el.textContent = this.formatCoinBalance(safeValue);
    });
    document.querySelectorAll('#shopIslandBalance').forEach(el => {
      el.textContent = this.formatShopIslandBalance(safeValue);
    });
  }

  getCoinTransactionHistory() {
    const stored = this.readJsonStorage('orion_coin_transactions', []);
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const amountCents = Number.parseInt(entry.amountCents, 10);
        if (!Number.isFinite(amountCents) || amountCents === 0) return null;
        const createdAt = typeof entry.createdAt === 'string' && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString();
        const title = typeof entry.title === 'string' && entry.title.trim()
          ? entry.title.trim()
          : 'Транзакція';
        const category = typeof entry.category === 'string' && entry.category.trim()
          ? entry.category.trim()
          : 'general';
        const id = typeof entry.id === 'string' && entry.id
          ? entry.id
          : `${createdAt}-${Math.random().toString(16).slice(2, 10)}`;
        return {
          id,
          amountCents,
          createdAt,
          title,
          category
        };
      })
      .filter(Boolean)
      .slice(0, 200);
  }

  saveCoinTransactionHistory(entries) {
    const safeEntries = Array.isArray(entries) ? entries.slice(0, 200) : [];
    try {
      window.localStorage.setItem('orion_coin_transactions', JSON.stringify(safeEntries));
    } catch {
      // Ignore storage failures and keep runtime flow.
    }
    return safeEntries;
  }

  addCoinTransaction({ amountCents = 0, title = 'Транзакція', category = 'general' } = {}) {
    const safeAmount = Number.isFinite(amountCents) ? Math.trunc(amountCents) : 0;
    if (!safeAmount) return null;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      amountCents: safeAmount,
      createdAt: new Date().toISOString(),
      title: typeof title === 'string' && title.trim() ? title.trim() : 'Транзакція',
      category: typeof category === 'string' && category.trim() ? category.trim() : 'general'
    };

    const history = this.getCoinTransactionHistory();
    history.unshift(entry);
    this.saveCoinTransactionHistory(history);
    return entry;
  }

  applyCoinTransaction(deltaCents, title, options = {}) {
    const safeDelta = Number.isFinite(deltaCents) ? Math.trunc(deltaCents) : 0;
    if (!safeDelta) return false;

    const currentBalance = this.getTapBalanceCents();
    const nextBalance = Math.max(0, currentBalance + safeDelta);
    const appliedDelta = nextBalance - currentBalance;
    if (!appliedDelta) return false;

    this.setTapBalanceCents(nextBalance);
    if (options.record !== false) {
      this.addCoinTransaction({
        amountCents: appliedDelta,
        title,
        category: options.category || 'general'
      });
    }
    return true;
  }

  getShopCatalog() {
    return [
      {
        id: 'frame_solar',
        type: 'frame',
        effect: 'solar',
        title: 'Solar Ring',
        description: 'Тепла золота рамка навколо аватарки.',
        price: 250
      },
      {
        id: 'frame_neon',
        type: 'frame',
        effect: 'neon',
        title: 'Neon Pulse',
        description: 'Світловий контур із холодним акцентом.',
        price: 420
      },
      {
        id: 'frame_crystal',
        type: 'frame',
        effect: 'crystal',
        title: 'Crystal Edge',
        description: 'Світлий кристалічний обідок для аватара.',
        price: 560
      },
      {
        id: 'frame_ember',
        type: 'frame',
        effect: 'ember',
        title: 'Ember Loop',
        description: 'Теплий вогняний акцент для яскравого профілю.',
        price: 640
      },
      {
        id: 'frame_mint',
        type: 'frame',
        effect: 'mint',
        title: 'Mint Orbit',
        description: 'Свіжий м’ятний обідок з м’яким сяйвом.',
        price: 720
      },
      {
        id: 'frame_shadow',
        type: 'frame',
        effect: 'shadow',
        title: 'Shadow Loop',
        description: 'Глибокий темний контур для стриманого стилю.',
        price: 810
      },
      {
        id: 'aura_aurora',
        type: 'aura',
        effect: 'aurora',
        title: 'Aurora Glow',
        description: 'М’яке сяйво для картки профілю.',
        price: 680
      },
      {
        id: 'aura_cosmic',
        type: 'aura',
        effect: 'cosmic',
        title: 'Cosmic Wave',
        description: 'Космічний перелив у фоні профілю.',
        price: 860
      },
      {
        id: 'aura_sunset',
        type: 'aura',
        effect: 'sunset',
        title: 'Sunset Mist',
        description: 'Тепла помаранчева аура для hero-блоку.',
        price: 990
      },
      {
        id: 'aura_frost',
        type: 'aura',
        effect: 'frost',
        title: 'Frost Veil',
        description: 'Холодний скляний серпанок для спокійного вигляду.',
        price: 1080
      },
      {
        id: 'aura_sunbeam',
        type: 'aura',
        effect: 'sunbeam',
        title: 'Sunbeam Dust',
        description: 'Теплий золотий підсвіт із м’яким світлом.',
        price: 1190
      },
      {
        id: 'aura_midnight',
        type: 'aura',
        effect: 'midnight',
        title: 'Midnight Flow',
        description: 'Глибокий нічний перелив з темним акцентом.',
        price: 1320
      },
      {
        id: 'motion_glint',
        type: 'motion',
        effect: 'glint',
        title: 'Silver Drift',
        description: 'Світловий перелив, що м’яко проходить по картці профілю.',
        price: 940
      },
      {
        id: 'motion_orbit',
        type: 'motion',
        effect: 'orbit',
        title: 'Orbit Pulse',
        description: 'Плаваючі світлові хвилі для живого фону hero-блоку.',
        price: 1180
      },
      {
        id: 'motion_prism',
        type: 'motion',
        effect: 'prism',
        title: 'Prism Flow',
        description: 'Повільний призматичний рух із переливом по всій картці.',
        price: 1410
      },
      {
        id: 'badge_spark',
        type: 'badge',
        effect: 'spark',
        title: 'Spark Dot',
        description: 'Яскравий акцент-іскра, що з’являється після імені.',
        price: 360
      },
      {
        id: 'badge_comet',
        type: 'badge',
        effect: 'comet',
        title: 'Comet Tag',
        description: 'Мініатюрна комета праворуч від ніка в стилі Orion.',
        price: 430
      },
      {
        id: 'badge_crown',
        type: 'badge',
        effect: 'crown',
        title: 'Crown Mark',
        description: 'Стримана корона, яка додає статусу біля імені.',
        price: 540
      },
      {
        id: 'badge_orbit',
        type: 'badge',
        effect: 'orbit',
        title: 'Orbit Mark',
        description: 'Планетарний значок для впізнаваного вигляду профілю.',
        price: 620
      }
    ];
  }

  loadShopInventory() {
    const stored = this.readJsonStorage('orion_shop_inventory', []);
    return Array.isArray(stored) ? stored : [];
  }

  saveShopInventory(items) {
    const uniqueItems = [...new Set(Array.isArray(items) ? items : [])];
    localStorage.setItem('orion_shop_inventory', JSON.stringify(uniqueItems));
    return uniqueItems;
  }

  getShopItem(itemId) {
    return this.getShopCatalog().find(item => item.id === itemId) || null;
  }

  applyAvatarDecoration(avatarEl) {
    if (!avatarEl) return;
    const frame = this.user?.equippedAvatarFrame || '';
    avatarEl.dataset.avatarFrame = frame;
    avatarEl.classList.toggle('has-avatar-frame', Boolean(frame));
  }

  applyProfileAura(cardEl) {
    if (!cardEl) return;
    const aura = this.user?.equippedProfileAura || '';
    cardEl.dataset.profileAura = aura;
    cardEl.classList.toggle('has-profile-aura', Boolean(aura));
  }

  applyProfileMotion(cardEl) {
    if (!cardEl) return;
    const motion = this.user?.equippedProfileMotion || '';
    cardEl.dataset.profileMotion = motion;
    cardEl.classList.toggle('has-profile-motion', Boolean(motion));
  }

  getProfileBadgeDefinition(effect) {
    const definitions = {
      spark: {
        label: 'Spark',
        path: 'M144 24l14 50 50 14-50 14-14 50-14-50-50-14 50-14 14-50zm-72 120l9 31 31 9-31 9-9 31-9-31-31-9 31-9 9-31z'
      },
      comet: {
        label: 'Comet',
        path: 'M208 112a72 72 0 11-72-72 8 8 0 010 16 56 56 0 1056 56 8 8 0 0116 0zM48 208l44-12-32-32-12 44zm54.34-65.66l11.32 11.32 82.34-82.34a8 8 0 00-11.32-11.32z'
      },
      crown: {
        label: 'Crown',
        path: 'M40 184l16-96 48 40 24-56 24 56 48-40 16 96H40zm18.88-16h138.24l-8.77-52.6-42.23 35.2a8 8 0 01-12.31-2.6L128 99.75 122.19 148a8 8 0 01-12.31 2.6l-42.23-35.2z'
      },
      orbit: {
        label: 'Orbit',
        path: 'M128 56a40 40 0 110 80 40 40 0 010-80zm0 16a24 24 0 100 48 24 24 0 000-48zm0-40c55.23 0 100 17.91 100 40s-44.77 40-100 40-100-17.91-100-40 44.77-40 100-40zm0 16c-51.34 0-84 16.18-84 24s32.66 24 84 24 84-16.18 84-24-32.66-24-84-24zm56 88c24.3 7.31 40 19.1 40 32 0 22.09-44.77 40-100 40s-100-17.91-100-40c0-12.9 15.7-24.69 40-32a8 8 0 114.61 15.32C51.14 156.58 40 162.66 40 168c0 7.82 32.66 24 84 24s84-16.18 84-24c0-5.34-11.14-11.42-28.61-16.68A8 8 0 11184 136z'
      }
    };
    return definitions[effect] || null;
  }

  getProfileBadgeMarkup(effect, extraClass = '') {
    const badge = this.getProfileBadgeDefinition(effect);
    if (!badge) return '';
    const className = ['profile-badge-chip', extraClass].filter(Boolean).join(' ');
    const safeLabel = this.escapeAttr(badge.label);
    return `
      <span class="${className}" data-profile-badge="${this.escapeAttr(effect)}" title="${safeLabel}" aria-label="${safeLabel}">
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="${badge.path}"></path>
        </svg>
      </span>
    `.trim();
  }

  applyProfileBadge(containerEl) {
    if (!containerEl) return;
    const badge = this.user?.equippedProfileBadge || '';
    containerEl.innerHTML = badge ? this.getProfileBadgeMarkup(badge) : '';
    containerEl.classList.toggle('has-badge', Boolean(badge));
    containerEl.toggleAttribute('hidden', !badge);
  }

  syncProfileCosmetics(root = document) {
    root.querySelectorAll('.profile-avatar-large').forEach(avatarEl => {
      this.applyAvatarDecoration(avatarEl);
    });
    root.querySelectorAll('#profile .profile-hero-card').forEach(cardEl => {
      this.applyProfileAura(cardEl);
      this.applyProfileMotion(cardEl);
    });
    root.querySelectorAll('#profile .profile-name-badges').forEach(containerEl => {
      this.applyProfileBadge(containerEl);
    });
  }

  updateProfileMenuButton() {
    const navProfile = document.getElementById('navProfile');
    const avatarEl = navProfile?.querySelector('.nav-avatar');
    const railAvatarEl = document.getElementById('desktopRailAccountAvatar');

    const name = this.user?.name || 'Користувач Orion';

    this.applyUserAvatarToElement(avatarEl, name);
    this.applyUserAvatarToElement(railAvatarEl, name);
  }

  getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRandomAvatarGradient() {
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
    return colors[Math.floor(Math.random() * colors.length)];
  }

  escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getAvatarImage(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  getChatAvatarMeta(chat = null) {
    const source = chat && typeof chat === 'object' ? chat : {};
    const name = String(source?.name || 'Користувач').trim() || 'Користувач';
    const avatarImage = this.getAvatarImage(source?.avatarImage || source?.avatarUrl);
    const avatarColor = source?.avatarColor || this.getContactColor(name);
    return {
      name,
      avatarImage,
      avatarColor,
      initials: this.getInitials(name)
    };
  }

  applyChatAvatarToElement(avatarEl, chat = null) {
    if (!avatarEl) return;
    const { avatarImage, avatarColor, initials } = this.getChatAvatarMeta(chat);
    if (avatarImage) {
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      avatarEl.style.backgroundColor = 'transparent';
      return;
    }
    avatarEl.style.backgroundImage = '';
    avatarEl.style.backgroundColor = '';
    avatarEl.textContent = initials;
    avatarEl.style.background = avatarColor;
  }

  getChatAvatarHtml(chat = null, className = 'message-avatar') {
    const { avatarImage, avatarColor, initials } = this.getChatAvatarMeta(chat);
    const isDesktopSecondaryAvatar = String(className || '').includes('desktop-secondary-chat-avatar');
    const chatStatus = String(chat?.status || '').trim().toLowerCase();
    const showActivityIndicator = Boolean(
      isDesktopSecondaryAvatar
      && avatarImage
      && !chat?.isGroup
      && chatStatus
      && chatStatus !== 'offline'
    );
    const activityIndicatorHtml = showActivityIndicator
      ? '<span class="avatar-activity-indicator online" aria-hidden="true"></span>'
      : '';
    if (avatarImage) {
      const safeUrl = this.escapeAttr(avatarImage);
      return `<div class="${className} is-image" style="background-image: url(&quot;${safeUrl}&quot;); background-color: transparent;">${activityIndicatorHtml}</div>`;
    }
    const safeInitials = typeof this.escapeHtml === 'function' ? this.escapeHtml(initials) : initials;
    return `<div class="${className}" style="background: ${avatarColor}">${safeInitials}</div>`;
  }

  applyUserAvatarToElement(avatarEl, name = '') {
    if (!avatarEl) return;
    const displayName = name || this.user?.name || 'Користувач Orion';
    if (!this.user?.avatarColor) {
      this.user.avatarColor = this.getRandomAvatarGradient();
    }
    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url("${this.escapeAttr(userAvatarImage)}")`;
      avatarEl.style.backgroundColor = 'transparent';
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.style.backgroundColor = '';
      avatarEl.textContent = this.getInitials(displayName);
      avatarEl.style.background = this.user.avatarColor || this.getContactColor(displayName);
    }
  }

  getUserAvatarHtml() {
    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      const safeUrl = this.escapeAttr(userAvatarImage);
      return `<div class="message-avatar is-image" style="background-image: url(&quot;${safeUrl}&quot;);"></div>`;
    }
    const initials = this.getInitials(this.user?.name || 'Користувач Orion');
    return `<div class="message-avatar" style="background: ${this.user.avatarColor}">${initials}</div>`;
  }

  renderProfileAvatar(avatarEl) {
    if (!avatarEl) return;
    const name = this.user?.name || 'Користувач Orion';
    if (!this.user?.avatarColor) {
      this.user.avatarColor = this.getRandomAvatarGradient();
    }
    const imageEl = avatarEl.querySelector('.profile-avatar-image');
    const initialsEl = avatarEl.querySelector('.profile-avatar-initials');

    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      if (imageEl) {
        imageEl.src = userAvatarImage;
        imageEl.style.display = 'block';
      }
      if (initialsEl) initialsEl.style.display = 'none';
      avatarEl.style.background = 'transparent';
    } else {
      if (imageEl) imageEl.style.display = 'none';
      if (initialsEl) {
        initialsEl.textContent = this.getInitials(name);
        initialsEl.style.display = 'flex';
      }
      avatarEl.style.background = this.user.avatarColor;
    }

    this.applyAvatarDecoration(avatarEl);
  }

  updateProfileDisplay() {
    const profileSection = document.getElementById('profile');
    if (!profileSection) return;

    const profileName = profileSection.querySelector('#profileDisplayName');
    const profileHandle = profileSection.querySelector('#profileDisplayHandle');
    const profileStatus = profileSection.querySelector('#profileDisplayStatus');
    const profileBio = profileSection.querySelector('#profileDisplayBio');
    const profileEmail = profileSection.querySelector('#profileDisplayEmail');
    const profileDob = profileSection.querySelector('#profileDisplayDob');
    const profileUserId = profileSection.querySelector('#profileDisplayUserId');
    const profileStatChats = profileSection.querySelector('#profileStatChats');
    const profileStatMessages = profileSection.querySelector('#profileStatMessages');
    const profileStatCompletion = profileSection.querySelector('#profileStatCompletion');
    const profileStatMemberSince = profileSection.querySelector('#profileStatMemberSince');
    const avatarDiv = profileSection.querySelector('.profile-avatar-large');
    const handleValue = `@${String(this.user?.name || 'orion.user')
      .trim()
      .toLowerCase()
      .replace(/['`’]/g, '')
      .replace(/[^a-z0-9а-яіїєґ]+/gi, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || 'orion.user'}`;
    const statusLabelMap = {
      online: 'Онлайн',
      away: 'Не на місці',
      dnd: 'Не турбувати',
      offline: 'Офлайн'
    };
    const statusValue = String(this.user?.status || 'online').toLowerCase();
    const profileIdSource = `${this.user?.email || ''}|${this.user?.name || ''}`;
    let profileIdHash = 0;
    for (let i = 0; i < profileIdSource.length; i += 1) {
      profileIdHash = (profileIdHash * 31 + profileIdSource.charCodeAt(i)) >>> 0;
    }
    const profileId = `OR-${String(profileIdHash % 1000000).padStart(6, '0')}`;
    const chatsCount = Array.isArray(this.chats) ? this.chats.length : 0;
    const messagesCount = Array.isArray(this.chats)
      ? this.chats.reduce((total, chat) => total + (Array.isArray(chat?.messages) ? chat.messages.length : 0), 0)
      : 0;
    const completenessFilled = [
      Boolean(String(this.user?.name || '').trim()),
      Boolean(String(this.user?.email || '').trim()),
      Boolean(String(this.user?.bio || '').trim()),
      Boolean(String(this.user?.birthDate || '').trim()),
      Boolean(String(this.user?.avatarImage || this.user?.avatarUrl || '').trim())
        || Boolean(String(this.user?.avatarColor || '').trim())
    ].filter(Boolean).length;
    const completeness = Math.round((completenessFilled / 5) * 100);
    const createdAt = String(this.user?.createdAt || '').trim();
    const createdAtDate = createdAt ? new Date(createdAt) : null;
    const memberSince = createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(createdAtDate)
      : 'цього місяця';

    if (profileName) profileName.textContent = this.user.name;
    if (profileHandle) profileHandle.textContent = handleValue;
    if (profileStatus) {
      profileStatus.textContent = '';
      profileStatus.setAttribute('aria-label', statusLabelMap[statusValue] || statusLabelMap.online);
      profileStatus.dataset.status = statusValue || 'online';
    }
    if (profileBio) profileBio.textContent = this.user.bio || '';
    if (profileEmail) profileEmail.textContent = this.user.email || '';
    if (profileDob) profileDob.textContent = this.formatBirthDate(this.user.birthDate);
    if (profileUserId) profileUserId.textContent = profileId;
    if (profileStatChats) profileStatChats.textContent = String(chatsCount);
    if (profileStatMessages) profileStatMessages.textContent = String(messagesCount);
    if (profileStatCompletion) profileStatCompletion.textContent = `${completeness}%`;
    if (profileStatMemberSince) profileStatMemberSince.textContent = memberSince;

    this.renderProfileAvatar(avatarDiv);
    this.applyProfileAura(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileMotion(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileBadge(profileSection.querySelector('#profileNameBadges'));
  }

  formatBirthDate(value) {
    if (!value) return '—';
    const dateObj = new Date(`${value}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }

  loadSettings() {
    const saved = this.readJsonStorage('orion_settings', null);
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {
      soundNotifications: true,
      desktopNotifications: true,
      showOnlineStatus: true,
      showTypingIndicator: true,
      vibrationEnabled: true,
      messagePreview: true,
      readReceipts: true,
      lastSeen: true,
      twoFactorAuth: true,
      profileVisibility: 'friends',
      hideBlockedChats: true,
      enterToSend: true,
      autoPlayMedia: true,
      autoSaveMedia: false,
      animationsEnabled: true,
      compactMode: false,
      language: 'uk',
      fontSize: 'medium',
      theme: 'system'
    };
  }

  saveSettings(settingsData) {
    this.settings = settingsData;
    localStorage.setItem('orion_settings', JSON.stringify(settingsData));
  }

  applySettingsToUI() {
    const root = document.documentElement;
    const settings = this.settings || {};
    root.classList.toggle('no-animations', settings.animationsEnabled === false);
    root.classList.toggle('compact-mode', settings.compactMode === true);
    root.classList.toggle('no-message-preview', settings.messagePreview === false);
    root.setAttribute('lang', settings.language === 'en' ? 'en' : 'uk');
    if (typeof this.updateRealtimePrivacyState === 'function') {
      this.updateRealtimePrivacyState();
    }
    this.updateProfileDisplay();
  }

  // Метод-обгортка для імпортованої функції
  getContactColor(name) {
    return getContactColor(name);
  }

  syncThemeToggleCheckboxes() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    document.querySelectorAll('#themeToggleCheckbox').forEach((checkbox) => {
      checkbox.checked = isDark;
    });
  }

  applySystemTheme() {
    const prefersDark = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    document.documentElement.classList.toggle('dark-theme', prefersDark);
    this.syncThemeToggleCheckboxes();
  }

  bindSystemThemeListener() {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (this.themeMediaQuery && this.themeMediaQueryHandler) {
      if (typeof this.themeMediaQuery.removeEventListener === 'function') {
        this.themeMediaQuery.removeEventListener('change', this.themeMediaQueryHandler);
      } else if (typeof this.themeMediaQuery.removeListener === 'function') {
        this.themeMediaQuery.removeListener(this.themeMediaQueryHandler);
      }
    }

    this.themeMediaQuery = mediaQuery;
    this.themeMediaQueryHandler = () => {
      if (this.settings?.theme === 'system') {
        this.applySystemTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', this.themeMediaQueryHandler);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(this.themeMediaQueryHandler);
    }
  }

  loadTheme() {
    const themeMode = this.settings?.theme || 'system';
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('orion_theme', 'dark');
      this.syncThemeToggleCheckboxes();
    } else if (themeMode === 'light') {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('orion_theme', 'light');
      this.syncThemeToggleCheckboxes();
    } else {
      this.settings = { ...(this.settings || {}), theme: 'system' };
      localStorage.setItem('orion_settings', JSON.stringify(this.settings));
      this.applySystemTheme();
    }
    this.bindSystemThemeListener();
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('orion_theme', isDark ? 'dark' : 'light');
    this.settings = { ...(this.settings || {}), theme: isDark ? 'dark' : 'light' };
    localStorage.setItem('orion_settings', JSON.stringify(this.settings));
    this.syncThemeToggleCheckboxes();
    if (!this.currentChat && window.innerWidth > 768) {
      this.restoreBottomNavToHome({ animate: false });
    }
  }

  getChatsStorageKey() {
    const userId = typeof this.getAuthUserId === 'function' ? this.getAuthUserId() : '';
    if (userId) return `orion_chats:${userId}`;
    return 'orion_chats';
  }

  loadChats() {
    const primaryKey = this.getChatsStorageKey();
    const stored = this.readJsonStorage(primaryKey, null);
    if (Array.isArray(stored)) {
      return stored.map((chat) => {
        if (!chat || typeof chat !== 'object') return chat;
        const participantId = String(chat.participantId || '').trim();
        const groupParticipants = Array.isArray(chat.groupParticipants) ? chat.groupParticipants : [];
        const members = Array.isArray(chat.members) ? chat.members : [];
        let isGroup = chat.isGroup;
        if (typeof this.normalizeBooleanLike === 'function') {
          isGroup = this.normalizeBooleanLike(isGroup, false);
        } else if (typeof isGroup === 'string') {
          const normalized = isGroup.trim().toLowerCase();
          isGroup = !['false', '0', 'no', 'off'].includes(normalized) && Boolean(normalized);
        } else {
          isGroup = Boolean(isGroup);
        }

        // Legacy repair: some direct chats were persisted as groups.
        if (isGroup && participantId && groupParticipants.length <= 1 && members.length <= 1) {
          isGroup = false;
        }

        return {
          ...chat,
          isGroup,
          participantId: participantId || null
        };
      });
    }
    return [];
  }

  saveChats() {
    localStorage.setItem(this.getChatsStorageKey(), JSON.stringify(this.chats));
  }

  setupModalEnterHandlers() {
    const newChatModal = document.getElementById('newChatModal');
    if (newChatModal) {
      newChatModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && newChatModal.classList.contains('active')) {
          const input = e.target;
          if (input.id === 'newContactInput' || input.id === 'groupMembersInput') {
            e.preventDefault();
            this.createNewChat();
          }
        }
      });
    }

    const groupInfoModal = document.getElementById('groupInfoModal');
    if (groupInfoModal) {
      groupInfoModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && groupInfoModal.classList.contains('active')) {
          e.preventDefault();
          this.saveGroupInfo();
        }
      });
    }

    const groupAppearanceModal = document.getElementById('groupAppearanceModal');
    if (groupAppearanceModal) {
      groupAppearanceModal.addEventListener('keydown', (e) => {
        if (!groupAppearanceModal.classList.contains('active')) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          const target = e.target;
          if (target?.id === 'groupAppearanceNameInput') {
            e.preventDefault();
            this.saveGroupAppearance();
          }
        }
      });
    }

    const addToGroupModal = document.getElementById('addToGroupModal');
    if (addToGroupModal) {
      addToGroupModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && addToGroupModal.classList.contains('active')) {
          e.preventDefault();
          this.confirmAddToGroup();
        }
      });
    }
  }

  init() {
    this.setupEventListeners();
    this.setupModalEnterHandlers();
    this.ensureBottomNavHomeAnchor();
    this.restoreBottomNavToHome({ animate: false });
    this.setupDesktopChatWheelScroll();
    this.renderChatsList();
    this.applyFontSize(this.settings.fontSize);
    this.applySettingsToUI();
    this.updateProfileMenuButton();
    this.updateBottomNavIndicator();
    this.setupMobileSwipeBack();
    this.setupBottomNavReveal();
    this.setMobilePageScrollLock(false);
    if (window.innerWidth > 768 && typeof this.openDesktopSecondaryMenu === 'function') {
      this.openDesktopSecondaryMenu('navChats', { activateFirst: true });
    }
    if (window.innerWidth <= 768) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    window.addEventListener('resize', () => {
      this.updateBottomNavIndicator();
      this.handleBottomNavResize();
      this.applyMobileChatViewportLayout();
    });

    this.mobileTouchMoveLockHandler = (event) => {
      if (window.innerWidth > 900) return;
      const appEl = document.querySelector('.orion-app');
      if (!appEl || !appEl.classList.contains('chat-active')) return;
      const messages = document.getElementById('messagesContainer');
      const chatsList = document.getElementById('chatsList');
      const sidebar = document.querySelector('.sidebar');
      const imageViewer = document.getElementById('imageViewerOverlay');
      if (!messages) return;
      const target = event.target;
      const withinMessages = target instanceof Node && messages.contains(target);
      const withinChatsList = target instanceof Node && chatsList?.contains(target);
      const withinSidebar = target instanceof Node && sidebar?.contains(target);
      const withinImageViewer = target instanceof Node && imageViewer?.contains(target);
      if (!withinMessages && !withinChatsList && !withinSidebar && !withinImageViewer) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchmove', this.mobileTouchMoveLockHandler, { passive: false });

    if (typeof this.initializeServerChatSync === 'function') {
      this.initializeServerChatSync();
    }

  }

  setupDesktopChatWheelScroll() {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatContainer = document.getElementById('chatContainer');
    if (!messagesContainer || !chatContainer) return;

    chatContainer.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;

      const target = event.target instanceof Element ? event.target : null;
      const shouldSkip = target?.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      messagesContainer.scrollTop += event.deltaY;
      event.preventDefault();
    }, { passive: false });

    document.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (!this.currentChat) return;
      if (!chatContainer.classList.contains('active')) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;
      if (event.ctrlKey) return;

      const target = event.target instanceof Element ? event.target : null;
      if (!target || !chatContainer.contains(target)) return;

      const shouldSkip = target.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 0.1) return;

      messagesContainer.scrollTop += delta;
      event.preventDefault();
    }, { passive: false, capture: true });
  }

  // Метод-обгортка для імпортованої функції setupMobileSwipeBack
  setupMobileSwipeBack() {
    setupMobileSwipeBack(this);
  }

}
